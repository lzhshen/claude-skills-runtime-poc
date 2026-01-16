# OpenCode 集成规格

## ADDED Requirements

### Requirement: SDK 客户端管理

系统 SHALL 使用 `opencode_sdk_new` 官方 SDK 与 OpenCode 服务通信，并 MUST 提供统一的客户端管理机制。

#### Scenario: 客户端初始化成功

- **GIVEN** 配置中指定了有效的 OpenCode 服务 URL
- **WHEN** 应用程序启动时初始化 SDK 客户端
- **THEN** 系统 MUST 创建 `AsyncOpencodeSDKNew` 实例并配置正确的 base_url 和超时参数

#### Scenario: 客户端连接失败处理

- **GIVEN** OpenCode 服务不可用
- **WHEN** 尝试进行 API 调用
- **THEN** 系统 MUST 捕获 `APIConnectionError` 并返回友好的错误信息

### Requirement: 技能执行会话管理

系统 SHALL 通过新 SDK 管理技能执行会话的完整生命周期。

#### Scenario: 创建执行会话

- **GIVEN** 一个有效的技能包和用户提示
- **WHEN** 调用 `ExecutionService.start_execution()`
- **THEN** 系统 MUST 通过 SDK 创建 OpenCode 会话并返回执行会话对象

#### Scenario: 发送用户提示

- **GIVEN** 一个已创建的 OpenCode 会话
- **WHEN** 需要发送用户提示
- **THEN** 系统 MUST 使用 `session.send_async_message()` 发送提示内容

#### Scenario: 取消执行会话

- **GIVEN** 一个正在运行的执行会话
- **WHEN** 调用 `ExecutionService.cancel_execution()`
- **THEN** 系统 MUST 通过 SDK 中止 OpenCode 会话

### Requirement: 事件流订阅

系统 SHALL 实时接收并处理 OpenCode 会话的事件流。

#### Scenario: 订阅会话事件

- **GIVEN** 一个活动的 OpenCode 会话
- **WHEN** 订阅事件流
- **THEN** 系统 MUST 接收 SSE 事件并转换为 `ExecutionLog` 条目

#### Scenario: 检测会话完成

- **GIVEN** 正在处理事件流
- **WHEN** 收到 `session.idle` 或状态变为 `idle` 的事件
- **THEN** 系统 MUST 将执行状态标记为已完成

#### Scenario: 处理事件流中断

- **GIVEN** 正在接收事件流
- **WHEN** 连接中断或超时
- **THEN** 系统 MUST 记录错误并将执行状态标记为失败

### Requirement: 健康检查集成

系统 SHALL 通过新 SDK 提供 OpenCode 服务的健康状态检查。

#### Scenario: 健康检查成功

- **GIVEN** OpenCode 服务运行正常
- **WHEN** 调用健康检查端点
- **THEN** 系统 MUST 通过 `global_.retrieve_health()` 返回健康状态

#### Scenario: 健康检查失败

- **GIVEN** OpenCode 服务不可用
- **WHEN** 调用健康检查端点
- **THEN** 系统 MUST 返回不健康状态而非抛出异常

### Requirement: 自动化测试覆盖

系统 SHALL 提供覆盖 OpenCode 集成关键路径的自动化测试。

#### Scenario: 单元测试使用 mock

- **GIVEN** 测试环境无需实际 OpenCode 服务
- **WHEN** 运行单元测试
- **THEN** 测试 MUST 使用 `respx` 库 mock SDK 的 HTTP 请求

#### Scenario: 端到端测试可选执行

- **GIVEN** 测试标记为 `@pytest.mark.e2e`
- **WHEN** 运行标准测试命令
- **THEN** e2e 测试 MUST 默认跳过，除非显式启用

#### Scenario: 端到端测试验证完整流程

- **GIVEN** OpenCode 服务可用且 e2e 测试启用
- **WHEN** 执行端到端测试
- **THEN** 测试 MUST 验证从技能加载到执行完成的完整流程
