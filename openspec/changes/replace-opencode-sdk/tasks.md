# 任务清单：OpenCode SDK 迁移

## 1. 准备工作 ✅ 已完成

- [x] 1.1 研究新 SDK 的会话 API 参数（`session.create`, `session.send_async_message`）
- [x] 1.2 研究新 SDK 的事件订阅机制（确认支持 SSE 流）
- [x] 1.3 确定依赖引入方式（Git URL 依赖）

## 2. 添加依赖

- [ ] 2.1 更新 `backend/pyproject.toml` 添加 Git URL 依赖：
  ```toml
  "opencode-sdk-new @ git+ssh://git@github.com/lzhshen/opencode-sdk-new.git@d58fd94"
  ```
- [ ] 2.2 运行 `pip install -e .` 验证依赖安装成功
- [ ] 2.3 验证 `from opencode_sdk_new import AsyncOpencodeSDKNew` 可正常导入

## 3. 创建客户端工厂函数

- [ ] 3.1 创建 `backend/src/utils/opencode.py`，实现 `get_opencode_client()` 工厂函数（约 10 行）

## 4. 重构 ExecutionService

- [ ] 4.1 替换 `OpencodeClient` 导入为新的适配器
- [ ] 4.2 重构 `_execute_skill` 中的会话创建逻辑
- [ ] 4.3 重构事件订阅逻辑（使用 `AsyncStream[Event]`）
- [ ] 4.4 重构提示发送逻辑（使用 `send_async_message` + `system` 参数）
- [ ] 4.5 更新事件解析代码以匹配新 SDK 的强类型 Event 对象

## 5. 更新其他集成点

- [ ] 5.1 更新 `backend/src/main.py` 的客户端初始化
- [ ] 5.2 更新 `backend/src/api/health.py` 的健康检查（使用 `global_.retrieve_health()`）
- [ ] 5.3 更新 `backend/src/api/config.py` 的提供者/模型查询

## 6. 移除旧实现

- [ ] 6.1 删除 `backend/src/opencode/client.py`
- [ ] 6.2 删除 `backend/src/opencode/session.py`
- [ ] 6.3 删除 `backend/src/opencode/events.py`
- [ ] 6.4 删除 `backend/src/opencode/models.py`
- [ ] 6.5 删除 `backend/src/opencode/config.py`
- [ ] 6.6 删除整个 `backend/src/opencode/` 目录

## 7. 添加单元测试（依赖：任务 4 完成）

- [ ] 7.1 创建 `backend/tests/unit/test_opencode_adapter.py`
- [ ] 7.2 使用 `respx` mock HTTP 响应测试客户端初始化
- [ ] 7.3 添加 `ExecutionService` 核心流程的 mock 测试
- [ ] 7.4 添加错误处理和超时测试

## 8. 添加端到端测试（依赖：任务 4、5 完成）

- [ ] 8.1 创建 `backend/tests/e2e/test_skill_execution.py`
- [ ] 8.2 创建 pytest fixture 检查 OpenCode 服务可用性
- [ ] 8.3 实现基本技能执行的端到端测试
- [ ] 8.4 添加 `@pytest.mark.e2e` 标记，配置默认跳过
- [ ] 8.5 更新 pytest.ini 或 pyproject.toml 添加 e2e marker

## 9. 验证和清理

- [ ] 9.1 运行 `ruff check` 检查代码风格
- [ ] 9.2 运行 `mypy src` 验证类型检查通过
- [ ] 9.3 运行完整测试套件
- [ ] 9.4 更新 `AGENTS.md` 如有需要

## 并行化说明

- **任务 1** ✅ 已完成
- **任务 3** 依赖任务 2 完成
- **任务 4、5** 可在任务 3 完成后并行进行
- **任务 6** 必须在任务 4、5 完成且验证通过后进行
- **任务 7、8** 可并行进行，但都依赖任务 4 完成

## Git URL 依赖说明

仓库地址：`git@github.com:lzhshen/opencode-sdk-new.git`
当前锁定版本：`d58fd94` (initial commit)

更新依赖版本：
```bash
# 更新到最新
pip install -e . --upgrade

# 或指定新的 commit/tag
# 修改 pyproject.toml 中的 @d58fd94 为新版本
```
