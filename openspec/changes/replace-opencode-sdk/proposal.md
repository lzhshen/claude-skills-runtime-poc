# 变更：用正式 SDK 替换自定义 OpenCode 客户端实现

## 为什么

当前项目在 `backend/src/opencode/` 中维护了一个简化版的 OpenCode Python SDK，包括手动编写的 HTTP 客户端、会话管理和 SSE 事件解析。这种方式存在以下问题：

1. **维护成本高**：需要手动跟踪 OpenCode API 变更并更新客户端代码
2. **功能不完整**：仅实现了执行技能所需的最小 API 子集
3. **缺乏类型安全**：部分接口使用 `dict[str, Any]` 导致类型检查不完善
4. **测试覆盖不足**：当前没有针对 OpenCode 集成的自动化测试

现有 `/home/shen/dev/opencode-sdk-new` 是由 Stainless 生成的官方 SDK，提供完整的类型定义、错误处理、重试机制和异步支持。

## 变更内容

- **BREAKING**：移除 `backend/src/opencode/` 目录中的自定义实现
- 添加 `opencode_sdk_new` 作为项目依赖（本地路径引用或 git 依赖）
- 重构 `ExecutionService` 使用新 SDK 的 `AsyncOpencodeSDKNew` 客户端
- 适配新 SDK 的事件订阅机制（`client.event.get_events()` 或 SSE 流）
- 添加 OpenCode 集成的单元测试（使用 mock）
- 添加端到端测试（需要运行中的 OpenCode 服务）

## 影响

- **受影响规格**：`opencode-integration`（新建）
- **受影响代码**：
  - `backend/src/opencode/` - 完全移除
  - `backend/src/services/execution_service.py` - 主要重构
  - `backend/src/main.py` - 客户端初始化方式变更
  - `backend/src/api/health.py` - 健康检查适配
  - `backend/src/api/config.py` - 提供者/模型查询适配
  - `backend/pyproject.toml` - 添加依赖
