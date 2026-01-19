# ultrathink: 项目架构分析与现状 (Updated)

本文档描述 `claude-skills-runtime-poc` 项目的实际架构情况。本文档已于 2026/01/19 更新，以反映后端重构后的状态。

## 1. 现状分析 (Current Implementation)

经过最近的重构，项目已对齐 `Opencode` 标准架构：

| 特性 | 参考文档 (Opencode Standard) | 当前实现 (claude-skills-runtime-poc) | 状态 |
| :--- | :--- | :--- | :--- |
| **SDK 使用** | 使用 `@opencode-ai/sdk` | **已集成**。后端使用 `@opencode-ai/sdk/v2/client`，通过 `services/opencode.client.ts` 导出单一实例。 | ✅ 已完成 |
| **通信协议** | 使用 HTTP + **SSE** | **支持 SSE**。后端通过 SDK 的 `client.global.event()` 监听 `tool.start`, `tool.end`, `message.part.updated` 等事件。 | ✅ 已完成 |
| **API 端点** | 标准 SDK 方法 | 使用 SDK 封装方法 (`session.create`, `session.prompt`)，内部自动处理正确的 API 路径和类型。 | ✅ 已完成 |
| **交互模式** | 客户端/服务器分离 | 后端 (`packages/backend`) 作为 BFF 层，代理前端请求并通过 SDK 与 Opencode Server 通信。 | ⚠️ BFF 模式 |

## 2. 系统上下文 (System Context)

系统采用典型的 Backend-for-Frontend (BFF) 架构：

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#282c34', 'edgeLabelBackground':'#282c34', 'mainBkg': '#282c34', 'primaryTextColor': '#abb2bf', 'lineColor': '#abb2bf', 'tertiaryColor': '#21252b', 'clusterBkg': '#21252b', 'clusterBorder': '#61afef', 'fontFamily': 'arial'}}}%%
flowchart TB
    subgraph "User Environment"
        Browser["Web Browser (Frontend with SSE)"]
    end

    subgraph "Skills Runtime POC Environment"
        BFF["Skills Runtime Backend"]
        Service["Execution Service"]
        SDK["@opencode-ai/sdk"]
        Store["Execution Storage (In-Memory)"]
        
        BFF --> Service
        Service --> SDK
        Service --> Store
    end

    subgraph "External Systems"
        Opencode["Opencode Server"]
        LLM["LLM Providers"]
    end

    Browser --"SSE /api/v1/executions/:id/stream"--> BFF
    SDK --"HTTP/SSE"--> Opencode
    Opencode -.-> LLM
```

## 3. 核心业务场景：技能生命周期管理 (Skill Lifecycle Management)

技能的“上线”过程独立于执行过程。包括上传、解压、校验和存储。

### 3.1 上传与校验 (Upload & Validation)

验证逻辑确保只有合法的 ZIP 包才能被后续执行：
1. **格式校验**: 必须是合法的 ZIP 文件。
2. **结构校验**: 解压后必须包含 `SKILL.md`。
3. **元数据校验**: `SKILL.md` 必须包含合法的 YAML Frontmatter (name, description)。
4. **安全校验**: 检测并拒绝二进制文件（除允许的资源外），防止恶意代码隐藏。

### 时序图 (Sequence Diagram: Management)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#282c34', 'edgeLabelBackground':'#282c34', 'mainBkg': '#282c34', 'primaryTextColor': '#abb2bf', 'lineColor': '#abb2bf', 'tertiaryColor': '#21252b', 'clusterBkg': '#21252b', 'clusterBorder': '#61afef', 'fontFamily': 'arial', 'actorBkg': '#282c34', 'actorBorder': '#61afef', 'actorTextColor': '#abb2bf', 'signalColor': '#abb2bf', 'signalTextColor': '#abb2bf', 'noteBkgColor': '#21252b', 'noteTextColor': '#abb2bf', 'noteBorderColor': '#61afef'}}}%%
sequenceDiagram
    autonumber
    actor User
    participant API as Backend API
    participant Service as SkillService
    participant Validator as Validator
    participant Store as InMemoryStore

    %% Upload
    Note over User, Store: 1. 技能包上传 (Upload)
    User->>API: POST /api/v1/skills/upload (file.zip)
    activate API
    API->>Service: uploadAndValidate(buffer)
    activate Service
    
    Service->>Service: Extract ZIP to Temp Dir
    
    %% Validation
    Note over Service, Validator: 2. 校验逻辑 (Validation)
    Service->>Validator: validateSkillMd(content)
    activate Validator
    
    alt Invalid Metadata
        Validator-->>Service: { isValid: false, errors: [...] }
        Service-->>API: 400 Bad Request (Validation Errors)
        API-->>User: Show Error Toast
    else Valid Metadata
        Validator-->>Service: { isValid: true, metadata }
        deactivate Validator
        
        Service->>Service: Scan & Detect Binaries
        Service->>Store: save(package)
        activate Store
        Store-->>Service: stored
        deactivate Store
        
        Service-->>API: Return SkillPackage JSON
        API-->>User: 201 Created (Refresh List)
    end
    deactivate Service
    deactivate API
```

