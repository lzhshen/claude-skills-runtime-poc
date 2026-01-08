# Research: Claude Skills 运行时框架与测试 Web 应用

**Date**: 2026-01-08 | **Branch**: `003-skills-runtime`

## 研究概述

本文档记录了在设计阶段进行的技术研究，解决了所有需要澄清的问题。

---

## 1. 后端技术栈选择

### Decision: 纯 Python 架构 + 轻量级 opencode Python Client

> **架构变更记录** (2026-01-09): 经过深入研究 opencode Server HTTP API，决定从"混合架构"改为"纯 Python 架构"。详见下方决策演进。

### Rationale

1. **opencode Server 提供完整 HTTP API**: 经研究确认，opencode Server 暴露了完整的 REST API 和 OpenAPI 3.1 规范文档
2. **用户技术背景**: 用户熟悉 Python 技术栈
3. **简化架构**: 无需 TypeScript 微服务，降低部署和维护复杂度
4. **符合宪法原则**: 减少不必要复杂度，遵循 YAGNI

### Decision Evolution (决策演进)

#### 初始决策 (2026-01-08): 混合架构

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| 纯 TypeScript | 与 opencode 生态一致 | 用户学习成本高 | 拒绝 |
| 纯 Python + HTTP API | 用户熟悉 | 当时认为 HTTP API 不完整 | 拒绝 |
| 混合架构 (Python + TS Bridge) | 兼顾两者 | 复杂度高 | **初选** |

#### 重新评估 (2026-01-09): 深入研究 opencode HTTP API

