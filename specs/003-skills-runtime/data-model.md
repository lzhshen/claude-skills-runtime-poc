# Data Model: Claude Skills 运行时框架与测试 Web 应用

**Date**: 2026-01-08 | **Branch**: `003-skills-runtime`

## 概述

本文档定义了系统的核心数据模型，涵盖技能包管理、执行会话和日志记录。

---

## 实体关系图

```
┌─────────────────┐       1:N      ┌─────────────────┐
│  SkillPackage   │───────────────▶│    SkillFile    │
└─────────────────┘                └─────────────────┘
        │
        │ 1:1
        ▼
┌─────────────────┐
│  SkillMetadata  │
└─────────────────┘
        │
        │ 1:N
        ▼
┌─────────────────┐       1:N      ┌─────────────────┐
│ExecutionSession │───────────────▶│  ExecutionLog   │
└─────────────────┘                └─────────────────┘
```

---

## 实体定义

### 1. SkillPackage（技能包）

表示已上传和解压的技能包。

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | string (UUID) | ✅ | 唯一标识符 |
| `original_filename` | string | ✅ | 上传时的原始文件名 |
| `extracted_path` | string | ✅ | 解压后的文件系统路径 |
| `validation_status` | ValidationStatus | ✅ | 验证状态 |
| `validation_errors` | ValidationError[] | ❌ | 验证错误列表（如有） |
| `files` | SkillFile[] | ✅ | 包含的文件列表 |
| `metadata` | SkillMetadata | ❌ | 解析后的技能元数据（验证通过时） |
| `uploaded_at` | datetime | ✅ | 上传时间戳 |
| `size_bytes` | integer | ✅ | 原始 zip 文件大小 |

**ValidationStatus 枚举**:
```
PENDING    = "pending"     # 验证中
VALID      = "valid"       # 验证通过
INVALID    = "invalid"     # 验证失败
```

**Python 示例**:
```python
from pydantic import BaseModel
from datetime import datetime
from enum import Enum
from typing import Optional
import uuid

class ValidationStatus(str, Enum):
    PENDING = "pending"
    VALID = "valid"
    INVALID = "invalid"

class SkillPackage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    original_filename: str
    extracted_path: str
    validation_status: ValidationStatus = ValidationStatus.PENDING
    validation_errors: list["ValidationError"] = []
    files: list["SkillFile"] = []
    metadata: Optional["SkillMetadata"] = None
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    size_bytes: int
```

---

### 2. SkillFile（技能文件）

表示技能包中的单个文件。

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `path` | string | ✅ | 相对于技能包根目录的路径 |
| `name` | string | ✅ | 文件名 |
| `file_type` | FileType | ✅ | 文件类型 |
| `size_bytes` | integer | ✅ | 文件大小 |
| `content` | string | ❌ | 文件内容（仅文本文件） |
| `is_modified` | boolean | ✅ | 是否已被用户修改 |
| `original_hash` | string | ✅ | 原始内容的 MD5 哈希 |
| `is_binary` | boolean | ✅ | 是否为二进制文件 |

**FileType 枚举**:
```
MARKDOWN   = "markdown"    # .md 文件
YAML       = "yaml"        # .yaml, .yml 文件
TEXT       = "text"        # 其他文本文件
BINARY     = "binary"      # 二进制文件
DIRECTORY  = "directory"   # 目录
```

**Python 示例**:
```python
class FileType(str, Enum):
    MARKDOWN = "markdown"
    YAML = "yaml"
    TEXT = "text"
    BINARY = "binary"
    DIRECTORY = "directory"

class SkillFile(BaseModel):
    path: str
    name: str
    file_type: FileType
    size_bytes: int
    content: Optional[str] = None
    is_modified: bool = False
    original_hash: str
    is_binary: bool = False
```

---

### 3. SkillMetadata（技能元数据）

表示从 SKILL.md 解析的元数据。

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `name` | string | ✅ | 技能名称（来自 YAML frontmatter） |
| `description` | string | ✅ | 技能描述（来自 YAML frontmatter） |
| `raw_content` | string | ✅ | SKILL.md 的完整原始内容 |
| `instruction` | string | ✅ | 技能指令（frontmatter 之后的 markdown 内容） |
| `extra_fields` | dict | ❌ | YAML frontmatter 中的其他字段 |

**Python 示例**:
```python
class SkillMetadata(BaseModel):
    name: str
    description: str
    raw_content: str
    instruction: str
    extra_fields: dict = {}
```

---

### 4. ValidationError（验证错误）

