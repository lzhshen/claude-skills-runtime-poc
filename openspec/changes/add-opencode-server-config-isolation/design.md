# 设计文档：OpenCode Server 配置隔离

## 背景

Skills Runtime 需要启动独立的 opencode server 实例，其配置必须与开发测试环境完全隔离。这是对已完成的 `replace-opencode-sdk` change 的扩展。

### 当前状态

```
~/.config/opencode/           # 用户开发环境配置
├── opencode.json            # provider、model 配置
├── oh-my-opencode.json      # 插件配置
├── agents/                  # 自定义 agents
└── commands/                # 自定义命令

backend/src/utils/
├── config.py                # Settings 类，包含 opencode_server_url
└── opencode.py              # AsyncOpencodeSDKNew 客户端工厂
```

### 目标状态

```
config/skills-runtime/        # Skills Runtime 专用配置（版本控制）
├── opencode.json            # 隔离的 provider/model 配置
├── oh-my-opencode.json      # 插件配置
└── agents/
    └── skill-executor.md    # 专用 agent

backend/src/utils/
├── config.py                # 扩展 Settings 类
├── opencode.py              # SDK 客户端工厂
└── opencode_server.py       # 新增：服务器生命周期管理
```

## 目标 / 非目标

### 目标
- 实现 opencode server 配置与开发环境完全隔离
- 支持 FastAPI 应用生命周期内自动管理 opencode server
- 提供灵活的配置覆盖机制（静态配置 + 动态覆盖）
- 确保配置可版本控制

### 非目标
- 不修改 opencode 本身的配置加载逻辑
- 不改变现有 SDK 客户端的使用方式
- 不支持同时运行多个 opencode server 实例

## 决策

### 1. 配置隔离机制

**决定**：使用 `OPENCODE_CONFIG_DIR` 环境变量

**理由**：
- opencode 原生支持此环境变量
- 配置目录可纳入版本控制
- 与用户配置完全隔离

**配置优先级**（从高到低）：
1. `OPENCODE_CONFIG_CONTENT` - JSON 字符串，运行时动态覆盖
2. `OPENCODE_CONFIG_DIR/opencode.json` - 目录内配置文件
3. `~/.config/opencode/opencode.json` - 用户默认配置

### 2. 服务器生命周期管理

**决定**：使用 `asyncio.subprocess` 管理 opencode server 进程

```python
@dataclass
class OpencodeServerConfig:
    """OpenCode server configuration."""
    config_dir: Path
    port: int = 4096
    hostname: str = "127.0.0.1"
    cors_origins: list[str] = field(default_factory=list)

    def get_env(self) -> dict[str, str]:
        """Generate environment variables for the server."""
        env = os.environ.copy()
        env["OPENCODE_CONFIG_DIR"] = str(self.config_dir)
        return env

    def get_command(self) -> list[str]:
        """Generate the server start command."""
        cmd = ["opencode", "serve",
               "--port", str(self.port),
               "--hostname", self.hostname]
        for origin in self.cors_origins:
            cmd.extend(["--cors", origin])
        return cmd


class OpencodeServerManager:
    """Manages opencode server lifecycle."""

    def __init__(self, config: OpencodeServerConfig):
        self.config = config
        self._process: asyncio.subprocess.Process | None = None

    async def start(self) -> None:
        """Start the opencode server."""
        if self._process is not None:
            raise RuntimeError("Server already running")

        self._process = await asyncio.create_subprocess_exec(
            *self.config.get_command(),
            env=self.config.get_env(),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        # Wait for server to be ready
        await self._wait_for_ready()

    async def stop(self) -> None:
        """Stop the opencode server."""
        if self._process is None:
            return
        self._process.terminate()
        await self._process.wait()
        self._process = None
```

**理由**：
- `opencode-sdk-new` 是纯 REST 客户端，无法启动服务器
- `asyncio.subprocess` 与 FastAPI 的异步模型一致
- 进程级隔离确保配置完全独立

