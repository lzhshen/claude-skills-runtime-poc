# Deployment Architecture: Claude Skills 运行时平台

**Date**: 2026-01-09 | **Branch**: `003-skills-runtime`

## 概述

本文档定义了 Claude Skills 智能体开发/测试/运行平台的部署架构设计，重点解决：

1. 哪些服务是常驻的，哪些是临时的
2. opencode Server 与 Skill 脚本的执行环境关系
3. 如何实现安全隔离和资源控制

> **本期实现说明**: 本文档描述的是完整生产架构。本期 MVP 采用简化实现，详见 [plan.md](./plan.md) 中的"基础设施简化策略"。

---

## 架构目标

| 目标 | 描述 |
|------|------|
| **安全隔离** | 每个技能执行相互隔离，防止状态泄露和恶意代码影响 |
| **资源可控** | 精确控制 CPU、内存、执行时间 |
| **可扩展** | 支持并发执行多个技能任务 |
| **成本优化** | 按需创建执行环境，空闲时不消耗资源 |
| **快速响应** | 最小化任务启动延迟 |

---

## 整体架构：控制平面 + 数据平面

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           控制平面 (Control Plane) - 常驻服务                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────┐   ┌──────────────────┐   ┌─────────────────────────────────┐  │
│  │   Frontend  │   │   API Gateway    │   │       任务编排器                 │  │
│  │  (React)    │──▶│   (FastAPI)      │──▶│  (Celery / K8s Job Controller)  │  │
│  │             │   │                  │   │                                 │  │
│  │  - 上传验证  │   │  - 技能包管理     │   │  - Runner 生命周期管理           │  │
│  │  - 预览编辑  │   │  - 执行调度      │   │  - 任务队列                      │  │
│  │  - 日志查看  │   │  - 结果聚合      │   │  - 超时/重试控制                 │  │
│  └─────────────┘   └──────────────────┘   └───────────────┬─────────────────┘  │
│                                                           │                    │
│  ┌────────────────────────────────────────────────────────┼────────────────┐   │
│  │                         持久化层                        │                │   │
│  │  ┌───────────────┐  ┌───────────────┐  ┌──────────────┴──────────────┐ │   │
│  │  │ 技能包仓库     │  │ 元数据/历史    │  │        任务队列              │ │   │
│  │  │ (S3/MinIO)    │  │ (PostgreSQL)  │  │        (Redis)              │ │   │
│  │  └───────────────┘  └───────────────┘  └─────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                          │
                                          │ 按需创建/销毁
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           数据平面 (Data Plane) - 临时执行器                       │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│   ┌─────────────────────────────────────────────────────────────────────────┐   │
│   │              Skill Runner Container (生命周期 = 单次任务执行)              │   │
│   │                                                                         │   │
│   │   ┌─────────────────────────────────────────────────────────────────┐   │   │
│   │   │                    opencode Server (Bun)                        │   │   │
│   │   │   - 会话管理                                                     │   │   │
│   │   │   - LLM 交互 (Claude API)                                        │   │   │
│   │   │   - 工具路由 (Bash, Read, Write, Edit...)                        │   │   │
│   │   └──────────────────────────────┬──────────────────────────────────┘   │   │
│   │                                  │                                      │   │
│   │                                  │ 同一容器内调用                        │   │
│   │                                  ▼                                      │   │
│   │   ┌─────────────────────────────────────────────────────────────────┐   │   │
│   │   │                    脚本执行环境 (Shell)                           │   │   │
│   │   │   - Python 3.11+                                                │   │   │
│   │   │   - Node.js 20+                                                 │   │   │
│   │   │   - Bash, 常用 CLI 工具                                          │   │   │
│   │   └─────────────────────────────────────────────────────────────────┘   │   │
│   │                                                                         │   │
│   │   /workspace/                                                           │   │
│   │     └── skill/                   ◀── 技能包挂载点                        │   │
│   │         ├── SKILL.md                                                    │   │
│   │         └── scripts/                                                    │   │
│   │             ├── validate.py                                             │   │
│   │             └── process.sh                                              │   │
│   │                                                                         │   │
│   │   资源限制: CPU 2核, Memory 4GB, Timeout 5min, 网络隔离(可选)            │   │
│   └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐             │
│   │  Runner 实例 2   │  │  Runner 实例 3   │  │  Runner 实例 N   │             │
│   │  (另一个任务)     │  │  (另一个任务)     │  │      ...        │             │
│   └──────────────────┘  └──────────────────┘  └──────────────────┘             │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 服务分类