表示验证过程中发现的错误。

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `code` | ErrorCode | ✅ | 错误代码 |
| `message` | string | ✅ | 用户可读的错误消息 |
| `suggestion` | string | ❌ | 修复建议 |
| `field` | string | ❌ | 相关字段（如适用） |

**ErrorCode 枚举**:
```
INVALID_ZIP           = "INVALID_ZIP"           # 无效的 zip 文件
MISSING_SKILL_MD      = "MISSING_SKILL_MD"      # 缺少 SKILL.md
INVALID_YAML          = "INVALID_YAML"          # YAML 解析失败
MISSING_NAME          = "MISSING_NAME"          # 缺少 name 字段
MISSING_DESCRIPTION   = "MISSING_DESCRIPTION"   # 缺少 description 字段
FILE_TOO_LARGE        = "FILE_TOO_LARGE"        # 文件超过大小限制
```

**Python 示例**:
```python
class ErrorCode(str, Enum):
    INVALID_ZIP = "INVALID_ZIP"
    MISSING_SKILL_MD = "MISSING_SKILL_MD"
    INVALID_YAML = "INVALID_YAML"
    MISSING_NAME = "MISSING_NAME"
    MISSING_DESCRIPTION = "MISSING_DESCRIPTION"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"

class ValidationError(BaseModel):
    code: ErrorCode
    message: str
    suggestion: Optional[str] = None
    field: Optional[str] = None
```

---

### 5. ExecutionSession（执行会话）

表示单次技能执行运行。

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | string (UUID) | ✅ | 唯一标识符 |
| `skill_package_id` | string | ✅ | 关联的技能包 ID |
| `skill_name` | string | ✅ | 技能名称（冗余存储，便于显示） |
| `user_prompt` | string | ✅ | 用户输入的测试提示 |
| `status` | ExecutionStatus | ✅ | 执行状态 |
| `started_at` | datetime | ✅ | 开始时间 |
| `ended_at` | datetime | ❌ | 结束时间（执行完成时） |
| `duration_ms` | integer | ❌ | 执行持续时间（毫秒） |
| `result` | ExecutionResult | ❌ | 执行结果（完成时） |
| `error` | ExecutionError | ❌ | 错误信息（失败时） |
| `opencode_session_id` | string | ❌ | opencode 会话 ID |

**ExecutionStatus 枚举**:
```
PENDING    = "pending"     # 等待执行
RUNNING    = "running"     # 执行中
COMPLETED  = "completed"   # 执行完成
FAILED     = "failed"      # 执行失败
CANCELLED  = "cancelled"   # 用户取消
TIMEOUT    = "timeout"     # 执行超时
```

**Python 示例**:
```python
class ExecutionStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMEOUT = "timeout"

class ExecutionSession(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    skill_package_id: str
    skill_name: str
    user_prompt: str
    status: ExecutionStatus = ExecutionStatus.PENDING
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    result: Optional["ExecutionResult"] = None
    error: Optional["ExecutionError"] = None
    opencode_session_id: Optional[str] = None
```

---

### 6. ExecutionResult（执行结果）

表示成功执行的结果。

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `response` | string | ✅ | AI 智能体的最终响应 |
| `messages` | Message[] | ✅ | 完整的对话消息列表 |
| `tool_calls_count` | integer | ✅ | 工具调用总数 |

**Python 示例**:
```python
class ExecutionResult(BaseModel):
    response: str
    messages: list["Message"] = []
    tool_calls_count: int = 0
```

---

### 7. ExecutionError（执行错误）

表示执行失败的错误信息。

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `code` | string | ✅ | 错误代码 |
| `message` | string | ✅ | 错误消息 |
| `stack_trace` | string | ❌ | 堆栈跟踪（如有） |
| `occurred_at` | datetime | ✅ | 发生时间 |

**Python 示例**:
```python
class ExecutionError(BaseModel):
    code: str
    message: str
    stack_trace: Optional[str] = None
    occurred_at: datetime = Field(default_factory=datetime.utcnow)
```

---

### 8. ExecutionLog（执行日志）

表示执行过程中的单条日志记录。

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | string (UUID) | ✅ | 唯一标识符 |
| `session_id` | string | ✅ | 关联的执行会话 ID |
| `timestamp` | datetime | ✅ | 日志时间戳 |
| `log_type` | LogType | ✅ | 日志类型 |
| `content` | LogContent | ✅ | 日志内容（根据类型不同） |

