# API Contracts: Python Backend

**Date**: 2026-01-08 | **Branch**: `003-skills-runtime`

## 概述

本文档定义了 Python 后端 (FastAPI) 的 REST API 契约。

**Base URL**: `http://localhost:8000/api/v1`

---

## 技能包管理

### POST /skills/upload

上传并验证技能包。

**Request**:
- Content-Type: `multipart/form-data`
- Body:
  - `file`: 技能包 zip 文件 (required, max 10MB)

**Response 200** (验证通过):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "original_filename": "my-skill.zip",
  "validation_status": "valid",
  "validation_errors": [],
  "metadata": {
    "name": "My Skill",
    "description": "A sample skill",
    "instruction": "# Instructions\n\nDo something..."
  },
  "files": [
    {
      "path": "SKILL.md",
      "name": "SKILL.md",
      "file_type": "markdown",
      "size_bytes": 1024,
      "is_binary": false,
      "is_modified": false
    }
  ],
  "uploaded_at": "2026-01-08T10:00:00Z",
  "size_bytes": 2048
}
```

**Response 200** (验证失败):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "original_filename": "invalid-skill.zip",
  "validation_status": "invalid",
  "validation_errors": [
    {
      "code": "MISSING_SKILL_MD",
      "message": "需要 SKILL.md 文件",
      "suggestion": "请确保 zip 包根目录或单个顶级目录包含 SKILL.md 文件"
    }
  ],
  "metadata": null,
  "files": [],
  "uploaded_at": "2026-01-08T10:00:00Z",
  "size_bytes": 1024
}
```

**Response 400** (请求错误):
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "未提供文件或文件格式无效"
  }
}
```

**Response 413** (文件过大):
```json
{
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "文件大小超过 10MB 限制"
  }
}
```

---

### GET /skills/{skill_id}

获取技能包详情。

**Path Parameters**:
- `skill_id`: string (UUID) - 技能包 ID

**Response 200**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "original_filename": "my-skill.zip",
  "validation_status": "valid",
  "validation_errors": [],
  "metadata": {
    "name": "My Skill",
    "description": "A sample skill",
    "instruction": "..."
  },
  "files": [...],
  "uploaded_at": "2026-01-08T10:00:00Z",
  "size_bytes": 2048
}
```

