# 任务清单: Claude Skills 运行时框架与测试 Web 应用

**输入**: `/specs/003-skills-runtime/` 目录下的设计文档
**前置条件**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/backend-api.md ✅, quickstart.md ✅

**测试**: 按照 plan.md 中提到的 TDD 方法，测试已包含在任务中。

**组织方式**: 任务按用户故事分组，以支持每个故事的独立实现和测试。

## 格式: `[ID] [P?] [Story] 描述`

- **[P]**: 可并行执行（不同文件，无依赖）
- **[Story]**: 该任务所属的用户故事（如 US1, US2, US3）
- 描述中包含确切的文件路径

## 路径约定

- **后端**: `backend/src/`, `backend/tests/`
- **前端**: `frontend/src/`, `frontend/tests/`
- **opencode 客户端**: `backend/src/opencode/`

---

## 第一阶段: 项目初始化（共享基础设施）

**目的**: 项目初始化和基本结构

- [X] T001 创建后端项目结构: `backend/src/{models,services,api,opencode,utils}/`
- [X] T002 [P] 在 `backend/` 中初始化 Python 项目，包含 pyproject.toml 和 requirements.txt
- [X] T003 [P] 创建前端项目结构: `frontend/src/{components,pages,services,hooks,types}/`
- [X] T004 [P] 在 `frontend/` 中初始化 React + Vite + TypeScript 项目
- [X] T005 [P] 在 `frontend/tailwind.config.js` 中配置 TailwindCSS
- [X] T006 [P] 在 `backend/pyproject.toml` 中配置 Python 代码检查工具（ruff, black, isort, mypy）
- [X] T007 [P] 在 `frontend/` 中配置 ESLint 和 Prettier
- [X] T008 [P] 创建环境配置文件: `backend/.env.example`, `frontend/.env.example`
- [X] T009 [P] 在 `backend/pyproject.toml` 中配置 pytest
- [X] T010 [P] 在 `frontend/vite.config.ts` 中配置 Vitest

---

## 第二阶段: 基础设施（阻塞性前置条件）

**目的**: 必须在任何用户故事实现之前完成的核心基础设施

**⚠️ 关键**: 在此阶段完成之前，不能开始任何用户故事的工作

### 后端核心

- [X] T011 在 `backend/src/models/enums.py` 中创建基础 Pydantic 模型和枚举（ValidationStatus, FileType, ErrorCode, ExecutionStatus, LogType, MessageRole, ToolCallStatus）
- [X] T012 [P] 在 `backend/src/models/validation.py` 中创建 ValidationError 模型
- [X] T013 [P] 在 `backend/src/models/skill_file.py` 中创建 SkillFile 模型
- [X] T014 [P] 在 `backend/src/models/skill_metadata.py` 中创建 SkillMetadata 模型
- [X] T015 在 `backend/src/models/skill_package.py` 中创建 SkillPackage 模型（依赖 T012, T013, T014）
- [X] T016 [P] 在 `backend/src/models/execution.py` 中创建 Message 和 ToolCall 模型
- [X] T017 [P] 在 `backend/src/models/log_content.py` 中创建 LogContent 联合类型
- [X] T018 在 `backend/src/models/execution.py` 中创建 ExecutionSession, ExecutionResult, ExecutionError, ExecutionLog 模型（依赖 T016, T017）
- [X] T019 在 `backend/src/models/__init__.py` 中创建包含所有导出的模型索引
- [X] T020 [P] 在 `backend/src/main.py` 中创建带有 CORS 中间件的 FastAPI 应用
- [X] T021 [P] 在 `backend/src/api/__init__.py` 中创建 API 路由结构
- [X] T022 [P] 在 `backend/src/utils/errors.py` 中创建错误处理工具和异常类
- [X] T023 [P] 在 `backend/src/utils/config.py` 中创建配置管理（环境变量加载）

### opencode Python 客户端

- [X] T024 在 `backend/src/opencode/models.py` 中创建 opencode 客户端 Pydantic 模型
- [X] T025 [P] 在 `backend/src/opencode/events.py` 中创建 SSE 事件流处理器
- [X] T026 [P] 在 `backend/src/opencode/session.py` 中创建会话 API 封装
- [X] T027 [P] 在 `backend/src/opencode/config.py` 中创建配置 API 封装
- [X] T028 在 `backend/src/opencode/client.py` 中创建主 OpencodeClient 类（依赖 T024, T025, T026, T027）
- [X] T029 在 `backend/src/opencode/__init__.py` 中创建 opencode 客户端导出