### 常驻服务 (Persistent Services)

这些服务持续运行，处理请求和协调任务。

| 服务 | 职责 | 技术选型 | 部署特点 |
|------|------|---------|---------|
| **Frontend** | Web UI，用户交互 | React + Vite | 静态资源，可 CDN 加速 |
| **Backend** | API 路由、技能包管理、任务编排 | Python FastAPI | 本期单进程；生产可拆分 |
| **PostgreSQL** | 技能元数据、执行历史持久化 | PostgreSQL 15+ | 本期用 SQLite 替代 |
| **Redis** | 任务队列、会话缓存、实时事件 | Redis 7+ | 本期用内存队列替代 |
| **Object Storage** | 技能包文件存储 | MinIO / S3 | 本期用本地文件系统替代 |

> **本期简化**: Backend 合并了 API Gateway 和 Task Orchestrator 功能，单进程部署。

### 临时服务 (Ephemeral Services)

这些服务按需创建，任务完成后销毁。

| 服务 | 职责 | 生命周期 | 资源配置 |
|------|------|---------|---------|
| **Skill Runner** | 执行单个技能任务 | 任务开始 → 完成/超时/取消 | CPU: 2核, Mem: 4GB, Timeout: 5min |

---

## 关键设计决策

### 决策 1: opencode Server 与脚本在同一容器

**结论**: ✅ 是的，opencode Server 和 Skill 脚本必须在同一个容器/环境内执行。

```
┌─────────────────────────────────────────────────────────┐
│               Skill Runner Container                    │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │              opencode Server                     │   │
│  │                    │                             │   │
│  │                    │ Bash Tool (进程内调用)       │   │
│  │                    ▼                             │   │
│  │  ┌───────────────────────────────────────────┐  │   │
│  │  │  fork/exec                                │  │   │
│  │  │  $ python /workspace/skill/scripts/x.py   │  │   │
│  │  │  $ bash /workspace/skill/scripts/y.sh     │  │   │
│  │  └───────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  共享文件系统: /workspace/skill/                        │
└─────────────────────────────────────────────────────────┘
```

**理由**:

1. **工具调用机制**: opencode 的 Bash Tool 通过 `child_process` 在同一操作系统上执行命令
2. **文件系统共享**: Read/Write/Edit 工具需要直接访问技能包文件
3. **性能**: 跨容器调用会引入网络延迟和复杂性
4. **简单性**: 单容器更易于管理和调试

### 决策 2: Runner 容器生命周期 = 单次任务

**结论**: ✅ 每次技能执行创建新容器，完成后销毁。

| 方案 | 优点 | 缺点 |
|------|------|------|
| **常驻 Runner 池** | 无冷启动延迟 | 多任务共享环境，状态泄露风险，资源浪费 |
| **临时 Runner (选择)** | 完全隔离，干净环境，精确资源控制 | 有冷启动延迟 |

**隔离带来的安全保障**:
- 每次执行在干净环境启动
- 无法访问其他任务的文件或内存
- 恶意脚本影响范围限于当前容器
- 容器销毁后所有痕迹清除

### 决策 3: 冷启动优化策略

