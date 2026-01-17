# Tasks: 添加 OpenCode Server 配置隔离

## 1. 配置目录结构

- [ ] 1.1 创建 `config/skills-runtime/` 目录
- [ ] 1.2 创建 `config/skills-runtime/opencode.json` 基础配置文件
- [ ] 1.3 创建 `config/skills-runtime/oh-my-opencode.json` 插件配置文件
- [ ] 1.4 创建 `config/skills-runtime/agents/skill-executor.md` 专用 agent

## 2. Settings 扩展

- [ ] 2.1 修改 `backend/src/utils/config.py` 添加新配置字段：
  - `opencode_auto_start: bool = False`
  - `opencode_server_port: int = 4096`
  - `opencode_server_hostname: str = "127.0.0.1"`
  - `opencode_config_dir: str = "config/skills-runtime"`
- [ ] 2.2 添加配置字段的单元测试

## 3. 服务器管理模块

- [ ] 3.1 创建 `backend/src/utils/opencode_server.py` 模块
- [ ] 3.2 实现 `OpencodeServerConfig` 数据类
  - 配置属性（config_dir, port, hostname, cors_origins）
  - `get_env()` 方法生成环境变量
  - `get_command()` 方法生成启动命令
- [ ] 3.3 实现 `OpencodeServerManager` 类
  - `start()` 异步方法启动服务器
  - `stop()` 异步方法停止服务器
  - `_wait_for_ready()` 私有方法等待服务器就绪
- [ ] 3.4 添加自定义异常类（`ServerStartupError`, `ConfigurationError`）
- [ ] 3.5 添加单元测试（mock subprocess）

## 4. FastAPI 生命周期集成

- [ ] 4.1 修改 `backend/src/main.py` 的 `lifespan` 函数
  - 条件启动 opencode server
  - 动态更新 `app.state.opencode_server_url`
  - 确保关闭时停止服务器
- [ ] 4.2 修改 `backend/src/utils/opencode.py` 支持动态 URL
- [ ] 4.3 添加集成测试验证生命周期

## 5. 验证和文档

- [ ] 5.1 端到端测试验证配置隔离生效
- [ ] 5.2 更新 `CLAUDE.md` 添加配置说明
- [ ] 5.3 更新 `.env.example` 添加新环境变量

## 依赖关系

```
1.1 ─┬─> 1.2 ─> 1.3 ─> 1.4
     │
2.1 ─┴─> 3.1 ─> 3.2 ─> 3.3 ─> 3.4 ─> 4.1 ─> 4.2
     │
2.2 ─┴─> 3.5 ─> 4.3 ─> 5.1 ─> 5.2 ─> 5.3
```

## 可并行任务

- 1.x 配置文件创建可与 2.x Settings 扩展并行
- 2.2 和 3.5 单元测试可在各自实现完成后并行