### 3. Settings 扩展

**决定**：扩展现有 `Settings` 类

```python
class Settings(BaseSettings):
    # ... 现有配置 ...

    # OpenCode Server Management
    opencode_auto_start: bool = Field(default=False)
    opencode_server_port: int = Field(default=4096)
    opencode_server_hostname: str = Field(default="127.0.0.1")
    opencode_config_dir: str = Field(default="config/skills-runtime")
```

**理由**：
- 保持配置集中管理
- 支持环境变量覆盖
- 默认关闭自动启动，向后兼容

### 4. FastAPI 生命周期集成

**决定**：在 `lifespan` 函数中管理服务器

```python
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    settings = get_settings()
    server_manager = None

    if settings.opencode_auto_start:
        config = OpencodeServerConfig(
            config_dir=Path(settings.opencode_config_dir),
            port=settings.opencode_server_port,
            hostname=settings.opencode_server_hostname,
            cors_origins=settings.cors_origins,
        )
        server_manager = OpencodeServerManager(config)
        await server_manager.start()

        # Update client URL to match server
        app.state.opencode_server_url = (
            f"http://{settings.opencode_server_hostname}:{settings.opencode_server_port}"
        )

    app.state.opencode_client = get_opencode_client()

    yield

    await close_opencode_client()
    if server_manager:
        await server_manager.stop()
```

**理由**：
- 与 FastAPI 生命周期一致
- 确保资源正确释放
- 支持动态 URL 配置

### 5. 配置目录结构

**决定**：在项目根目录创建 `config/skills-runtime/`

```
config/skills-runtime/
├── opencode.json           # 基础配置
├── oh-my-opencode.json     # 插件配置
└── agents/
    └── skill-executor.md   # 专用 agent
```

**opencode.json 示例**：
```json
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "anthropic": {
      "npm": "@ai-sdk/anthropic",
      "name": "anthropic",
      "options": {},
      "models": {
        "claude-sonnet-4-20250514": {
          "name": "Claude Sonnet 4"
        }
      }
    }
  }
}
```

**oh-my-opencode.json 示例**：
```json
{
  "$schema": "https://raw.githubusercontent.com/code-yeongyu/oh-my-opencode/master/assets/oh-my-opencode.schema.json",
  "google_auth": false,
  "agents": {
    "skill-executor": {
      "model": "anthropic/claude-sonnet-4-20250514"
    }
  },
  "ralph_loop": {
    "enabled": false
  }
}
```

**理由**：
- 配置文件可版本控制
- 与项目代码一起发布
- 易于理解和修改

## 风险 / 权衡

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| opencode CLI 不可用 | 服务器无法启动 | 启动前检查 CLI 可用性，提供清晰错误信息 |
| 端口冲突 | 服务器启动失败 | 支持配置端口，启动前检查端口可用 |
| 服务器启动超时 | 应用启动阻塞 | 设置合理超时，超时后抛出异常 |
| 进程僵尸 | 资源泄漏 | 在 lifespan 中确保 stop 被调用 |

## 迁移计划

### 阶段 1：基础设施
1. 创建 `config/skills-runtime/` 目录和配置文件
2. 实现 `OpencodeServerConfig` 和 `OpencodeServerManager`
3. 扩展 `Settings` 类

### 阶段 2：集成
1. 修改 `main.py` lifespan 函数
2. 更新 `opencode.py` 支持动态 URL
3. 添加单元测试

### 阶段 3：验证
1. 端到端测试验证配置隔离
2. 文档更新

## 已解决的问题

1. **如何启动 opencode server？** - 使用 `asyncio.subprocess` 调用 `opencode serve` 命令
2. **如何隔离配置？** - 使用 `OPENCODE_CONFIG_DIR` 环境变量
3. **如何集成到 FastAPI？** - 在 lifespan 函数中管理服务器生命周期
