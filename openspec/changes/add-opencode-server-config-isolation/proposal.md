# Change: 添加 OpenCode Server 配置隔离

## Why

Skills 执行引擎需要启动独立的 opencode server，其配置需与开发测试环境完全隔离。当前开发环境使用 `~/.config/opencode/` 目录的配置，而 Skills Runtime 需要独立控制 provider、model、permission、agents 等配置，以确保：

1. **环境隔离**：避免开发配置影响 Skills 执行
2. **可重复性**：确保 Skills 在相同配置下一致执行
3. **版本控制**：Skills Runtime 配置可纳入版本管理

## What Changes

### 新增配置目录结构
- 创建 `config/skills-runtime/` 目录存放静态配置
- `opencode.json` - 基础配置（provider、model、permission）
- `oh-my-opencode.json` - 插件配置（agents 覆盖、ralph_loop）
- `agents/skill-executor.md` - 专为 skill 执行优化的自定义 agent

### 新增 Python 模块
- 创建 `backend/src/utils/opencode_server.py`
  - `OpencodeServerConfig` 数据类：封装服务器配置和环境变量生成
  - `OpencodeServerManager` 类：管理 opencode server 生命周期（start/stop）

### Settings 扩展
- 修改 `backend/src/utils/config.py` 添加：
  - `opencode_auto_start: bool` - 是否自动启动 opencode server
  - `opencode_server_port: int` - opencode server 端口
  - `opencode_server_hostname: str` - opencode server 主机名
  - `opencode_config_dir: str` - 配置目录路径

### 生命周期集成
- 修改 `backend/src/main.py` 的 lifespan 函数：
  - 根据配置自动启动/停止 opencode server
  - 动态更新客户端 URL

## Impact

- **新增能力**: opencode-server-management（服务器生命周期管理）
- **修改现有能力**: opencode-integration（添加服务器配置相关 Requirements）
- **受影响文件**:
  - `backend/src/utils/config.py`
  - `backend/src/utils/opencode.py`
  - `backend/src/main.py`
  - 新增 `backend/src/utils/opencode_server.py`
  - 新增 `config/skills-runtime/` 目录

## 技术关键点

### 配置优先级机制
opencode 支持两种配置覆盖方式：
1. **OPENCODE_CONFIG_DIR**: 指定配置目录，存放静态配置文件（可版本控制）
2. **OPENCODE_CONFIG_CONTENT**: 具有最高优先级，用于运行时动态覆盖

### 混合配置方案
- 使用 `OPENCODE_CONFIG_DIR` 存放基础配置（opencode.json, oh-my-opencode.json, agents/）
- 使用 `OPENCODE_CONFIG_CONTENT` 进行运行时动态覆盖（模型选择、权限调整等）

### Python SDK 限制
`opencode-sdk-new` 是纯 REST API 客户端，不支持启动 opencode server。因此需要通过 `subprocess` 管理 opencode CLI 进程。
