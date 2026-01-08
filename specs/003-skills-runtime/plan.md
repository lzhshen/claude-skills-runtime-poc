# Implementation Plan: Claude Skills 运行时框架与测试 Web 应用

**Branch**: `003-skills-runtime` | **Date**: 2026-01-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-skills-runtime/spec.md`

## Summary

构建一个 Claude Skills 运行时框架和测试 Web 应用，支持技能包上传、验证、预览、编辑、运行和日志查看。采用混合架构：Python (FastAPI) 作为主后端处理业务逻辑，TypeScript 微服务专用于 opencode 集成，React + TailwindCSS 构建前端。

## Technical Context

**Language/Version**:
- 前端: TypeScript 5.x + React 18.x
- 主后端: Python 3.11+ (FastAPI)
- opencode 集成服务: TypeScript 5.x + Node.js 20.x

**Primary Dependencies**:
- 前端: React 18, TailwindCSS 3.x, Monaco Editor (代码编辑), react-arborist (目录树)
- 主后端: FastAPI, Pydantic, python-multipart (文件上传), PyYAML, aiohttp
- opencode 服务: @opencode-ai/sdk, Express.js 或 Fastify

**Storage**:
- 文件系统 (技能包临时存储)
- 内存 (会话数据、执行历史 - 根据规格说明无需持久化)

**Testing**:
- 前端: Vitest + React Testing Library
- Python: pytest + pytest-asyncio
- TypeScript: Vitest

**Target Platform**: Linux server (Docker), 现代浏览器 (Chrome, Firefox, Safari, Edge 最新2版本)

**Project Type**: Web application (frontend + backend + microservice)

**Performance Goals**:
- 技能包上传验证: < 30秒 (5MB以下)
- 执行结果流式传输: 5秒内开始
- Web应用加载: < 3秒

**Constraints**:
- 技能包最大: 10MB
- 执行超时: 5分钟
- 单用户会话 (无需多用户)

**Scale/Scope**:
- 单用户本地使用
- 每次会话约 10-50 次技能执行

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. 简单可依赖

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 不引入不必要的复杂度 | ⚠️ | 混合架构增加复杂度，但有正当理由 |
| YAGNI | ✅ | 只实现规格说明中的功能 |
| 直接的解决方案 | ✅ | 使用成熟框架，避免过度抽象 |
| 最小依赖 | ✅ | 每个依赖都有明确用途 |
| 可删除的代码 | ✅ | 三个项目低耦合，可独立删除 |

### II. 测试驱动开发 (TDD)

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 测试先行 | ✅ | 计划遵循 TDD |
| 最小实现 | ✅ | 将按功能优先级实现 |
| 绿灯后重构 | ✅ | 重构在测试通过后进行 |
| 无未测试代码 | ✅ | 所有功能需测试覆盖 |
| 测试独立性 | ✅ | 使用隔离测试 |

**Gate 结果**: ⚠️ 通过（需记录复杂度违规）

## Project Structure

### Documentation (this feature)

```text
specs/003-skills-runtime/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── models/          # Pydantic 数据模型
│   ├── services/        # 业务逻辑 (技能包管理、验证)
│   ├── api/             # FastAPI 路由
│   └── utils/           # 工具函数
├── tests/
│   ├── unit/
│   ├── integration/
│   └── contract/
├── requirements.txt
└── pyproject.toml

opencode-bridge/
├── src/
│   ├── client/          # opencode SDK 封装
│   ├── api/             # HTTP API 路由
│   └── types/           # TypeScript 类型定义
├── tests/
├── package.json
└── tsconfig.json

frontend/
├── src/
│   ├── components/      # React 组件
│   │   ├── upload/      # 上传相关
│   │   ├── explorer/    # 目录树和文件预览
│   │   ├── editor/      # 代码编辑器
│   │   ├── runner/      # 技能运行
│   │   └── logs/        # 日志查看
│   ├── pages/           # 页面组件
│   ├── services/        # API 调用
│   ├── hooks/           # 自定义 hooks
│   └── types/           # TypeScript 类型
├── tests/
├── package.json
├── tailwind.config.js
└── vite.config.ts
```

**Structure Decision**: 选择 Web application 结构的扩展版本，包含三个项目：
1. `backend/` - Python FastAPI 主后端，处理技能包管理、验证、文件操作
2. `opencode-bridge/` - TypeScript 微服务，专用于 opencode SDK 集成
3. `frontend/` - React + TailwindCSS 前端

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| 混合架构 (Python + TypeScript) | opencode 只提供 TS SDK，用户熟悉 Python | 纯 Python: 需自行封装 HTTP API，类型不安全，维护成本高；纯 TS: 用户学习成本高 |
| 3个项目而非2个 | opencode 集成需要独立服务 | 嵌入后端: Python 无法直接使用 TS SDK；嵌入前端: 安全风险，无法复用 |

---

## Post-Design Constitution Re-check

*Re-evaluated after Phase 1 design completion*

### I. 简单可依赖

| 检查项 | 状态 | 设计阶段评估 |
|--------|------|-------------|
| 不引入不必要的复杂度 | ⚠️ | 混合架构已在 Complexity Tracking 中记录理由 |
| YAGNI | ✅ | 数据模型和 API 仅包含规格说明要求的功能 |
| 直接的解决方案 | ✅ | 使用标准 REST API，SSE 流式传输，无过度抽象 |
| 最小依赖 | ✅ | 每个依赖都有明确用途（详见 research.md） |
| 可删除的代码 | ✅ | 三个项目通过 HTTP API 松耦合 |

### II. 测试驱动开发 (TDD)

| 检查项 | 状态 | 设计阶段评估 |
|--------|------|-------------|
| 测试先行 | ✅ | 契约文档可作为测试用例基础 |
| 最小实现 | ✅ | 按 P1-P5 优先级分阶段实现 |
| 绿灯后重构 | ✅ | 计划遵循 |
| 无未测试代码 | ✅ | 所有 API 端点需有对应测试 |
| 测试独立性 | ✅ | 使用内存存储，测试间无共享状态 |

**Post-Design Gate 结果**: ✅ 通过

---

## Generated Artifacts

| 文件 | 描述 | 状态 |
|------|------|------|
| `plan.md` | 实现计划（本文档） | ✅ 完成 |
| `research.md` | 技术研究和决策记录 | ✅ 完成 |
| `data-model.md` | 数据模型定义 | ✅ 完成 |
| `quickstart.md` | 快速启动指南 | ✅ 完成 |
| `contracts/backend-api.md` | Python 后端 API 契约 | ✅ 完成 |
| `contracts/opencode-bridge-api.md` | opencode-bridge API 契约 | ✅ 完成 |
| `tasks.md` | 任务列表 | ⏳ 待生成 (`/speckit.tasks`) |
