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
# 后端 (Python)
cd backend && pytest                                     # 运行所有测试
cd backend && pytest tests/unit/test_skill_validator.py # 运行单个测试文件
cd backend && pytest -k "test_validate_valid"           # 按名称运行测试
cd backend && pytest --no-cov                           # 跳过覆盖率
cd backend && uvicorn src.main:app --reload             # 开发服务器 (端口 8000)
cd backend && ruff check src tests                      # 代码检查
cd backend && ruff check src tests --fix                # 代码检查 + 自动修复
cd backend && black src tests                           # 代码格式化
cd backend && mypy src                                  # 类型检查

# 前端 (TypeScript/React)
cd frontend && npm test                                 # 运行所有测试 (监听模式)
cd frontend && npm test -- --run                        # 运行一次，不监听
cd frontend && npm test -- WelcomeMessage               # 运行单个测试文件
cd frontend && npm test -- -t "renders heading"         # 按名称运行测试
cd frontend && npm run typecheck                        # 类型检查
cd frontend && npm run lint                             # ESLint 检查
cd frontend && npm run format                           # Prettier 格式化
cd frontend && npm run dev                              # 开发服务器 (端口 5173)
cd frontend && npm run build                            # 生产构建

# opencode 服务
opencode serve                                          # 基本启动 (port=4096)
opencode serve --port 4096 --hostname 127.0.0.1 --cors http://localhost:5173  # 开发环境
```

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
<!-- MANUAL ADDITIONS END -->