**LogType 枚举**:
```
MESSAGE      = "message"       # 对话消息
TOOL_CALL    = "tool_call"     # 工具调用
TOOL_RESULT  = "tool_result"   # 工具结果
ERROR        = "error"         # 错误
SYSTEM       = "system"        # 系统消息
```

**Python 示例**:
```python
class LogType(str, Enum):
    MESSAGE = "message"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    ERROR = "error"
    SYSTEM = "system"

class ExecutionLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    log_type: LogType
    content: "LogContent"
```

---

### 9. Message（消息）

表示对话中的单条消息。

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `role` | MessageRole | ✅ | 消息角色 |
| `content` | string | ✅ | 消息内容 |
| `timestamp` | datetime | ✅ | 消息时间戳 |
| `parts` | Part[] | ❌ | 消息组成部分（用于复杂消息） |

**MessageRole 枚举**:
```
SYSTEM    = "system"      # 系统消息
USER      = "user"        # 用户消息
ASSISTANT = "assistant"   # 助手消息
```

**Python 示例**:
```python
class MessageRole(str, Enum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"

class Message(BaseModel):
    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    parts: list["Part"] = []
```

---

### 10. ToolCall（工具调用）

表示 AI 助手的工具调用。

| 字段 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | string | ✅ | 工具调用 ID |
| `name` | string | ✅ | 工具名称 |
| `arguments` | dict | ✅ | 调用参数 |
| `result` | string | ❌ | 调用结果 |
| `status` | ToolCallStatus | ✅ | 调用状态 |
| `started_at` | datetime | ✅ | 开始时间 |
| `ended_at` | datetime | ❌ | 结束时间 |

**ToolCallStatus 枚举**:
```
PENDING   = "pending"    # 等待执行
RUNNING   = "running"    # 执行中
SUCCESS   = "success"    # 执行成功
FAILED    = "failed"     # 执行失败
```

**Python 示例**:
```python
class ToolCallStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"

class ToolCall(BaseModel):
    id: str
    name: str
    arguments: dict
    result: Optional[str] = None
    status: ToolCallStatus = ToolCallStatus.PENDING
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
```

---

### 11. LogContent（日志内容）

日志内容的联合类型，根据 LogType 不同有不同结构。

**TypeScript 示例**:
```typescript
type LogContent =
  | { type: "message"; message: Message }
  | { type: "tool_call"; toolCall: ToolCall }
  | { type: "tool_result"; toolCallId: string; result: string }
  | { type: "error"; error: ExecutionError }
  | { type: "system"; text: string };
```

**Python 示例**:
```python
from typing import Union

class MessageLogContent(BaseModel):
    type: Literal["message"] = "message"
    message: Message

class ToolCallLogContent(BaseModel):
    type: Literal["tool_call"] = "tool_call"
    tool_call: ToolCall

class ToolResultLogContent(BaseModel):
    type: Literal["tool_result"] = "tool_result"
    tool_call_id: str
    result: str

class ErrorLogContent(BaseModel):
    type: Literal["error"] = "error"
    error: ExecutionError

class SystemLogContent(BaseModel):
    type: Literal["system"] = "system"
    text: str

LogContent = Union[
    MessageLogContent,
    ToolCallLogContent,
    ToolResultLogContent,
    ErrorLogContent,
    SystemLogContent
]
```

---

## 状态转换

### SkillPackage.validation_status

```
           ┌─────────┐
           │ PENDING │
           └────┬────┘
                │
       ┌────────┴────────┐
       ▼                 ▼
  ┌─────────┐       ┌─────────┐
  │  VALID  │       │ INVALID │
  └─────────┘       └─────────┘
```

### ExecutionSession.status

```
           ┌─────────┐
           │ PENDING │
           └────┬────┘
                │
                ▼
           ┌─────────┐
           │ RUNNING │
           └────┬────┘
                │
    ┌───────┬───┴───┬───────┬───────┐
    ▼       ▼       ▼       ▼       ▼
┌───────┐ ┌───────┐ ┌───────┐ ┌───────┐
│COMPLETE│ │FAILED │ │CANCELLED│ │TIMEOUT│
└───────┘ └───────┘ └───────┘ └───────┘
```

---

## 存储说明

根据规格说明，初始版本无需持久化存储：

- **技能包文件**: 存储在系统临时目录 `/tmp/claude-skills-runtime/{package_id}/`
- **会话数据**: 存储在内存中（Python dict 或类实例）
- **执行历史**: 存储在内存中，会话结束时清除

如未来需要持久化，可考虑：
- SQLite 用于元数据存储
- 文件系统用于技能包存储
