# 设计文档：OpenCode SDK 迁移

## 背景

### 当前架构

```
backend/src/opencode/
├── client.py      # OpencodeClient - 主客户端，使用 httpx.AsyncClient
├── session.py     # SessionAPI - 会话 CRUD 和 prompt
├── events.py      # EventStreamHandler - 使用 aiohttp 解析 SSE
├── models.py      # Pydantic 模型（健康响应、会话、事件等）
└── config.py      # ConfigAPI - 获取提供者/模型/代理
```

主要消费者：`ExecutionService` 通过以下流程执行技能：
1. `client.session.create(system_prompt=..., model=...)` 创建会话
2. `client.events.subscribe_session(session_id)` 订阅 SSE 事件流
3. `client.session.prompt(session_id, content)` 发送用户提示
4. 循环处理 SSE 事件直到 `session.idle`

### 新 SDK 架构

```
opencode_sdk_new/
├── _client.py           # OpencodeSDKNew / AsyncOpencodeSDKNew
├── _streaming.py        # Stream / AsyncStream + SSEDecoder（内置 SSE 解析）
├── resources/
│   ├── session/         # 会话资源（create, retrieve, send_async_message 等）
│   ├── event.py         # 事件订阅（返回 AsyncStream[Event]）
│   ├── config.py        # 配置资源
│   └── ...              # 其他资源
└── types/
    ├── event.py         # 40+ 种强类型事件定义
    └── ...              # 完整类型定义
```

## 目标 / 非目标

### 目标
- 用官方 SDK 替换自定义实现，获得完整类型支持
- 保持 `ExecutionService` 的公开接口不变
- 添加覆盖关键路径的自动化测试
- 添加可选的端到端测试

### 非目标
- 不改变技能执行的业务逻辑
- 不引入新的执行功能
- 不改变前端 API 契约

## 决策

### 1. 依赖引入方式

**决定**：使用 Git URL 依赖

```toml
# backend/pyproject.toml
[project]
dependencies = [
    "opencode-sdk-new @ git+ssh://git@github.com/lzhshen/opencode-sdk-new.git@d58fd94",
]
```

**理由**：
- 版本可锁定（通过 commit hash 或 tag）
- 依赖关系清晰，在 pyproject.toml 中明确声明
- 所有开发者可用（需要 GitHub 访问权限）
- SDK 更新时只需修改版本号

**CI/CD 配置**：
- GitHub Actions：使用 `ssh-agent` 配置 deploy key
- 或使用 HTTPS + Personal Access Token

**备选方案**：
- Vendoring：代码自包含，但需手动同步更新
- 本地路径依赖：仅适用于本地开发

### 2. 客户端初始化

**决定**：使用 `AsyncOpencodeSDKNew` 配合自定义 base_url

```python
from opencode_sdk_new import AsyncOpencodeSDKNew

client = AsyncOpencodeSDKNew(
    base_url=settings.opencode_server_url,
    api_key="dummy",  # 本地服务不需要认证，但参数必填
    timeout=30.0,
)
```

### 3. 会话创建与消息发送

**API 参数映射**：

| 当前实现 | 新 SDK | 说明 |
|----------|--------|------|
| `session.create(system_prompt=..., model=...)` | `session.create(directory=..., title=...)` | `directory` 可选，无 system_prompt 参数 |
| `session.prompt(session_id, content)` | `session.send_async_message(session_id, parts=[...], system=..., model=...)` | `system` 参数用于传递技能内容 |

**适配方案**：
```python
# 1. 创建会话（无需系统提示）
session = await client.session.create(
    directory=project_path,
    title=f"Skill: {skill_name}",
)

# 2. 发送消息时传递系统提示和用户内容
await client.session.send_async_message(
    session.id,
    parts=[{"type": "text", "text": user_prompt}],
    system=skill_content,  # 技能内容作为系统提示
    model={"model_id": model_id, "provider_id": provider_id},
)
```

### 4. 事件订阅机制

**确认：新 SDK 完全支持 SSE 流订阅**

SDK 内置 `SSEDecoder` 类，`event.get_events()` 返回 `AsyncStream[Event]`：

```python
# event.py 第 70-82 行
extra_headers = {"Accept": "text/event-stream", **(extra_headers or {})}
return await self._get(
    "/event",
    ...
    stream=True,
    stream_cls=AsyncStream[Event],
)
```

**适配方案**：
```python
# 当前实现
async for evt in client.events.subscribe_session(session_id):
    event_data = evt.json()
    event_type = event_data.get("type")

# 新 SDK（强类型，无需手动解析 JSON）
stream = await client.event.get_events(directory=project_path)
async for event in stream:
    if event.type == "session.idle":
        session_id = event.properties.session_id
        break
    elif event.type == "message.updated":
        message_info = event.properties.info
    elif event.type == "message.part.updated":
        part = event.properties.part
        delta = event.properties.delta
```

**注意**：新 SDK 按 `directory` 过滤事件，而非 `session_id`。由于每个目录通常只有一个活动会话，效果等效。

### 5. 模型配置变更

**当前实现**：只需 `model_id`
**新 SDK**：需要 `model_id` + `provider_id`

**适配方案**：
1. 扩展 `ModelConfig` 模型增加 `provider_id` 字段
2. 或在调用时查询获取 provider_id

### 6. 测试策略

**单元测试**（mock）：
- 使用 `respx` 库 mock HTTP 响应
- 测试 `ExecutionService` 的核心流程
- 验证错误处理和超时

**端到端测试**：
- 需要运行中的 OpenCode 服务
- 使用 pytest fixture 管理服务依赖
- 标记为 `@pytest.mark.e2e`，默认跳过

## 风险 / 权衡

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 模型配置需要 provider_id | 当前只传 model_id，需额外获取 provider_id | 扩展 ModelConfig 模型或查询获取 |
| 事件按 directory 过滤 | 需确保使用正确的项目目录 | 使用项目根目录作为 directory 参数 |
| Git 仓库访问权限 | CI/CD 需要配置 SSH 密钥或 token | 使用 GitHub deploy key 或 PAT |

## 迁移计划

### 阶段 1：添加 SDK 依赖并适配客户端
1. 更新 `pyproject.toml` 添加 Git URL 依赖
2. 运行 `pip install -e .` 安装依赖
3. 创建新的客户端工厂函数
4. 验证基本连接和健康检查

### 阶段 2：重构 ExecutionService
1. 替换会话创建逻辑
2. 适配事件订阅（使用 `AsyncStream[Event]`）
3. 更新消息发送（使用 `send_async_message`）
4. 更新事件处理代码

### 阶段 3：清理和测试
1. 移除旧的 `backend/src/opencode/` 目录
2. 添加单元测试
3. 添加端到端测试
4. 更新文档

## 已解决的问题

1. ✅ **SSE 事件订阅**：新 SDK 完全支持，内置 `SSEDecoder`，返回强类型 `Event` 对象
2. ✅ **系统提示传递**：通过 `send_async_message` 的 `system` 参数传递
3. ✅ **API Key**：本地服务可传 "dummy" 值，参数必填但不验证