```
┌─────────────────────────────────────────────────────────────┐
│                     预热容器池 (Warm Pool)                    │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Pre-warmed  │  │ Pre-warmed  │  │ Pre-warmed  │  ...    │
│  │  Runner 1   │  │  Runner 2   │  │  Runner 3   │         │
│  │ (空闲待命)   │  │ (空闲待命)   │  │ (空闲待命)   │         │
│  └──────┬──────┘  └─────────────┘  └─────────────┘         │
│         │                                                   │
│         │ 任务到达：立即分配，挂载技能包                       │
│         ▼                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Runner 1 + /workspace/skill (bind mount)           │   │
│  │  → 开始执行                                          │   │
│  │  → 完成后销毁                                        │   │
│  │  → 池中补充新的预热容器                               │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**优化措施**:

| 措施 | 效果 | 实现复杂度 |
|------|------|-----------|
| **预热容器池** | 消除镜像拉取和容器创建延迟 | 中 |
| **轻量级镜像** | 减少启动时间 | 低 |
| **本地镜像缓存** | 避免网络拉取 | 低 |
| **Firecracker/gVisor** | 毫秒级启动的轻量级隔离 | 高 |

---

## 执行流程

```
┌──────┐     ┌───────────┐     ┌──────────┐     ┌────────────────┐
│ 用户  │     │API Gateway│     │  编排器   │     │ Skill Runner   │
└──┬───┘     └─────┬─────┘     └────┬─────┘     └───────┬────────┘
   │               │                │                   │
   │ 1. POST /execute               │                   │
   │   {skill_id, prompt}           │                   │
   │──────────────▶│                │                   │
   │               │                │                   │
   │               │ 2. 验证请求     │                   │
   │               │    入队任务     │                   │
   │               │───────────────▶│                   │
   │               │                │                   │
   │               │                │ 3. 从池中获取/创建 Runner
   │               │                │──────────────────▶│
   │               │                │                   │
   │               │                │                   │ 4. 挂载技能包
   │               │                │                   │    /workspace/skill
   │               │                │                   │
   │               │                │                   │ 5. 启动 opencode server
   │               │                │                   │
   │               │                │                   │ 6. 创建会话
   │               │                │                   │    注入 SKILL.md
   │               │                │                   │    发送用户 prompt
   │               │                │                   │
   │ 7. SSE 事件流  │                │                   │ 8. 执行中...
   │   (实时日志)   │◀───────────────┼───────────────────│    - LLM 响应
   │◀──────────────│                │                   │    - 工具调用
   │               │                │                   │    - 脚本执行
   │               │                │                   │
   │ 9. 执行完成    │                │                   │
   │   {result}    │◀───────────────┼───────────────────│
   │◀──────────────│                │                   │
   │               │                │                   │
   │               │                │ 10. 销毁 Runner   │
   │               │                │──────────────────▶│ ✕
   │               │                │                   │
   │               │                │ 11. 补充预热池     │
   │               │                │─────────┐         │
   │               │                │◀────────┘         │
```

---

## Runner 容器设计

### Dockerfile

```dockerfile
# Dockerfile.skill-runner
FROM node:20-slim AS base