## 4. 核心业务场景：技能执行 (Skill Execution)

重构后，技能执行流程支持全链路流式传输：

### 时序图 (Sequence Diagram)

```mermaid
%%{init: {'theme': 'base', 'themeVariables': { 'primaryColor': '#282c34', 'edgeLabelBackground':'#282c34', 'mainBkg': '#282c34', 'primaryTextColor': '#abb2bf', 'lineColor': '#abb2bf', 'tertiaryColor': '#21252b', 'clusterBkg': '#21252b', 'clusterBorder': '#61afef', 'fontFamily': 'arial', 'actorBkg': '#282c34', 'actorBorder': '#61afef', 'actorTextColor': '#abb2bf', 'signalColor': '#abb2bf', 'signalTextColor': '#abb2bf', 'noteBkgColor': '#21252b', 'noteTextColor': '#abb2bf', 'noteBorderColor': '#61afef'}}}%%
sequenceDiagram
    autonumber
    actor User
    participant FE as Frontend
    participant ES as ExecutionService
    participant SDK as Opencode SDK
    participant Server as Opencode Server (Remote)

    %% 1. Start Execution
    Note over User, Server: 1. 发起执行 (Start Execution)
    User->>FE: 点击 "Run Skill"
    FE->>ES: POST /executions { prompt }
    
    activate ES
    ES->>SDK: session.create()
    SDK->>Server: POST /session
    Server-->>SDK: { id: "sess_123" }
    
    ES->>SDK: global.event() (Start Listening)
    
    ES-->>FE: Return { id: "exec_1", status: 'running' }
    deactivate ES
    
    %% 2. Streaming & Processing
    Note over User, Server: 2. 流式处理 (Streaming)
    
    FE->>ES: GET /executions/exec_1/stream (SSE)
    activate FE
    
    par Background Process
        ES->>SDK: session.prompt(prompt)
        activate Server
        
        loop Event Stream
            Server-->>SDK: SSE Event (tool.start)
            SDK-->>ES: Event Handler
            ES-->>FE: SSE Data (Type: tool_call)
            
            Server-->>SDK: SSE Event (message.part.updated)
            SDK-->>ES: Event Handler
            ES-->>FE: SSE Data (Type: message)
        end
        
        Server-->>SDK: Response (Done)
        deactivate Server
    and Frontend Display
        FE->>User: 实时显示日志与结果
    end
    
    ES->>ES: Update Status -> Completed
    ES-->>FE: SSE Event (complete)
    deactivate FE
```

## 5. 已完成改进 (Completed Improvements)

以下建议已并在代码库中实施：

1.  **引入官方 SDK**: 已移除自定义 `OpenCodeClient`，完全迁移至 `@opencode-ai/sdk`。
2.  **实现流式响应**:
    *   **后端**: `ExecutionService` 使用后台事件循环处理 SDK 事件。
    *   **前端**: `useExecutionLogs` 钩子已更新为使用 `EventSource` 消费后端 SSE 端点。

## 6. 后续规划 (Future Roadmap)

1.  **集成测试**: 在真实 Opencode Server 环境中验证端到端流程。
2.  **错误处理增强**: 完善 SDK 连接断开、超时的恢复机制。
3.  **UI 优化**: 进一步优化前端日志展示，支持 Markdown 渲染流式内容。
