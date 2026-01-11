# Quickstart: Claude Skills 运行时框架与测试 Web 应用

**Date**: 2026-01-08 | **Branch**: `003-skills-runtime`
**Updated**: 2026-01-09 - 架构简化：移除 opencode-bridge，改用纯 Python 架构

## 概述

本文档提供项目的快速启动指南，包括环境设置、依赖安装和开发服务器启动。

---

## 前置要求

### 必需软件

| 软件 | 版本 | 用途 |
|------|------|------|
| Python | 3.11+ | 后端运行时 |
| Node.js | 20.x LTS | 前端运行时 |
| pnpm | 8.x+ | Node.js 包管理器（推荐） |
| opencode | latest | AI 编码助手服务器 |

### 安装 opencode

```bash
# 使用 npm 全局安装
npm install -g @opencode-ai/cli

# 或使用 bun
bun install -g @opencode-ai/cli

# 验证安装
opencode --version
```

---

## 项目结构

```
claude-skills-runtime-poc/
├── backend/                 # Python FastAPI 后端
│   └── src/
│       └── opencode/        # 轻量级 opencode Python Client
├── frontend/                # React 前端
├── specs/                   # 规格文档
│   └── 003-skills-runtime/
│       ├── spec.md
│       ├── plan.md
│       ├── research.md
│       ├── data-model.md
│       ├── quickstart.md   # 本文档
│       └── contracts/
└── .specify/                # SpecKit 配置
```

---

## 环境设置

### 1. 克隆仓库

```bash
git clone <repository-url>
cd claude-skills-runtime-poc
git checkout 003-skills-runtime
```

### 2. 设置 Python 后端

```bash
cd backend

# 创建虚拟环境
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
# .venv\Scripts\activate   # Windows

# 安装依赖
pip install -r requirements.txt

# 创建 .env 文件（可选）
cp .env.example .env
```

**backend/.env 示例**:
```env
# 服务配置
HOST=0.0.0.0
PORT=8000
DEBUG=true

# opencode Server 配置
OPENCODE_SERVER_URL=http://localhost:3000

# 临时文件目录
TEMP_DIR=/tmp/claude-skills-runtime

# 文件限制
MAX_UPLOAD_SIZE_MB=10
EXECUTION_TIMEOUT_SECONDS=300
```

### 3. 设置前端

```bash
cd frontend

# 安装依赖
pnpm install

# 创建 .env 文件
cp .env.example .env
```

**frontend/.env 示例**:
```env
# API 配置
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

---

## 启动开发服务器

### 方式一：分别启动（推荐用于开发）

**终端 1 - 启动 opencode 服务器**:
```bash
opencode serve --port 3000 --hostname 127.0.0.1 --cors http://localhost:5173
```

> **提示**: `--cors` 选项允许前端（Vite dev server 默认运行在 5173 端口）访问 opencode 服务器。如需允许多个来源，可多次指定 `--cors`。

**终端 2 - 启动 Python 后端**:
```bash
cd backend
source .venv/bin/activate
python -m uvicorn src.main:app --reload --port 8000
# 服务运行在 http://localhost:8000
# API 文档：http://localhost:8000/docs
```

**终端 3 - 启动前端**:
```bash
cd frontend
pnpm dev
# 应用运行在 http://localhost:5173
```

### 方式二：使用 Docker Compose（生产环境）

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

---

## 验证安装

### 1. 检查服务健康状态

```bash
# Python 后端
curl http://localhost:8000/api/v1/health

# opencode Server
curl http://localhost:3000/global/health
```

### 2. 访问应用

打开浏览器访问：http://localhost:5173

### 3. 上传测试技能包

创建一个简单的测试技能包：

```bash
# 创建临时目录
mkdir -p /tmp/test-skill

# 创建 SKILL.md
cat > /tmp/test-skill/SKILL.md << 'EOF'
---
name: Hello World Skill
description: A simple test skill that greets users
---

# Instructions

You are a friendly greeting assistant. When the user sends a message,
respond with a warm greeting and offer to help them with their coding tasks.

Always be polite and encouraging.
EOF

# 打包为 zip
cd /tmp/test-skill
zip -r ../test-skill.zip .
```

然后在 Web 界面上传 `/tmp/test-skill.zip` 进行测试。

---

## 开发命令

### Python 后端

```bash
cd backend

# 运行测试
pytest

# 运行测试（带覆盖率）
pytest --cov=src --cov-report=html

# 类型检查
mypy src

# 代码格式化
black src tests
isort src tests

# 代码检查
ruff src tests
```

### 前端

```bash
cd frontend

# 运行测试
pnpm test

# 运行测试（UI 模式）
pnpm test:ui

# 类型检查
pnpm typecheck

# 代码格式化
pnpm format

# 代码检查
pnpm lint

# 构建生产版本
pnpm build

# 预览生产版本
pnpm preview
```

---

## 常见问题

### Q: opencode 服务器无法启动

**A**: 确保已正确安装 opencode CLI，并检查端口 3000 是否被占用：

```bash
# 检查端口
lsof -i :3000

# 使用其他端口
opencode serve --port 3002
```

### Q: Python 后端无法连接 opencode Server

**A**: 检查 `OPENCODE_SERVER_URL` 环境变量是否正确设置，并确保 opencode Server 正在运行。

### Q: 上传文件失败

**A**: 检查以下几点：
1. 文件大小是否超过 10MB
2. 临时目录是否有写入权限
3. 后端日志中的具体错误信息

### Q: 技能执行超时

**A**: 默认超时时间为 5 分钟。如需调整，修改 `backend/.env` 中的 `EXECUTION_TIMEOUT_SECONDS`。

---

## 下一步

1. 阅读 [spec.md](./spec.md) 了解完整功能需求
2. 阅读 [data-model.md](./data-model.md) 了解数据结构
3. 阅读 [contracts/](./contracts/) 了解 API 接口
4. 开始实现功能（参考 tasks.md，由 `/speckit.tasks` 生成）