### 前端核心

- [X] T030 [P] 在 `frontend/src/types/models.ts` 中创建 API 模型的 TypeScript 类型
- [X] T031 [P] 在 `frontend/src/types/api.ts` 中创建 API 响应的 TypeScript 类型
- [X] T032 [P] 在 `frontend/src/services/api.ts` 中创建带有 fetch 封装的基础 API 服务
- [X] T033 [P] 在 `frontend/src/hooks/useAppState.tsx` 中创建应用状态的 React Context
- [X] T034 [P] 在 `frontend/src/App.tsx` 中创建带有路由的主 App 组件
- [X] T035 在 `frontend/src/pages/MainPage.tsx` 中创建主页面布局组件

### 健康检查端点

- [X] T036 在 `backend/src/api/health.py` 中实现 GET /health 端点
- [X] T037 在 `backend/tests/contract/test_health.py` 中编写健康检查端点的契约测试

**检查点**: 基础设施就绪 - 现在可以开始用户故事实现

---

## 第三阶段: 用户故事 1 - 上传和验证技能包（优先级: P1）🎯 MVP

**目标**: 用户可以上传 Claude Skills zip 包并获得带有清晰错误消息的验证结果

**独立测试**: 上传各种有效和无效的技能包，验证结果准确且可操作

### 用户故事 1 的测试 ⚠️

> **注意: 先编写这些测试，确保在实现之前测试失败**

- [X] T038 [P] [US1] 在 `backend/tests/contract/test_upload.py` 中编写 POST /skills/upload 的契约测试
- [X] T039 [P] [US1] 在 `backend/tests/contract/test_skill_get.py` 中编写 GET /skills/{skill_id} 的契约测试
- [X] T040 [P] [US1] 在 `backend/tests/unit/test_zip_extractor.py` 中编写 zip 解压的单元测试
- [X] T041 [P] [US1] 在 `backend/tests/unit/test_skill_validator.py` 中编写 SKILL.md 验证的单元测试
- [X] T042 [P] [US1] 在 `backend/tests/unit/test_yaml_parser.py` 中编写 YAML frontmatter 解析的单元测试
- [x] T043 [P] [US1] 在 `frontend/tests/components/UploadZone.test.tsx` 中编写 UploadZone 的前端组件测试

### 用户故事 1 的实现

- [X] T044 [US1] 在 `backend/src/utils/zip_extractor.py` 中创建 zip 解压工具（最大 10MB，zip 炸弹防护，路径遍历防护）
- [X] T045 [US1] 在 `backend/src/utils/yaml_parser.py` 中创建 YAML frontmatter 解析工具
- [X] T046 [US1] 在 `backend/src/services/skill_validator.py` 中创建 SKILL.md 验证器（依赖 T044, T045）
- [X] T047 [US1] 在 `backend/src/utils/file_utils.py` 中创建文件类型检测工具（二进制检测，从扩展名判断文件类型）
- [X] T048 [US1] 在 `backend/src/services/skill_storage.py` 中创建内存技能包存储服务
- [X] T049 [US1] 在 `backend/src/services/skill_service.py` 中创建技能包管理服务（依赖 T046, T047, T048）
- [X] T050 [US1] 在 `backend/src/api/skills.py` 中实现 POST /skills/upload 端点（依赖 T049）；必须验证文件大小不超过 10MB，超出返回 413 错误
- [X] T051 [US1] 在 `backend/src/api/skills.py` 中实现 GET /skills/{skill_id} 端点
- [X] T052 [US1] 在 `backend/src/api/skills.py` 中实现 DELETE /skills/{skill_id} 端点
- [X] T053 [P] [US1] 在 `frontend/src/components/upload/UploadZone.tsx` 中创建带有拖放功能的 UploadZone 组件
- [X] T054 [P] [US1] 在 `frontend/src/components/upload/ValidationResult.tsx` 中创建 ValidationResult 组件
- [X] T055 [P] [US1] 在 `frontend/src/components/upload/SkillMetadataCard.tsx` 中创建 SkillMetadataCard 组件
- [X] T056 [US1] 在 `frontend/src/services/skillsApi.ts` 中创建技能 API 服务
- [X] T057 [US1] 在 `frontend/src/hooks/useSkillUpload.ts` 中创建 useSkillUpload hook
- [X] T058 [US1] 在 `frontend/src/pages/MainPage.tsx` 中集成上传组件