**Response 404**:
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "技能包不存在"
  }
}
```

---

### GET /skills/{skill_id}/files

获取技能包的文件树。

**Path Parameters**:
- `skill_id`: string (UUID) - 技能包 ID

**Response 200**:
```json
{
  "tree": [
    {
      "path": "",
      "name": "root",
      "file_type": "directory",
      "children": [
        {
          "path": "SKILL.md",
          "name": "SKILL.md",
          "file_type": "markdown",
          "size_bytes": 1024,
          "is_binary": false,
          "is_modified": false,
          "children": null
        },
        {
          "path": "resources",
          "name": "resources",
          "file_type": "directory",
          "children": [
            {
              "path": "resources/data.yaml",
              "name": "data.yaml",
              "file_type": "yaml",
              "size_bytes": 512,
              "is_binary": false,
              "is_modified": false,
              "children": null
            }
          ]
        }
      ]
    }
  ]
}
```

---

### GET /skills/{skill_id}/files/{file_path}

获取单个文件内容。

**Path Parameters**:
- `skill_id`: string (UUID) - 技能包 ID
- `file_path`: string - URL 编码的文件路径

**Response 200** (文本文件):
```json
{
  "path": "SKILL.md",
  "name": "SKILL.md",
  "file_type": "markdown",
  "size_bytes": 1024,
  "content": "---\nname: My Skill\ndescription: A sample skill\n---\n\n# Instructions...",
  "is_binary": false,
  "is_modified": false
}
```

**Response 200** (二进制文件):
```json
{
  "path": "image.png",
  "name": "image.png",
  "file_type": "binary",
  "size_bytes": 10240,
  "content": null,
  "is_binary": true,
  "is_modified": false
}
```

---

### PUT /skills/{skill_id}/files/{file_path}

更新文件内容。

**Path Parameters**:
- `skill_id`: string (UUID) - 技能包 ID
- `file_path`: string - URL 编码的文件路径

**Request Body**:
```json
{
  "content": "---\nname: Updated Skill\ndescription: Updated description\n---\n\n# Updated instructions..."
}
```

**Response 200**:
```json
{
  "path": "SKILL.md",
  "name": "SKILL.md",
  "file_type": "markdown",
  "size_bytes": 1200,
  "content": "---\nname: Updated Skill\n...",
  "is_binary": false,
  "is_modified": true
}
```

**Response 400** (尝试编辑二进制文件):
```json
{
  "error": {
    "code": "BINARY_FILE",
    "message": "无法编辑二进制文件"
  }
}
```

---

### POST /skills/{skill_id}/repack

重新打包技能包并返回下载链接。

**Path Parameters**:
- `skill_id`: string (UUID) - 技能包 ID

**Response 200**:
```json
{
  "download_url": "/api/v1/skills/550e8400-e29b-41d4-a716-446655440000/download",
  "filename": "my-skill-modified.zip",
  "size_bytes": 2100,
  "expires_at": "2026-01-08T11:00:00Z"
}
```

---

### GET /skills/{skill_id}/download

下载重新打包的技能包。

**Path Parameters**:
- `skill_id`: string (UUID) - 技能包 ID

**Response 200**:
- Content-Type: `application/zip`
- Content-Disposition: `attachment; filename="skill-name.zip"`
- Body: zip 文件二进制内容

---

### DELETE /skills/{skill_id}

删除技能包。

**Path Parameters**:
- `skill_id`: string (UUID) - 技能包 ID

**Response 204**: No Content

---

## 技能执行

### POST /skills/{skill_id}/execute

执行技能。

**Path Parameters**:
- `skill_id`: string (UUID) - 技能包 ID

**Request Body**:
```json
{
  "prompt": "请帮我分析这段代码..."
}
```

**Response 202** (执行已启动):
```json
{
  "session_id": "660e8400-e29b-41d4-a716-446655440000",
  "skill_package_id": "550e8400-e29b-41d4-a716-446655440000",
  "skill_name": "My Skill",
  "user_prompt": "请帮我分析这段代码...",
  "status": "pending",
  "started_at": "2026-01-08T10:00:00Z",
  "stream_url": "/api/v1/executions/660e8400-e29b-41d4-a716-446655440000/stream"
}
```

**Response 400** (技能包无效):
```json
{
  "error": {
    "code": "INVALID_SKILL",
    "message": "技能包验证未通过，无法执行"
  }
}
```

---

### GET /executions/{session_id}/stream

获取执行的实时流（SSE）。

**Path Parameters**:
- `session_id`: string (UUID) - 执行会话 ID

**Response 200**:
- Content-Type: `text/event-stream`

**SSE Events**:

```
event: status
data: {"status": "running", "timestamp": "2026-01-08T10:00:01Z"}

event: message
data: {"role": "assistant", "content": "正在分析代码...", "timestamp": "2026-01-08T10:00:02Z"}

event: tool_call
data: {"id": "tc_001", "name": "read_file", "arguments": {"path": "/src/main.py"}, "status": "pending", "timestamp": "2026-01-08T10:00:03Z"}

event: tool_result
data: {"tool_call_id": "tc_001", "result": "def main():\n    ...", "timestamp": "2026-01-08T10:00:04Z"}

event: message
data: {"role": "assistant", "content": "这段代码的主要功能是...", "timestamp": "2026-01-08T10:00:05Z"}

