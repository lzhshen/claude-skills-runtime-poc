# Implementation Plan: Claude Skills 运行时框架与测试 Web 应用

**Branch**: `003-skills-runtime` | **Date**: 2026-01-08 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-skills-runtime/spec.md`

## Summary

构建一个 Claude Skills 运行时框架和测试 Web 应用，支持技能包上传、验证、预览、编辑、运行和日志查看。采用纯 Python 架构：Python (FastAPI) 后端通过轻量级 opencode Python Client 直接与 opencode Server 通信，React + TailwindCSS 构建前端。

> **架构变更记录** (2026-01-09): 经过深入研究 opencode Server HTTP API，确认其提供完整的 REST API，决定从"混合架构"改为"纯 Python 架构"。详见 [research.md](./research.md)。

## Technical Context

**Language/Version**:
- 前端: TypeScript 5.x + React 18.x
- 后端: Python 3.11+ (FastAPI)

**Primary Dependencies**:
- 前端: React 18, TailwindCSS 3.x, Monaco Editor (代码编辑), react-arborist (目录树)
- 后端: FastAPI, Pydantic, python-multipart (文件上传), PyYAML, aiohttp, httpx (opencode HTTP 客户端)

**Storage**:
- 文件系统 (技能包临时存储)
- 内存 (会话数据、执行历史 - 根据规格说明无需持久化)

**Testing**:
- 前端: Vitest + React Testing Library
- Python: pytest + pytest-asyncio

**Target Platform**: Linux server (Docker), 现代浏览器 (Chrome, Firefox, Safari, Edge 最新2版本)

**Project Type**: Web application (frontend + backend)

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

## Deployment Architecture

本项目采用 **控制平面 + 数据平面** 分离架构：

| 服务类型 | 服务 | 生命周期 | 本期实现 |
|---------|------|--------|---------|
| **常驻服务** | Frontend | 持续运行 | ✅ |
| **常驻服务** | Backend (API + Orchestrator) | 持续运行 | ✅ 单进程 |
| **临时服务** | Skill Runner | 按任务创建/销毁 | ✅ |
| **存储** | SQLite (嵌入式) | 随应用启停 | ✅ |
| **基础设施** | Redis, MinIO | 持续运行 | ⏳ 架构支持 |

**本期实现范围**:
- Frontend + Backend (单进程，包含 API 路由和任务编排) + Skill Runner
- SQLite 嵌入式存储（技能包元数据 + 执行历史）
- 文件系统存储技能包临时文件
- Backend 内同步调用 Skill Runner（无需外部消息队列）

**基础设施简化策略**:
| 组件 | 生产架构 | 本期简化 |
|------|---------|---------|
| 任务队列 | Redis | 内存队列 / 同步调用 |
| 文件存储 | MinIO / S3 | 本地文件系统 |
| 数据库 | PostgreSQL | SQLite |

**架构可扩展性** (未来):
- 拆分 Backend 为 API Gateway + Task Orchestrator
- 替换 SQLite 为 PostgreSQL 实现多实例部署
- 引入 Redis 实现分布式任务队列
- 引入 MinIO 实现对象存储
- 容器化 Skill Runner 实现隔离执行

详细部署架构设计参见 [architecture.md](./architecture.md)。

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. 简单可依赖

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 不引入不必要的复杂度 | ✅ | 纯 Python 架构，2 个项目 |
| YAGNI | ✅ | 只实现规格说明中的功能 |
| 直接的解决方案 | ✅ | 使用成熟框架，避免过度抽象 |
| 最小依赖 | ✅ | 每个依赖都有明确用途 |
| 可删除的代码 | ✅ | 两个项目低耦合，可独立删除 |

### II. 测试驱动开发 (TDD)

| 检查项 | 状态 | 说明 |
|--------|------|------|
| 测试先行 | ✅ | 计划遵循 TDD |
| 最小实现 | ✅ | 将按功能优先级实现 |
| 绿灯后重构 | ✅ | 重构在测试通过后进行 |
| 无未测试代码 | ✅ | 所有功能需测试覆盖 |
| 测试独立性 | ✅ | 使用隔离测试 |

**Gate 结果**: ✅ 通过

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
│   ├── opencode/        # 轻量级 opencode Python Client
│   │   ├── __init__.py  # 导出 OpencodeClient
│   │   ├── client.py    # 客户端主类
│   │   ├── session.py   # 会话 API
│   │   ├── config.py    # 配置 API
│   │   ├── events.py    # SSE 事件流
│   │   └── models.py    # Pydantic 模型
│   └── utils/           # 工具函数
├── tests/
│   ├── unit/
│   ├── integration/
│   └── contract/
├── requirements.txt
└── pyproject.toml

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

**Structure Decision**: 选择 Web application 标准结构，包含两个项目：
1. `backend/` - Python FastAPI 后端，处理技能包管理、验证、文件操作，通过内置 opencode Client 直连 opencode Server
2. `frontend/` - React + TailwindCSS 前端

## Complexity Tracking

> **无违规记录**: 纯 Python 架构符合宪法所有原则。

---

## Post-Design Constitution Re-check

*Re-evaluated after Phase 1 design completion*

### I. 简单可依赖

| 检查项 | 状态 | 设计阶段评估 |
|--------|------|-------------|
| 不引入不必要的复杂度 | ✅ | 纯 Python 架构，无需 TypeScript 微服务 |
| YAGNI | ✅ | 数据模型和 API 仅包含规格说明要求的功能 |
| 直接的解决方案 | ✅ | 使用标准 REST API，SSE 流式传输，无过度抽象 |
| 最小依赖 | ✅ | 每个依赖都有明确用途（详见 research.md） |
| 可删除的代码 | ✅ | 两个项目通过 HTTP API 松耦合 |

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
| `architecture.md` | 部署架构设计 | ✅ 完成 |
| `tasks.md` | 任务列表 | ✅ 完成 |
| `testdata.md` | 测试数据说明 | ✅ 完成 |

## Test Data

测试数据位于 `testdata/skills/` 目录，来源于 [anthropics/skills](https://github.com/anthropics/skills) 官方仓库。

### 有效 Skill 包

| Skill | 结构 | 用途 |
|-------|------|------|
| `brand-guidelines` | 简单（2 文件） | 最小有效 skill 基准测试 |
| `slack-gif-creator` | 复杂（多目录、Python 代码） | 完整功能测试 |

### 无效 Skill 包（Badcases）

| 目录 | 问题 | 对应场景 |
|------|------|----------|
| `missing-skill-md` | 缺少 SKILL.md | P1 场景 2 |
| `missing-name` | YAML 缺少 name 字段 | P1 场景 3 |
| `missing-description` | YAML 缺少 description 字段 | P1 场景 3 |
| `invalid-yaml` | YAML 语法错误 | P1 场景 3 |

详见 [testdata.md](./testdata.md)