**检查点**: 用户故事 1 完成 - 用户可以上传和验证技能包

---

## 第四阶段: 用户故事 2 - 浏览和预览技能内容（优先级: P2）

**目标**: 用户可以查看上传技能包的目录树和文件内容，支持语法高亮

**独立测试**: 上传包含多个文件和目录的技能包，浏览树视图并打开文件以验证内容正确显示

### 用户故事 2 的测试 ⚠️

- [x] T059 [P] [US2] 在 `backend/tests/contract/test_file_tree.py` 中编写 GET /skills/{skill_id}/files 的契约测试
- [x] T060 [P] [US2] 在 `backend/tests/contract/test_file_content.py` 中编写 GET /skills/{skill_id}/files/{file_path} 的契约测试
- [x] T061 [P] [US2] 在 `frontend/tests/components/FileTree.test.tsx` 中编写 FileTree 的前端组件测试
- [x] T062 [P] [US2] 在 `frontend/tests/components/FilePreview.test.tsx` 中编写 FilePreview 的前端组件测试

### 用户故事 2 的实现

- [X] T063 [US2] 在 `backend/src/utils/file_tree.py` 中创建文件树构建工具
- [X] T064 [US2] 在 `backend/src/api/skills.py` 中实现 GET /skills/{skill_id}/files 端点（依赖 T063）
- [X] T065 [US2] 在 `backend/src/api/skills.py` 中实现 GET /skills/{skill_id}/files/{file_path} 端点
- [X] T066 [P] [US2] 在 `frontend/src/components/explorer/FileTree.tsx` 中使用 react-arborist 创建 FileTree 组件
- [X] T067 [P] [US2] 在 `frontend/src/components/explorer/FileTreeNode.tsx` 中创建 FileTreeNode 组件
- [X] T068 [US2] 在 `frontend/src/components/explorer/FilePreview.tsx` 中创建带有语法高亮的 FilePreview 组件；对于二进制文件显示"不可预览"提示和文件大小信息
- [X] T069 [US2] 在 `frontend/src/components/explorer/SkillMetadataViewer.tsx` 中创建 SkillMetadataViewer 组件（结构化 YAML 显示）
- [X] T070 [US2] 在 `frontend/src/hooks/useFileExplorer.ts` 中创建 useFileExplorer hook
- [X] T071 [US2] 在 `frontend/src/pages/MainPage.tsx` 中集成浏览器组件

**检查点**: 用户故事 1 和 2 完成 - 用户可以上传、验证、浏览和预览技能内容

---

## 第五阶段: 用户故事 3 - 编辑和重新打包技能（优先级: P3）

**目标**: 用户可以直接在浏览器中编辑技能文件并下载更新后的 zip 包

**独立测试**: 上传技能，修改 SKILL.md 内容，重新打包并验证下载的 zip 包含更改

### 用户故事 3 的测试 ⚠️

- [x] T072 [P] [US3] 在 `backend/tests/contract/test_file_update.py` 中编写 PUT /skills/{skill_id}/files/{file_path} 的契约测试
- [x] T073 [P] [US3] 在 `backend/tests/contract/test_repack.py` 中编写 POST /skills/{skill_id}/repack 的契约测试
- [x] T074 [P] [US3] 在 `backend/tests/contract/test_download.py` 中编写 GET /skills/{skill_id}/download 的契约测试
- [x] T075 [P] [US3] 在 `frontend/tests/components/CodeEditor.test.tsx` 中编写 CodeEditor 的前端组件测试

### 用户故事 3 的实现