经过详细研究 [opencode.ai/docs/server](https://opencode.ai/docs/server/)，发现：

1. **HTTP API 完整**: 所有 SDK 功能都有对应 HTTP 端点
2. **OpenAPI 文档**: 服务器暴露 `/doc` 端点提供完整规范
3. **SSE 事件流**: `/event` 和 `/global/event` 端点支持实时事件订阅
4. **消息格式明确**: `{noReply, parts, model}` 格式已确认

#### 最终决策: 纯 Python + 轻量级 opencode Client

| 方案 | 优点 | 缺点 | 结论 |
|------|------|------|------|
| 混合架构 (原方案) | SDK 类型安全 | 4 个服务，双运行时，违反宪法 | **放弃** |
| 纯 Python + 裸 HTTP | 最简单 | 代码分散，不易维护 | 拒绝 |
| **纯 Python + 轻量 Client** | 类型安全 + 简洁 + 可扩展 | 需自行封装部分 API | **最终选择** |

### 轻量级 opencode Python Client 设计

**设计原则**:
- 只封装本项目需要的 API（约 7 个方法）
- 使用 Pydantic 提供类型安全
- API 风格与 TypeScript SDK 保持一致
- 模块化设计，未来可独立发布

**封装的 API 子集**:

| 方法 | HTTP 端点 | 用途 |
|------|-----------|------|
| `client.health()` | `GET /global/health` | 健康检查 |
| `client.session.create()` | `POST /session` | 创建会话 |
| `client.session.delete()` | `DELETE /session/:id` | 删除会话 |
| `client.session.prompt()` | `POST /session/:id/prompt_async` | 发送消息 |
| `client.session.abort()` | `POST /session/:id/abort` | 中止会话 |
| `client.config.providers()` | `GET /config/providers` | 获取模型列表 |
| `client.event.subscribe()` | `GET /event` (SSE) | 订阅事件流 |

**不封装的 SDK 功能** (本项目不需要):
- `client.project.*` - 项目管理
- `client.file.*` - 文件操作
- `client.find.*` - 搜索功能
- `client.tui.*` - TUI 控制
- `client.lsp.*` / `client.mcp.*` - 高级功能

---

## 2. opencode 生态系统调研

### 2.1 opencode 核心架构

**来源**: https://github.com/anomalyco/opencode, https://opencode.ai/docs/

**技术栈**:
- 主要语言: TypeScript (83.5%)
- 运行时: Bun
- 包管理: npm (@opencode-ai/sdk)

**架构模式**:
- Client/Server 架构
- TUI 作为客户端与 headless HTTP server 通信
- 服务器暴露 OpenAPI 端点

### 2.2 opencode SDK

**安装**: `npm install @opencode-ai/sdk`

**核心 API**:
```typescript
import { createOpencode, createOpencodeClient } from "@opencode-ai/sdk"
import type { Session, Message, Part } from "@opencode-ai/sdk"

// 创建客户端（启动服务器+客户端）
const { client } = await createOpencode()

// 或连接到已有服务器
const client = createOpencodeClient({ baseUrl: "http://localhost:3000" })

// 主要方法
client.global.health()           // 健康检查
client.session.create()          // 创建会话
client.session.list()            // 列出会话
client.app.agents()              // 获取可用 agents
client.event.subscribe()         // 订阅事件（用于流式传输）
```

### 2.3 opencode Server API

**启动**: `opencode serve [--port <number>] [--hostname <string>] [--cors <origin>]`

**OpenAPI 文档**: `http://<hostname>:<port>/doc`

**核心端点**:
| 端点 | 方法 | 描述 |
|------|------|------|
| `/global/health` | GET | 健康检查 |
| `/session` | POST | 创建会话 |
| `/session` | GET | 列出会话 |
| `/session/:id` | GET | 获取会话详情 |
| `/session/:id` | DELETE | 删除会话 |
| `/session/:id/message` | POST | 发送消息 |
| `/session/:id/message` | GET | 获取消息历史 |
| `/project` | GET | 列出项目 |
| `/file/content` | GET | 获取文件内容 |

### 2.4 oh-my-opencode

**来源**: https://github.com/code-yeongyu/oh-my-opencode

**定位**: "Batteries-included" agent harness for opencode

**核心组件**:
- Sisyphus agent: 核心编码 agent
- 策划的 Agents: Oracle, Frontend UI/UX Engineer, Librarian
- LSP/AstGrep 支持: 代码分析和重构
- MCPs: Exa (Web Search), Context7 (Docs), Grep.app (Code Search)

**与本项目的关系**:
- oh-my-opencode 提供预配置的 agent 和工具
- 本项目可以利用其 agent 配置模式
- 但核心运行时仍基于 opencode SDK

---

## 3. Claude Skills 规范研究

### 3.1 技能包完整结构

**Claude Skills 定义**: Claude Skills 是模块化的包，包含指令、脚本和资源，Claude 可以动态发现和加载这些内容。Skills 本质上是一种基于提示的元工具架构，通过专门的指令注入来扩展 LLM 能力，通过提示扩展和上下文修改来运行，而非传统的函数调用或直接代码执行。

**技能包目录结构**:
```
skill-package/
├── SKILL.md              # 必需：核心指令文件
├── scripts/              # 可选：可执行脚本目录
│   ├── validate.py       # Python 脚本示例
│   ├── process.sh        # Bash 脚本示例
│   └── analyze.js        # JavaScript 脚本示例
├── templates/            # 可选：模板文件目录
│   └── output-template.md
├── data/                 # 可选：静态数据文件
│   └── config.yaml
└── examples/             # 可选：示例文件
    └── example-input.txt
```

**必需文件**: `SKILL.md`

**SKILL.md 格式**:
```markdown
---
name: 技能名称
description: 技能描述（应包含"什么"和"何时"使用）
---

# 技能标题

技能指令内容...

## 可用脚本

如果 scripts/ 目录存在脚本，可在此说明如何调用：
- `scripts/validate.py`: 用于验证输入格式
- `scripts/process.sh`: 用于处理数据

## 使用示例

...
```

**YAML 前置元数据**:
| 字段 | 必填 | 描述 |
|------|------|------|
| `name` | ✅ | 技能名称，用于发现和调用 |
| `description` | ✅ | 技能描述，必须同时说明技能做什么和何时使用它 |
| `version` | ❌ | 技能版本号 |
| `author` | ❌ | 作者信息 |
| `tags` | ❌ | 标签列表，便于分类 |

**最佳实践**:
- SKILL.md 应保持在 500 行以内
- 较大的内容应拆分为独立的参考文件，并在 SKILL.md 中清晰链接
- 描述应包含触发词，便于 Claude 识别何时使用该技能

### 3.2 Scripts（可执行脚本）详解

**脚本类型和用途**:

| 脚本类型 | 文件扩展名 | 典型用途 |
|----------|------------|----------|
| Python | `.py` | 数据处理、API 调用、复杂逻辑 |
| Bash/Shell | `.sh` | 文件操作、系统命令、环境配置 |
| JavaScript/Node.js | `.js`, `.mjs` | 数据转换、JSON 处理、Web 操作 |
| 其他可执行文件 | 任意 | 特定工具、编译后的二进制 |

**脚本的优势**:
1. **确定性可靠**: 脚本执行结果一致，不受 LLM 生成变化影响
2. **Token 效率**: 脚本本身不占用上下文窗口，只有输出消耗 tokens
3. **可复用性**: 相同逻辑无需每次让 Claude 重新生成
4. **安全性**: 经过审计的脚本比动态生成的代码更可控

**脚本调用方式**:
```markdown
<!-- 在 SKILL.md 中指导 Claude 如何使用脚本 -->
当需要验证用户输入时，请执行以下命令：
bash scripts/validate.py --input "$USER_INPUT"

当需要处理数据时：
bash scripts/process.sh "$DATA_FILE"
```

### 3.3 脚本执行环境（与 opencode server 的关系）

**执行环境架构**:

```
┌─────────────────────────────────────────────────────────────────┐
│                      Claude Code / opencode                     │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Agent Runtime                           │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐│  │
│  │  │   Claude    │  │    Tool     │  │   MCP Servers       ││  │
│  │  │   (LLM)     │◀─│   Router    │◀─│   (optional)        ││  │
│  │  └─────────────┘  └──────┬──────┘  └─────────────────────┘│  │
│  │                          │                                 │  │
│  │         ┌────────────────┼────────────────┐                │  │
│  │         ▼                ▼                ▼                │  │
│  │  ┌───────────┐    ┌───────────┐    ┌───────────────────┐  │  │
│  │  │   Bash    │    │   Read    │    │  File/Edit/Write  │  │  │
│  │  │   Tool    │    │   Tool    │    │      Tools        │  │  │
│  │  └─────┬─────┘    └───────────┘    └───────────────────┘  │  │
│  │        │                                                   │  │
│  └────────┼───────────────────────────────────────────────────┘  │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              宿主系统 Shell / 运行时环境                      ││
│  │  ┌─────────────────────────────────────────────────────────┐││
│  │  │  Shell (bash/zsh)                                       │││
│  │  │  ┌──────────────────────────────────────────────────┐  │││
│  │  │  │  技能包脚本执行                                    │  │││
│  │  │  │  - Python: 系统 Python 解释器                     │  │││
│  │  │  │  - Bash: 系统 Shell                               │  │││
│  │  │  │  - Node.js: 系统 Node 运行时                      │  │││
│  │  │  └──────────────────────────────────────────────────┘  │││
│  │  └─────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
```

**关键理解点**:

1. **opencode Server 作用**:
   - opencode 是 Agent 运行时基础设施，提供 Client/Server 架构
   - Server 运行在 Bun/JavaScript 运行时上，暴露 HTTP API
   - Client（TUI 或 SDK）通过 HTTP 与 Server 通信
   - Server 管理与 LLM (Claude) 的会话和工具调用

2. **脚本执行流程**:
   ```
   用户提示 → Claude 分析 → 决定使用脚本 → 通过 Bash Tool 执行
                                               ↓
                                        opencode 调用系统 shell
                                               ↓
                                        脚本在宿主系统上执行
                                               ↓
                                        输出返回给 Claude
   ```

3. **脚本执行环境特点**:
   - 脚本运行在 **宿主操作系统** 上，而非沙箱
   - 使用系统已安装的解释器（Python、Node.js 等）
   - 有完整的文件系统访问权限
   - 可以进行网络请求（需注意安全）
   - 输出被捕获并返回给 Claude 上下文

4. **opencode SDK 与脚本执行的关系**:
   ```typescript
   // opencode SDK 示例 - 工具执行
   import { createOpencode } from "@opencode-ai/sdk"

   const { client } = await createOpencode()

   // SDK 管理会话，LLM 决定何时调用工具
   // 当 LLM 决定调用 Bash 工具执行脚本时：
   // 1. SDK 接收工具调用请求
   // 2. 调用系统 shell 执行命令
   // 3. 捕获 stdout/stderr
   // 4. 返回结果给 LLM
   ```

### 3.4 本项目中的脚本执行设计

考虑到我们的混合架构（Python 后端 + TypeScript opencode-bridge），脚本执行涉及：

```
┌──────────────┐    HTTP     ┌─────────────────┐    SDK     ┌───────────────┐
│   Frontend   │ ─────────▶  │  Python Backend │ ─────────▶ │ opencode-bridge│
└──────────────┘             │   (FastAPI)     │            │  (TypeScript)  │
                             └────────┬────────┘            └───────┬────────┘
                                      │                             │
                                      │                             │ @opencode-ai/sdk
                                      │                             ▼
                                      │                      ┌───────────────┐
                                      │                      │ opencode Server│
                                      │                      └───────┬────────┘
                                      │                              │
                                      │                              │ 工具调用
                                      │                              ▼
                                      │                      ┌───────────────┐
                                      │                      │  系统 Shell   │
                                      │                      │ 脚本执行环境   │
                                      │                      └───────────────┘
                                      │                              │
                                      │                              │
技能包临时存储 ◀───────────────────────┘                              │
/tmp/claude-skills-runtime/{id}/                                     │
  └── scripts/                                                       │
      ├── validate.py  ◀─────────────────────────────────────────────┘
      └── process.sh
```

**设计决策**:
- 技能包解压到临时目录后，scripts/ 中的脚本对 opencode 运行时可见
- Claude 通过 Bash 工具执行脚本，路径为解压后的绝对路径
- 脚本执行结果通过 opencode-bridge SSE 流式返回前端

### 3.5 验证规则

1. **Zip 文件验证**:
   - 有效的 zip 格式
   - 大小不超过 10MB
   - 防止 zip bomb（检查解压后大小）

2. **SKILL.md 验证**:
   - 存在于根目录或单个顶级目录
   - 包含有效的 YAML 前置元数据
   - name 和 description 字段必填

3. **脚本验证（可选增强）**:
   - 脚本文件具有可执行权限（或可自动添加）
   - 脚本语法基本检查
   - 危险操作检测（网络请求、敏感文件访问等）

### 3.6 安全考虑

**脚本执行安全**:
- ⚠️ 脚本在宿主系统执行，需审计外部技能包
- 检查意外的网络调用
- 检查文件访问模式
- 从外部 URL 获取数据的技能需特别注意

**验证清单**:
| 检查项 | 说明 |
|--------|------|
| YAML frontmatter 有效 | 必须可解析 |
| 描述包含"什么"和"何时" | 便于技能发现 |
| 所有脚本已测试 | 确保可执行 |
| 引用正确链接 | SKILL.md 中的文件引用存在 |
| 无重复信息 | 避免上下文浪费 |
| SKILL.md 少于 500 行 | 控制上下文大小 |
| 无多余文档 | 只包含必要文件 |

---

## 4. 前端技术选型

### 4.1 代码编辑器

**Decision**: Monaco Editor

**Rationale**:
- VS Code 同款编辑器，功能强大
- 原生支持语法高亮、代码补全
- React 集成成熟 (@monaco-editor/react)
- 支持 Markdown、YAML 语法高亮

**Alternatives**:
| 方案 | 优点 | 缺点 |
|------|------|------|
| CodeMirror 6 | 轻量、模块化 | 需要更多配置 |
| Ace Editor | 成熟稳定 | 功能相对较少 |

### 4.2 目录树组件

**Decision**: react-arborist

**Rationale**:
- 虚拟化渲染，性能好
- 拖拽支持
- 可定制性强
- 活跃维护

**Alternatives**:
| 方案 | 优点 | 缺点 |
|------|------|------|
| react-treeview | 简单 | 功能有限 |
| @atlaskit/tree | 功能完整 | 依赖重 |

### 4.3 状态管理

**Decision**: React Context + useReducer

**Rationale**:
- 项目规模小，无需引入 Redux/Zustand
- 遵循宪法"最小依赖"原则
- React 内置，无额外依赖

---

## 5. 服务间通信设计

### 5.1 Python 后端 <-> opencode-bridge

**Decision**: HTTP REST API

**Rationale**:
- 简单直接
- 语言无关
- 易于调试和测试

**通信流程**:
```
Frontend -> Python Backend -> opencode-bridge -> opencode server
                                    |
                                    v
                              @opencode-ai/sdk
```

### 5.2 实时通信（技能执行流式传输）

**Decision**: Server-Sent Events (SSE)

**Rationale**:
- 单向服务器推送，适合执行日志流
- 比 WebSocket 简单
- 浏览器原生支持

**流程**:
1. Frontend 发起 SSE 连接到 Python 后端
2. Python 后端连接 opencode-bridge SSE 端点
3. opencode-bridge 订阅 opencode SDK events
4. 事件沿链路反向传播

---

## 6. 文件处理策略

### 6.1 Zip 解压

**Python 库**: `zipfile` (标准库)

**安全考虑**:
- 检查解压后大小，防止 zip bomb
- 验证文件路径，防止路径遍历攻击
- 限制文件数量

### 6.2 临时文件存储

**Decision**: 系统临时目录 + 会话 ID 子目录

**路径格式**: `/tmp/claude-skills-runtime/{session_id}/`

**清理策略**:
- 会话结束时清理
- 应用启动时清理旧目录

### 6.3 二进制文件处理

**检测方法**:
- 检查文件扩展名
- 读取前几个字节检测非文本字符

**显示方式**:
- 标记为"二进制文件"
- 显示文件大小
- 禁用编辑功能

---

## 7. 错误处理策略

### 7.1 验证错误

**分类**:
- 文件格式错误 (非 zip)
- 结构错误 (缺少 SKILL.md)
- 内容错误 (YAML 无效)
- 大小错误 (超过 10MB)

**响应格式**:
```json
{
  "valid": false,
  "errors": [
    {
      "code": "MISSING_SKILL_MD",
      "message": "需要 SKILL.md 文件",
      "suggestion": "请确保 zip 包根目录或单个顶级目录包含 SKILL.md 文件"
    }
  ]
}
```

### 7.2 执行错误

**分类**:
- 连接错误 (opencode 服务不可用)
- 超时错误 (执行超过 5 分钟)
- 运行时错误 (技能逻辑错误)

---

## 8. 依赖版本确认

### Python 后端

| 依赖 | 版本 | 用途 |
|------|------|------|
| Python | 3.11+ | 运行时 |
| FastAPI | 0.109+ | Web 框架 |
| Pydantic | 2.x | 数据验证 |
| python-multipart | 0.0.6+ | 文件上传 |
| PyYAML | 6.0+ | YAML 解析 |
| aiohttp | 3.9+ | 异步 HTTP 客户端 |
| pytest | 8.0+ | 测试框架 |
| pytest-asyncio | 0.23+ | 异步测试支持 |

### opencode-bridge

| 依赖 | 版本 | 用途 |
|------|------|------|
| Node.js | 20.x LTS | 运行时 |
| TypeScript | 5.x | 语言 |
| @opencode-ai/sdk | latest | opencode 集成 |
| Fastify | 4.x | Web 框架 |
| Vitest | 1.x | 测试框架 |

### Frontend

| 依赖 | 版本 | 用途 |
|------|------|------|
| React | 18.x | UI 框架 |
| TypeScript | 5.x | 语言 |
| TailwindCSS | 3.x | 样式 |
| Vite | 5.x | 构建工具 |
| @monaco-editor/react | 4.x | 代码编辑器 |
| react-arborist | 3.x | 目录树 |
| Vitest | 1.x | 测试框架 |
| @testing-library/react | 14.x | 组件测试 |

---

## 总结

所有技术决策已确定，无需进一步澄清。可以进入 Phase 1 设计阶段。