# 系统依赖
RUN apt-get update && apt-get install -y \
    curl \
    git \
    python3.11 \
    python3-pip \
    python3-venv \
    bash \
    jq \
    && rm -rf /var/lib/apt/lists/*

# 安装 Bun (opencode 运行时需要)
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# 安装 opencode
RUN bun install -g @anthropic/opencode

# Python 常用包 (可选，根据技能需求)
RUN pip3 install --no-cache-dir \
    requests \
    pyyaml \
    python-dotenv

# 工作目录
WORKDIR /workspace

# 入口脚本
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# 健康检查
HEALTHCHECK --interval=5s --timeout=3s --start-period=10s \
    CMD curl -f http://localhost:3000/global/health || exit 1

# 非 root 用户 (可选，增强安全)
# RUN useradd -m runner
# USER runner

ENTRYPOINT ["/entrypoint.sh"]
```

### 入口脚本

```bash
#!/bin/bash
# entrypoint.sh

set -e

SKILL_DIR="/workspace/skill"
OPENCODE_PORT="${OPENCODE_PORT:-3000}"
CALLBACK_URL="${CALLBACK_URL:-}"

echo "[Runner] Starting skill runner..."

# 验证技能包已挂载
if [ ! -f "$SKILL_DIR/SKILL.md" ]; then
    echo "[Runner] ERROR: SKILL.md not found in $SKILL_DIR"
    exit 1
fi

echo "[Runner] Skill package found at $SKILL_DIR"

# 启动 opencode server
cd "$SKILL_DIR"
opencode serve --port "$OPENCODE_PORT" &
OPENCODE_PID=$!

# 等待 server 就绪
echo "[Runner] Waiting for opencode server..."
for i in {1..30}; do
    if curl -sf "http://localhost:$OPENCODE_PORT/global/health" > /dev/null 2>&1; then
        echo "[Runner] opencode server is ready"
        break
    fi
    sleep 0.5
done

# 通知编排器 Runner 已就绪
if [ -n "$CALLBACK_URL" ]; then
    curl -sf -X POST "$CALLBACK_URL/ready" \
        -H "Content-Type: application/json" \
        -d '{"status": "ready", "port": '"$OPENCODE_PORT"'}' || true
fi

# 保持运行，等待任务
echo "[Runner] Ready to accept tasks"
wait $OPENCODE_PID
```

---

## 部署方案

### 方案 A: Docker Compose (开发/MVP)

适用于单机部署、开发测试环境。

```yaml
# docker-compose.yml
version: '3.8'

services:
  # === 控制平面 ===

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    depends_on:
      - api-gateway

  api-gateway:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/skills
      - REDIS_URL=redis://redis:6379
      - MINIO_ENDPOINT=minio:9000
    depends_on:
      - postgres
      - redis
      - minio
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock  # 用于创建 Runner

  task-worker:
    build: ./backend
    command: celery -A app.worker worker -l info
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/skills
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      - postgres
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - skill-packages:/data/skill-packages  # 共享技能包存储

  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: skills
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7
    volumes:
      - redis-data:/data

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio-data:/data

  # === 数据平面 (Runner 由 task-worker 动态创建) ===
  # Runner 容器不在 compose 中定义，由 Python 代码通过 Docker SDK 创建

volumes:
  postgres-data:
  redis-data:
  minio-data:
  skill-packages:
```

**Python 创建 Runner 示例**:

```python
import docker
from docker.types import Mount

client = docker.from_env()

def create_skill_runner(task_id: str, skill_package_path: str) -> str:
    """创建临时 Skill Runner 容器"""
    container = client.containers.run(
        image="skill-runner:latest",
        name=f"runner-{task_id}",
        detach=True,
        auto_remove=True,  # 退出后自动删除
        mounts=[
            Mount(
                target="/workspace/skill",
                source=skill_package_path,
                type="bind",
                read_only=True
            )
        ],
        environment={
            "TASK_ID": task_id,
            "CALLBACK_URL": "http://api-gateway:8000/internal/runner"
        },
        mem_limit="4g",
        cpu_period=100000,
        cpu_quota=200000,  # 2 CPU
        network="skills-network",
    )
    return container.id
```

### 方案 B: Kubernetes (生产)

适用于大规模生产部署。

```yaml
# skill-runner-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: skill-runner-${TASK_ID}
  labels:
    app: skill-runner
    task-id: ${TASK_ID}
spec:
  ttlSecondsAfterFinished: 60  # 完成后 60 秒自动清理
  activeDeadlineSeconds: 300   # 5 分钟超时
  backoffLimit: 0              # 不重试
  template:
    metadata:
      labels:
        app: skill-runner
    spec:
      restartPolicy: Never
      containers:
      - name: runner
        image: skill-runner:latest
        ports:
        - containerPort: 3000
        env:
        - name: TASK_ID
          value: "${TASK_ID}"
        - name: CALLBACK_URL
          value: "http://api-gateway.skills.svc:8000/internal/runner"
        resources:
          requests:
            cpu: "1"
            memory: "2Gi"
          limits:
            cpu: "2"
            memory: "4Gi"
        volumeMounts:
        - name: skill-package
          mountPath: /workspace/skill
          readOnly: true
        livenessProbe:
          httpGet:
            path: /global/health
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
      volumes:
      - name: skill-package
        persistentVolumeClaim:
          claimName: skill-${SKILL_ID}
      # 或使用 initContainer 从 S3 下载
      initContainers:
      - name: fetch-skill
        image: amazon/aws-cli
        command:
        - aws
        - s3
        - cp
        - s3://skill-packages/${SKILL_ID}.zip
        - /skill/package.zip
        volumeMounts:
        - name: skill-package
          mountPath: /skill
```

---

## 网络与安全

### 网络隔离

```
┌─────────────────────────────────────────────────────────────┐
│                    skills-network (Docker/K8s)              │
│                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐   │
│  │  Frontend   │────▶│ API Gateway │────▶│   Redis     │   │
│  └─────────────┘     └──────┬──────┘     └─────────────┘   │
│                             │                               │
│                             │                               │
│                      ┌──────▼──────┐                        │
│                      │ Task Worker │                        │
│                      └──────┬──────┘                        │
│                             │                               │
└─────────────────────────────┼───────────────────────────────┘
                              │
                              │ 创建
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  runner-network (隔离网络)                   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Skill Runner                            │   │
│  │  - 只能访问 API Gateway (回调)                        │   │
│  │  - 只能访问 Claude API (LLM)                         │   │
│  │  - 无法访问其他 Runner                                │   │
│  │  - 无法访问内部服务 (DB, Redis)                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 安全措施

| 层级 | 措施 | 说明 |
|------|------|------|
| **容器** | 资源限制 | CPU/内存/磁盘限制 |
| **容器** | 只读挂载 | 技能包以只读方式挂载 |
| **容器** | 非 root 用户 | 降低权限 |
| **网络** | 网络策略 | 限制出站连接 |
| **网络** | 仅允许必要端口 | Claude API, 回调 URL |
| **运行时** | 执行超时 | 5 分钟硬限制 |
| **运行时** | 日志审计 | 记录所有操作 |

---

## 监控与可观测性

```
┌─────────────────────────────────────────────────────────────┐
│                        可观测性栈                            │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Prometheus │  │    Loki     │  │       Jaeger        │ │
│  │  (Metrics)  │  │   (Logs)    │  │     (Tracing)       │ │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘ │
│         │                │                     │            │
│         └────────────────┼─────────────────────┘            │
│                          │                                  │
│                   ┌──────▼──────┐                           │
│                   │   Grafana   │                           │
│                   │ (Dashboard) │                           │
│                   └─────────────┘                           │
└─────────────────────────────────────────────────────────────┘
```

**关键指标**:

| 指标 | 说明 |
|------|------|
| `runner_active_count` | 当前活跃 Runner 数量 |
| `runner_startup_duration_seconds` | Runner 启动耗时 |
| `skill_execution_duration_seconds` | 技能执行耗时 |
| `skill_execution_status` | 执行状态分布 (success/failed/timeout) |
| `tool_call_count` | 工具调用次数 |
| `warm_pool_size` | 预热池大小 |

---

## 成本优化

| 策略 | 说明 | 节省 |
|------|------|------|
| **按需创建** | 无任务时不运行 Runner | ~70% |
| **预热池动态调整** | 根据负载自动扩缩预热池 | ~20% |
| **Spot/抢占实例** | 使用低成本实例运行 Runner | ~60-80% |
| **共享基础镜像** | 减少存储和拉取成本 | ~10% |

---

## 演进路径

```
Phase 1 (MVP)                 Phase 2 (Production)           Phase 3 (Scale)
─────────────────────────────────────────────────────────────────────────────
Docker Compose               Kubernetes                      Multi-Region K8s
单机部署                       集群部署                         全球分布

手动扩容                       HPA 自动扩容                    跨区域调度

无预热池                       预热容器池                       智能预热 + 预测

基础监控                       Prometheus + Grafana           全链路追踪

单租户                        多租户隔离                       租户配额管理
```

---

## 总结

| 问题 | 答案 |
|------|------|
| **常驻服务** | Frontend, Backend (API + Orchestrator) |
| **常驻服务 (生产扩展)** | PostgreSQL, Redis, MinIO |
| **临时服务** | Skill Runner (opencode + 脚本执行环境) |
| **opencode 和脚本同一环境？** | ✅ 是的，在同一个 Runner 容器内 |
| **Runner 生命周期** | 任务开始创建 → 执行完成/超时/取消后销毁 |
| **隔离机制** | 容器级隔离 + 资源限制 + 网络隔离 |
| **冷启动优化** | 预热容器池 + 轻量级镜像 |

> **本期 MVP**: Backend 单进程部署，SQLite 替代 PostgreSQL，内存队列替代 Redis，本地文件系统替代 MinIO。