event: complete
data: {"status": "completed", "duration_ms": 5000, "timestamp": "2026-01-08T10:00:06Z"}
```

**错误事件**:
```
event: error
data: {"code": "TIMEOUT", "message": "执行超时（5分钟）", "timestamp": "2026-01-08T10:05:00Z"}
```

---

### POST /executions/{session_id}/cancel

取消正在执行的技能。

**Path Parameters**:
- `session_id`: string (UUID) - 执行会话 ID

**Response 200**:
```json
{
  "session_id": "660e8400-e29b-41d4-a716-446655440000",
  "status": "cancelled",
  "cancelled_at": "2026-01-08T10:02:00Z"
}
```

**Response 400** (执行已完成):
```json
{
  "error": {
    "code": "ALREADY_COMPLETED",
    "message": "执行已完成，无法取消"
  }
}
```

---

### GET /executions/{session_id}

获取执行会话详情。

**Path Parameters**:
- `session_id`: string (UUID) - 执行会话 ID

**Response 200**:
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440000",
  "skill_package_id": "550e8400-e29b-41d4-a716-446655440000",
  "skill_name": "My Skill",
  "user_prompt": "请帮我分析这段代码...",
  "status": "completed",
  "started_at": "2026-01-08T10:00:00Z",
  "ended_at": "2026-01-08T10:00:06Z",
  "duration_ms": 6000,
  "result": {
    "response": "这段代码的主要功能是...",
    "messages": [...],
    "tool_calls_count": 3
  },
  "error": null
}
```

---

### GET /executions/{session_id}/logs

获取执行日志。

**Path Parameters**:
- `session_id`: string (UUID) - 执行会话 ID

**Query Parameters**:
- `type`: string (optional) - 日志类型过滤 (message, tool_call, tool_result, error, system)
- `limit`: integer (optional, default: 100) - 返回条数限制
- `offset`: integer (optional, default: 0) - 分页偏移

**Response 200**:
```json
{
  "logs": [
    {
      "id": "log_001",
      "session_id": "660e8400-e29b-41d4-a716-446655440000",
      "timestamp": "2026-01-08T10:00:01Z",
      "log_type": "message",
      "content": {
        "type": "message",
        "message": {
          "role": "user",
          "content": "请帮我分析这段代码..."
        }
      }
    },
    {
      "id": "log_002",
      "session_id": "660e8400-e29b-41d4-a716-446655440000",
      "timestamp": "2026-01-08T10:00:02Z",
      "log_type": "tool_call",
      "content": {
        "type": "tool_call",
        "tool_call": {
          "id": "tc_001",
          "name": "read_file",
          "arguments": {"path": "/src/main.py"},
          "status": "success"
        }
      }
    }
  ],
  "total": 10,
  "limit": 100,
  "offset": 0
}
```

---

### GET /executions

获取执行历史列表。

**Query Parameters**:
- `skill_id`: string (optional) - 按技能包过滤
- `status`: string (optional) - 按状态过滤
- `limit`: integer (optional, default: 20) - 返回条数限制
- `offset`: integer (optional, default: 0) - 分页偏移

**Response 200**:
```json
{
  "executions": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440000",
      "skill_name": "My Skill",
      "user_prompt": "请帮我分析这段代码...",
      "status": "completed",
      "started_at": "2026-01-08T10:00:00Z",
      "duration_ms": 6000
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "skill_name": "Another Skill",
      "user_prompt": "请帮我...",
      "status": "failed",
      "started_at": "2026-01-08T09:55:00Z",
      "duration_ms": 2000
    }
  ],
  "total": 15,
  "limit": 20,
  "offset": 0
}
```

---

## 系统

### GET /health

健康检查。

**Response 200**:
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "opencode_bridge": {
    "status": "connected",
    "url": "http://localhost:3001"
  }
}
```

**Response 503** (服务不可用):
```json
{
  "status": "unhealthy",
  "version": "1.0.0",
  "opencode_bridge": {
    "status": "disconnected",
    "error": "Connection refused"
  }
}
```