- [X] T076 [US3] 在 `backend/src/utils/zip_repacker.py` 中创建 zip 重新打包工具
- [X] T077 [US3] 在 `backend/src/api/skills.py` 中实现 PUT /skills/{skill_id}/files/{file_path} 端点
- [X] T078 [US3] 在 `backend/src/api/skills.py` 中实现 POST /skills/{skill_id}/repack 端点（依赖 T076）
- [X] T079 [US3] 在 `backend/src/api/skills.py` 中实现 GET /skills/{skill_id}/download 端点
- [X] T080 [US3] 在 `frontend/src/components/editor/CodeEditor.tsx` 中使用 Monaco Editor 创建 CodeEditor 组件
- [X] T081 [US3] 在 `frontend/src/components/editor/EditorToolbar.tsx` 中创建 EditorToolbar 组件（保存、还原按钮）
- [X] T082 [US3] 在 `frontend/src/components/editor/UnsavedChangesIndicator.tsx` 中创建 UnsavedChangesIndicator 组件
- [X] T083 [US3] 在 `frontend/src/hooks/useFileEditor.ts` 中创建带有未保存更改追踪的 useFileEditor hook
- [X] T084 [US3] 在 `frontend/src/components/editor/RepackButton.tsx` 中创建带有下载触发的 RepackButton 组件
- [X] T085 [US3] 在 `frontend/src/hooks/useUnsavedChangesWarning.ts` 中添加未保存更改警告提示
- [X] T086 [US3] 在 `frontend/src/pages/MainPage.tsx` 中集成编辑器组件

**检查点**: 用户故事 1、2 和 3 完成 - 用户可以上传、浏览、编辑和重新打包技能

---

## 第六阶段: 用户故事 4 - 使用 opencode 运行时运行技能（优先级: P4）

**目标**: 用户可以使用 opencode 运行时执行上传的技能，支持实时进度显示和取消功能

**独立测试**: 上传有效技能，提供测试提示词，执行并观察流式输出是否符合预期行为

### 用户故事 4 的测试 ⚠️

- [x] T087 [P] [US4] 在 `backend/tests/contract/test_execute.py` 中编写 POST /skills/{skill_id}/execute 的契约测试
- [x] T088 [P] [US4] 在 `backend/tests/contract/test_stream.py` 中编写 GET /executions/{session_id}/stream (SSE) 的契约测试
- [x] T089 [P] [US4] 在 `backend/tests/contract/test_cancel.py` 中编写 POST /executions/{session_id}/cancel 的契约测试
- [x] T090 [P] [US4] 在 `backend/tests/contract/test_providers.py` 中编写 GET /config/providers 的契约测试
- [X] T091 [P] [US4] 在 `backend/tests/unit/test_opencode_session.py` 中编写 opencode 客户端会话管理的单元测试
- [x] T092 [P] [US4] 在 `frontend/tests/components/SkillRunner.test.tsx` 中编写 SkillRunner 的前端组件测试

### 用户故事 4 的实现

- [X] T093 [US4] 在 `backend/src/services/execution_storage.py` 中创建执行会话存储服务
- [X] T094 [US4] 在 `backend/src/services/execution_service.py` 中创建技能执行服务（与 opencode 客户端集成）；必须实现 5 分钟执行超时，超时后自动终止并返回超时错误
- [X] T095 [US4] 在 `backend/src/api/executions.py` 中实现 POST /skills/{skill_id}/execute 端点（依赖 T094）
- [X] T096 [US4] 在 `backend/src/api/executions.py` 中实现 GET /executions/{session_id}/stream SSE 端点
- [X] T097 [US4] 在 `backend/src/api/executions.py` 中实现 POST /executions/{session_id}/cancel 端点
- [X] T098 [US4] 在 `backend/src/api/config.py` 中实现 GET /config/providers 端点
- [X] T099 [US4] 在 `backend/src/api/config.py` 中实现 GET /config/agents 端点
- [X] T100 [P] [US4] 在 `frontend/src/components/runner/PromptInput.tsx` 中创建 PromptInput 组件
- [X] T101 [P] [US4] 在 `frontend/src/components/runner/ModelSelector.tsx` 中创建 ModelSelector 组件
- [X] T102 [P] [US4] 在 `frontend/src/components/runner/RunButton.tsx` 中创建 RunButton 组件
- [X] T103 [US4] 在 `frontend/src/components/runner/ExecutionProgress.tsx` 中创建 ExecutionProgress 组件（流式显示）
- [X] T104 [US4] 在 `frontend/src/components/runner/CancelButton.tsx` 中创建 CancelButton 组件
- [X] T105 [US4] 在 `frontend/src/services/executionsApi.ts` 中创建带有 SSE 支持的执行 API 服务
- [X] T106 [US4] 在 `frontend/src/hooks/useSkillExecution.ts` 中创建 useSkillExecution hook
- [X] T107 [US4] 在 `frontend/src/components/runner/SkillRunner.tsx` 中创建 SkillRunner 页面/面板
- [X] T108 [US4] 在 `frontend/src/pages/MainPage.tsx` 中集成运行器组件

