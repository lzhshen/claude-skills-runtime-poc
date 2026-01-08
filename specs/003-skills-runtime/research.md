# Research: Claude Skills 运行时框架与测试 Web 应用

**Date**: 2026-01-08 | **Branch**: `003-skills-runtime`

## 研究概述

本文档记录了在设计阶段进行的技术研究，解决了所有需要澄清的问题。

---

## 1. 后端技术栈选择

### Decision: 混合架构 (Python + TypeScript)

### Rationale

1. **opencode SDK 限制**: opencode 仅提供 TypeScript/JavaScript SDK (`@opencode-ai/sdk`)，无官方 Python SDK
2. **用户技术背景**: 用户熟悉 Python 技术栈
3. **最佳平衡**: Python 处理主要业务逻辑，TypeScript 微服务处理 opencode 集成

### Alternatives Considered

| 方案 | 优点 | 缺点 | 拒绝原因 |
|------|------|------|----------|
| 纯 TypeScript | 与 opencode 生态一致，类型安全 | 用户学习成本高 | 用户明确表示熟悉 Python |
| 纯 Python + HTTP API | 用户熟悉，无需学习新语言 | 需自行封装 opencode HTTP API，类型不安全，维护成本高 | opencode HTTP API 文档不完整，SDK 提供更好的抽象 |
| 混合架构 | 兼顾用户技术背景和 SDK 集成 | 增加项目复杂度，需要服务间通信 | **选择此方案** |

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

### 3.1 技能包结构

**必需文件**: `SKILL.md`

**SKILL.md 格式**:
```markdown
---
name: 技能名称
description: 技能描述
---

# 技能标题

技能指令内容...
```

**YAML 前置元数据必填字段**:
- `name`: 技能名称
- `description`: 技能描述

### 3.2 验证规则

1. Zip 文件有效性检查
2. SKILL.md 存在性检查（根目录或单个顶级目录）
3. YAML 前置元数据解析和验证
4. 必填字段存在性检查

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
