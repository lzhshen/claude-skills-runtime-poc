# OpenCode 集成规格 - 服务器管理扩展

## ADDED Requirements

### Requirement: 服务器配置隔离

系统 SHALL 支持通过独立配置目录运行 opencode server，MUST 确保与用户开发环境配置完全隔离。

#### Scenario: 使用隔离配置启动服务器

- **GIVEN** 存在独立的配置目录 `config/skills-runtime/`
- **WHEN** 系统启动 opencode server 时
- **THEN** 系统 MUST 设置 `OPENCODE_CONFIG_DIR` 环境变量指向该目录
- **AND** 服务器 MUST 加载该目录下的 `opencode.json` 和 `oh-my-opencode.json`

#### Scenario: 配置目录不存在

- **GIVEN** 配置的 `opencode_config_dir` 路径不存在
- **WHEN** 尝试启动 opencode server
- **THEN** 系统 MUST 抛出 `ConfigurationError` 并提供清晰的错误信息

### Requirement: 服务器生命周期管理

系统 SHALL 提供 `OpencodeServerManager` 类管理 opencode server 进程的完整生命周期。

#### Scenario: 启动服务器成功

- **GIVEN** opencode CLI 可用且配置有效
- **WHEN** 调用 `OpencodeServerManager.start()`
- **THEN** 系统 MUST 启动 opencode server 子进程
- **AND** 等待服务器就绪后返回

#### Scenario: 启动服务器超时

- **GIVEN** opencode server 启动时间超过配置的超时时间
- **WHEN** 调用 `OpencodeServerManager.start()`
- **THEN** 系统 MUST 终止子进程并抛出 `ServerStartupError`

#### Scenario: 停止服务器

- **GIVEN** opencode server 正在运行
- **WHEN** 调用 `OpencodeServerManager.stop()`
- **THEN** 系统 MUST 发送 SIGTERM 信号并等待进程退出

#### Scenario: 重复启动检测

- **GIVEN** opencode server 已在运行
- **WHEN** 再次调用 `OpencodeServerManager.start()`
- **THEN** 系统 MUST 抛出 `RuntimeError` 提示服务器已运行

### Requirement: FastAPI 生命周期集成

系统 SHALL 在 FastAPI 应用生命周期中自动管理 opencode server。

#### Scenario: 应用启动时自动启动服务器

- **GIVEN** 配置 `opencode_auto_start=True`
- **WHEN** FastAPI 应用启动
- **THEN** 系统 MUST 在 lifespan 函数中启动 opencode server
- **AND** 更新 `app.state.opencode_server_url` 为服务器地址

#### Scenario: 应用关闭时自动停止服务器

- **GIVEN** opencode server 由应用管理且正在运行
- **WHEN** FastAPI 应用关闭
- **THEN** 系统 MUST 调用 `OpencodeServerManager.stop()` 停止服务器

#### Scenario: 禁用自动启动

- **GIVEN** 配置 `opencode_auto_start=False`（默认值）
- **WHEN** FastAPI 应用启动
- **THEN** 系统 MUST NOT 尝试启动 opencode server
- **AND** 使用配置的 `opencode_server_url` 连接外部服务器

### Requirement: 服务器配置参数

系统 SHALL 支持通过 Settings 类配置 opencode server 参数。

#### Scenario: 配置服务器端口

- **GIVEN** 环境变量 `OPENCODE_SERVER_PORT=5000`
- **WHEN** 系统读取配置
- **THEN** `Settings.opencode_server_port` MUST 返回 `5000`

#### Scenario: 配置服务器主机名

- **GIVEN** 环境变量 `OPENCODE_SERVER_HOSTNAME=0.0.0.0`
- **WHEN** 系统读取配置
- **THEN** `Settings.opencode_server_hostname` MUST 返回 `0.0.0.0`

#### Scenario: 配置目录路径

- **GIVEN** 环境变量 `OPENCODE_CONFIG_DIR=/custom/config`
- **WHEN** 系统读取配置
- **THEN** `Settings.opencode_config_dir` MUST 返回 `/custom/config`

#### Scenario: 使用默认配置

- **GIVEN** 未设置相关环境变量
- **WHEN** 系统读取配置
- **THEN** `Settings.opencode_auto_start` MUST 返回 `False`
- **AND** `Settings.opencode_server_port` MUST 返回 `4096`
- **AND** `Settings.opencode_server_hostname` MUST 返回 `127.0.0.1`
- **AND** `Settings.opencode_config_dir` MUST 返回 `config/skills-runtime`

### Requirement: 服务器就绪检测

系统 SHALL 在启动 opencode server 后验证其可用性。

#### Scenario: 健康检查验证就绪

- **GIVEN** opencode server 进程已启动
- **WHEN** 等待服务器就绪
- **THEN** 系统 MUST 通过健康检查端点验证服务器可用
- **AND** 在验证成功后返回

#### Scenario: 就绪检查重试

- **GIVEN** 服务器启动中，健康检查暂时失败
- **WHEN** 等待服务器就绪
- **THEN** 系统 MUST 以指数退避策略重试健康检查
- **AND** 在成功或超时前持续重试