**检查点**: 用户故事 1-4 完成 - 用户可以上传、浏览、编辑和运行技能

---

## 第七阶段: 用户故事 5 - 查看执行日志和结果（优先级: P5）

**目标**: 用户可以查看详细的执行日志、工具调用和执行历史，用于调试

**独立测试**: 运行具有已知行为的技能，验证日志捕获所有预期的事件、工具调用和响应

### 用户故事 5 的测试 ⚠️

- [x] T109 [P] [US5] 在 `backend/tests/contract/test_execution_detail.py` 中编写 GET /executions/{session_id} 的契约测试
- [x] T110 [P] [US5] 在 `backend/tests/contract/test_logs.py` 中编写 GET /executions/{session_id}/logs 的契约测试
- [x] T111 [P] [US5] 在 `backend/tests/contract/test_execution_list.py` 中编写 GET /executions 的契约测试
- [x] T112 [P] [US5] 在 `frontend/tests/components/ExecutionLogs.test.tsx` 中编写 ExecutionLogs 的前端组件测试

### 用户故事 5 的实现

- [X] T113 [US5] 在 `backend/src/api/executions.py` 中实现 GET /executions/{session_id} 端点
- [X] T114 [US5] 在 `backend/src/api/executions.py` 中实现 GET /executions/{session_id}/logs 端点
- [X] T115 [US5] 在 `backend/src/api/executions.py` 中实现 GET /executions 端点（历史列表）
- [X] T116 [P] [US5] 在 `frontend/src/components/logs/ConversationHistory.tsx` 中创建 ConversationHistory 组件
- [X] T117 [P] [US5] 在 `frontend/src/components/logs/ToolCallViewer.tsx` 中创建 ToolCallViewer 组件
- [X] T118 [P] [US5] 在 `frontend/src/components/logs/ErrorDisplay.tsx` 中创建 ErrorDisplay 组件
- [X] T119 [US5] 在 `frontend/src/components/logs/ExecutionHistoryList.tsx` 中创建 ExecutionHistoryList 组件
- [X] T120 [US5] 在 `frontend/src/components/logs/ExecutionDetailPanel.tsx` 中创建 ExecutionDetailPanel 组件
- [X] T121 [US5] 在 `frontend/src/hooks/useExecutionLogs.ts` 中创建 useExecutionLogs hook
- [X] T122 [US5] 在 `frontend/src/pages/MainPage.tsx` 中集成日志组件

**检查点**: 所有用户故事（1-5）完成 - 完整功能实现完毕

---

## 第八阶段: 优化与跨领域关注点

**目的**: 影响多个用户故事的改进

- [x] T123 [P] 在 `backend/src/api/` 中为所有 API 端点添加全面的错误处理
- [X] T124 [P] 在 `backend/src/main.py` 中添加请求日志中间件
- [X] T125 [P] 在 `frontend/src/components/ErrorBoundary.tsx` 中添加前端错误边界
- [X] T126 [P] 在前端组件中添加加载状态和骨架屏
- [X] T127 [P] 在 `frontend/src/index.css` 中添加响应式设计调整
- [X] T128 [P] 在 `backend/Dockerfile` 中创建后端 Docker 配置
- [X] T129 [P] 在 `frontend/Dockerfile` 中创建前端 Docker 配置
- [X] T130 创建用于开发环境的 docker-compose.yml
- [x] T131 运行 quickstart.md 验证 - 确认所有步骤都能正常工作
- [x] T132 [P] 在 `backend/tests/integration/` 中添加完整用户工作流的集成测试
- [x] T133 代码清理和最终重构

---

## 依赖关系与执行顺序

### 阶段依赖

- **项目初始化（第一阶段）**: 无依赖 - 可立即开始
- **基础设施（第二阶段）**: 依赖项目初始化完成 - 阻塞所有用户故事
- **用户故事（第三至七阶段）**: 全部依赖基础设施阶段完成
  - 用户故事可按优先级顺序进行（P1 → P2 → P3 → P4 → P5）
  - 每个故事内的后端和前端工作可部分并行
- **优化（第八阶段）**: 依赖所有期望的用户故事完成

### 用户故事依赖

