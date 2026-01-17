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

Auto-generated from all feature plans. Last updated: 2026-01-09

## Active Technologies

- Python 3.11+ (FastAPI backend)
- TypeScript 5.x + React 18.x (frontend)
- TailwindCSS 3.x
- Vite + Vitest (frontend build/test)
- pytest + pytest-asyncio (backend test)

## Project Structure

```text
backend/                          # Python FastAPI 后端
├── src/
│   ├── models/                   # Pydantic 数据模型
│   ├── services/                 # 业务逻辑
│   ├── api/                      # FastAPI 路由
│   ├── opencode/                 # opencode Python Client
│   └── utils/                    # 工具函数
└── tests/

frontend/                         # React + TailwindCSS 前端
├── src/
│   ├── components/               # React 组件
│   ├── pages/                    # 页面组件
│   ├── services/                 # API 调用
│   ├── hooks/                    # 自定义 hooks
│   └── types/                    # TypeScript 类型
└── tests/

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
# 后端
cd backend && uvicorn src.main:app --reload    # 启动后端服务
cd backend && pytest                            # 运行后端测试

# 前端
cd frontend && npm run dev                      # 启动前端开发服务器
cd frontend && npm run test                     # 运行前端测试
cd frontend && npm run build                    # 构建前端

# Docker
docker-compose up                               # 启动所有服务

# opencode 服务
# 基本启动（默认: port=4096, hostname=127.0.0.1）
opencode serve

# 开发环境（允许前端访问）
opencode serve --port 4096 --hostname 127.0.0.1 --cors http://localhost:5173

# 选项说明:
#   --port <number>     端口号（默认: 4096）
#   --hostname <string> 主机名（默认: 127.0.0.1）
#   --cors <origin>     允许的浏览器来源（可多次指定）
#   --mdns              启用 mDNS 发现

```

## Code Style

- Python: ruff, black, isort, mypy
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
