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

# AGENTS.md - Claude Skills Runtime

本仓库 AI 编码代理的开发指南。

## 技术栈

- Python 3.11+ (FastAPI backend)
- TypeScript 5.x + React 18.x (frontend)
- TailwindCSS 3.x
- Vite + Vitest (frontend build/test)
- pytest + pytest-asyncio (backend test)

## 命令参考

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

## 项目结构

```
backend/src/
├── api/           # FastAPI 路由
├── models/        # Pydantic 模型
├── services/      # 业务逻辑
├── opencode/      # OpenCode 客户端
└── utils/         # 工具函数

frontend/src/
├── components/    # React 组件
├── pages/         # 页面组件
├── hooks/         # 自定义 hooks
├── services/      # API 调用
└── types/         # TypeScript 类型

testdata/skills/
├── valid/         # 有效技能包 (brand-guidelines, slack-gif-creator)
└── invalid/       # 无效技能包 (用于错误测试)
```

## 代码风格

### Python
- **格式化**: black (行长 100)
- **导入排序**: isort (black 兼容)
- **检查**: ruff (E, W, F, I, B, C4, UP)
- **类型**: mypy --strict，必须显式类型注解
- **文档**: Google 风格 docstring
- **导入顺序**: 标准库 → 第三方 → 本地（相对导入）

### TypeScript/React
- **格式化**: Prettier (无分号, 单引号, 缩进 2, 行长 100)
- **检查**: ESLint + typescript-eslint
- **路径别名**: `@/*` 映射 `src/*`
- **组件**: 函数声明 + 命名导出，Props 接口在组件上方
- **Hooks**: useCallback 包装回调，Context + hook 模式管理状态

### 命名规范

| 类型 | Python | TypeScript |
|------|--------|------------|
| 文件 | `snake_case.py` | `PascalCase.tsx` (组件), `camelCase.ts` (工具) |
| 类/接口 | `PascalCase` | `PascalCase` (无 `I` 前缀) |
| 函数 | `snake_case` | `camelCase` |
| 常量 | `SCREAMING_SNAKE` | `SCREAMING_SNAKE` |

## 禁止事项

- TypeScript: `as any`, `@ts-ignore`, `@ts-expect-error`
- 空 catch 块
- Python 省略类型注解
- 默认导出 (使用命名导出)

## 测试数据

位于 `testdata/skills/`：
- **brand-guidelines**: 简单有效 skill 包
- **slack-gif-creator**: 复杂有效 skill 包
- **invalid/**: 各类无效包用于错误测试
- 根目录 .zip 文件可直接用于测试

详见 `specs/003-skills-runtime/testdata.md`

## 规格驱动开发 (SDD)

本项目采用 **Specification-Driven Development** 方式，使用 **speckit** 工具管理：

```
specs/<feature>/
├── spec.md          # 功能规格说明
├── plan.md          # 实现计划
├── tasks.md         # 任务清单
├── architecture.md  # 架构设计 (如有)
└── contracts/       # API 契约
```

- 新功能开发前，先完善 spec.md
- 架构设计详见 `specs/003-skills-runtime/architecture.md`
- 使用 speckit 命令：`/speckit.specify`, `/speckit.plan`, `/speckit.tasks`

## 开发流程

1. **提交前**: 运行 lint + typecheck
2. **测试**: 功能实现同步编写测试
3. **API 变更**: 同时更新后端模型和前端类型
4. **新组件**: 测试文件与组件同目录 (`Component.test.tsx`)

<!-- MANUAL ADDITIONS START -->

## Playwright MCP 使用指南

使用 Playwright MCP 进行浏览器自动化测试时的注意事项。

### 禁止操作

| 操作 | 原因 |
|------|------|
| `pkill -f "playwright"` | 会杀死 MCP 服务进程，导致连接永久断开 |
| `pkill -f "chrome"` / `pkill -f "chromium"` | 同上，破坏 MCP 连接链路 |
| `browser_wait_for` 等待超过 5 秒 | 可能导致页面状态丢失或超时 |

### 正确的等待方式

```javascript
// ❌ 错误：长时间等待
browser_wait_for({time: 10})

// ✅ 正确：短间隔轮询 + 状态检查
browser_wait_for({time: 2})
browser_snapshot()  // 检查当前状态
// 根据状态决定是否继续等待
```

### 错误恢复策略

| 错误信息 | 正确处理方式 |
|----------|--------------|
| "No open pages available" | 使用 `browser_tabs({action: "list"})` 检查，然后 `browser_tabs({action: "new"})` 创建新页面 |
| "Browser is already in use" | 等待 3-5 秒后重试，**不要杀进程** |
| "Not connected" | MCP 服务已断开，需要重启 opencode 服务 |

### 最佳实践

1. **短间隔轮询**：使用 2-3 秒的等待间隔，配合 `browser_snapshot()` 检查状态
2. **状态检查优先**：操作前用 `browser_snapshot()` 确认页面状态
3. **使用 Playwright API 管理浏览器**：用 `browser_tabs`, `browser_close` 等 API，不要用系统命令
4. **异步操作处理**：对于长时间运行的操作（如 skill 执行），使用轮询检查完成状态而非阻塞等待

<!-- MANUAL ADDITIONS END -->
