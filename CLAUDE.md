<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# claude-skills-runtime-poc Development Guidelines

Auto-generated from all feature plans. Last updated: 2026-01-18

## Active Technologies

- TypeScript 5.x (全栈)
- Hono (后端 Web 框架)
- React 18.x (前端)
- TailwindCSS 3.x
- Zod (数据验证)
- Vite + Vitest (构建/测试)
- pnpm (monorepo 包管理)

## Project Structure

```text
packages/                         # pnpm monorepo
├── shared/                       # @skills-runtime/shared
│   └── src/
│       ├── types/                # TypeScript 类型定义
│       └── schemas/              # Zod 验证 schemas
├── backend/                      # @skills-runtime/backend (Hono)
│   └── src/
│       ├── routes/               # API 路由
│       ├── services/             # 业务逻辑
│       ├── utils/                # 工具函数
│       └── __tests__/            # 单元测试
└── frontend/                     # @skills-runtime/frontend (React)
    └── src/
        ├── components/           # React 组件
        ├── pages/                # 页面组件
        ├── services/             # API 调用
        ├── hooks/                # 自定义 hooks
        └── types/                # TypeScript 类型

testdata/                         # 测试数据
└── skills/
    ├── valid/                    # 有效的 skill 包
    │   ├── brand-guidelines/     # 简单结构 (来自 anthropics/skills)
    │   └── slack-gif-creator/    # 复杂结构 (来自 anthropics/skills)
    └── invalid/                  # 无效的 skill 包 (badcases)
        ├── missing-skill-md/
        ├── missing-name/
        ├── missing-description/
        └── invalid-yaml/

specs/003-skills-runtime/         # 功能规格文档
├── spec.md                       # 功能规格说明
├── plan.md                       # 实现计划
├── tasks.md                      # 任务清单
├── testdata.md                   # 测试数据说明
└── contracts/                    # API 契约
```

## Commands

```bash
# ⭐ 一键启动所有服务 (推荐)
pnpm dev                                                # 同时启动前端、后端、OpenCode (Skills)
                                                        # Ctrl+C 优雅停止所有服务

# 后端 (packages/backend)
pnpm --filter @skills-runtime/backend dev               # 开发服务器 (端口 3001)
pnpm --filter @skills-runtime/backend test              # 运行测试
pnpm --filter @skills-runtime/backend typecheck         # 类型检查

# 前端 (packages/frontend)
pnpm --filter @skills-runtime/frontend dev              # 开发服务器 (端口 5173)
pnpm --filter @skills-runtime/frontend test             # 运行测试 (监听模式)
pnpm --filter @skills-runtime/frontend test -- --run    # 运行一次，不监听
pnpm --filter @skills-runtime/frontend typecheck        # 类型检查
pnpm --filter @skills-runtime/frontend lint             # ESLint 检查
pnpm --filter @skills-runtime/frontend build            # 生产构建

# opencode 服务 (Skills 执行引擎，端口 4097)
# 注意：pnpm dev 已自动启动，通常无需手动运行
opencode serve --port 4097 --hostname 127.0.0.1 --cors http://localhost:5173
```

### 服务端口约定

| 服务 | 端口 | 说明 |
|------|------|------|
| Frontend (Vite) | 5173 | React 开发服务器 |
| Backend (Hono) | 3001 | API 服务器 |
| OpenCode (Skills) | 4097 | Skills 执行引擎 |
| OpenCode (AI Coding) | 4096 | AI 编码助手 (独立运行) |

## Code Style

- TypeScript: ESLint, Prettier
- Follow standard conventions

## Test Data

测试数据位于 `testdata/skills/` 目录，包含：
- **brand-guidelines**: 简单有效的 skill 包（来自 anthropics/skills）
- **slack-gif-creator**: 复杂有效的 skill 包（来自 anthropics/skills）
- **invalid/**: 各种无效 skill 包用于测试错误处理
- ** 非目录文件 **: 是 invalid/valid  skill 压缩包，可以直接用于测试，不需要重复生成（除非上述 skill 内容发生了变化）

详见 `specs/003-skills-runtime/testdata.md`

## Recent Changes

- 003-skills-runtime: Added
- 2026-01-09: Added test data from anthropics/skills repository

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