- **用户故事 1 (P1)**: 可在基础设施（第二阶段）完成后开始 - 不依赖其他故事
- **用户故事 2 (P2)**: 需要 US1 完成（需要技能包才能浏览）
- **用户故事 3 (P3)**: 需要 US2 完成（需要文件浏览功能才能编辑）
- **用户故事 4 (P4)**: 需要 US1 完成（需要有效的技能包才能执行）
- **用户故事 5 (P5)**: 需要 US4 完成（需要执行结果才能查看日志）

### 每个用户故事内部

- 测试必须先编写并确保失败，然后再实现
- 后端模型先于服务
- 服务先于端点
- 前端 API 服务先于 hooks
- Hooks 先于组件
- 组件先于页面集成

### 并行机会

- 所有标记 [P] 的项目初始化任务可并行运行
- 所有标记 [P] 的基础设施任务可并行运行（在第二阶段内）
- 一个故事内的后端和前端工作可大部分并行
- 一个用户故事中所有标记 [P] 的测试可并行运行
- 标记 [P] 的前端组件可并行运行

---

## 并行示例: 用户故事 1

```bash
# 同时启动用户故事 1 的所有测试:
Task: "在 backend/tests/contract/test_upload.py 中编写 POST /skills/upload 的契约测试"
Task: "在 backend/tests/contract/test_skill_get.py 中编写 GET /skills/{skill_id} 的契约测试"
Task: "在 backend/tests/unit/test_zip_extractor.py 中编写 zip 解压的单元测试"
Task: "在 backend/tests/unit/test_skill_validator.py 中编写 SKILL.md 验证的单元测试"
Task: "在 backend/tests/unit/test_yaml_parser.py 中编写 YAML frontmatter 解析的单元测试"
Task: "在 frontend/tests/components/UploadZone.test.tsx 中编写 UploadZone 的前端组件测试"

# 并行启动前端组件:
Task: "在 frontend/src/components/upload/UploadZone.tsx 中创建带有拖放功能的 UploadZone 组件"
Task: "在 frontend/src/components/upload/ValidationResult.tsx 中创建 ValidationResult 组件"
Task: "在 frontend/src/components/upload/SkillMetadataCard.tsx 中创建 SkillMetadataCard 组件"
```

---

## 实施策略

### MVP 优先（仅用户故事 1）

1. 完成第一阶段: 项目初始化
2. 完成第二阶段: 基础设施（关键 - 阻塞所有故事）
3. 完成第三阶段: 用户故事 1
4. **停止并验证**: 独立测试用户故事 1
5. 如果就绪则部署/演示

### 增量交付

1. 完成项目初始化 + 基础设施 → 基础就绪
2. 添加用户故事 1 → 独立测试 → 部署/演示（MVP！）
3. 添加用户故事 2 → 独立测试 → 部署/演示
4. 添加用户故事 3 → 独立测试 → 部署/演示
5. 添加用户故事 4 → 独立测试 → 部署/演示
6. 添加用户故事 5 → 独立测试 → 部署/演示
7. 每个故事都在不破坏之前故事的情况下增加价值

### 建议的 MVP 范围

**MVP = 第一阶段 + 第二阶段 + 第三阶段（用户故事 1）**

这提供：
- 技能包上传
- 带有清晰错误消息的验证
- 基本元数据显示

用户可以立即开始验证他们的技能包。

---

## 备注

- [P] 任务 = 不同文件，无依赖
- [Story] 标签将任务映射到特定用户故事以便追溯
- 每个用户故事应可独立完成和测试
- 实现前验证测试失败
- 每个任务或逻辑组完成后提交
- 在任何检查点停止以独立验证故事
- 避免：模糊的任务、同一文件冲突、破坏独立性的跨故事依赖

---

## 摘要

| 阶段 | 任务数量 | 描述 |
|------|----------|------|
| 第一阶段: 项目初始化 | 10 | 项目初始化 |
| 第二阶段: 基础设施 | 27 | 核心基础设施 |
| 第三阶段: US1 - 上传与验证 | 21 | P1 - MVP |
| 第四阶段: US2 - 浏览与预览 | 13 | P2 |
| 第五阶段: US3 - 编辑与重新打包 | 15 | P3 |
| 第六阶段: US4 - 运行技能 | 22 | P4 |
| 第七阶段: US5 - 查看日志 | 14 | P5 |
| 第八阶段: 优化 | 11 | 跨领域关注点 |
| **总计** | **133** | |

**并行机会**: 67 个任务标记 [P]
**测试任务**: 32 个（包括契约测试、单元测试、组件测试）
