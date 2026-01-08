# API Contracts: opencode-bridge

**Date**: 2026-01-08 | **Branch**: `003-skills-runtime`

## 概述

本文档定义了 opencode-bridge 微服务的 REST API 契约。该服务封装 @opencode-ai/sdk，供 Python 后端调用。

**Base URL**: `http://localhost:3001/api/v1`

---

## 会话管理

### POST /sessions

创建 opencode 会话并注入技能指令。

**Request Body**:
```json
{
  "skill_instruction": "# My Skill\n\nYou are a helpful assistant that...",
  "skill_name": "My Skill"
}
```

**Response 201**:
```json
{
  "session_id": "oc_session_123456",
  "status": "created",
  "created_at": "2026-01-08T10:00:00Z"
}
```

**Response 500** (opencode 服务不可用):
```json
{
  "error": {
    "code": "OPENCODE_UNAVAILABLE",
    "message": "无法连接到 opencode 服务器"
  }
}
```

---

### DELETE /sessions/{session_id}

关闭并删除 opencode 会话。

**Path Parameters**:
- `session_id`: string - opencode 会话 ID

**Response 204**: No Content

---

## 消息交互

### POST /sessions/{session_id}/messages

向会话发送消息并获取响应。

**Path Parameters**:
- `session_id`: string - opencode 会话 ID

**Request Body**:
```json
{
  "content": "请帮我分析这段代码...",
  "stream": true
}
```

**Response 200** (非流式):
```json
{
  "message_id": "msg_001",
  "role": "assistant",
  "content": "好的，让我来分析这段代码...",
  "tool_calls": [
    {
      "id": "tc_001",
      "name": "read_file",
      "arguments": {"path": "/src/main.py"},
      "result": "def main():...",
      "status": "success"
    }
  ],
  "created_at": "2026-01-08T10:00:05Z"
}
```

**Response 202** (流式，返回流式端点):
```json
{
  "stream_url": "/api/v1/sessions/oc_session_123456/stream"
}
```

---

### GET /sessions/{session_id}/stream

获取会话的实时响应流（SSE）。

**Path Parameters**:
- `session_id`: string - opencode 会话 ID

**Response 200**:
- Content-Type: `text/event-stream`

**SSE Events**:

```
event: message_start
data: {"message_id": "msg_001", "timestamp": "2026-01-08T10:00:01Z"}

event: content_delta
data: {"delta": "好的，", "timestamp": "2026-01-08T10:00:01Z"}

event: content_delta
data: {"delta": "让我来", "timestamp": "2026-01-08T10:00:01Z"}

event: content_delta
data: {"delta": "分析这段代码...", "timestamp": "2026-01-08T10:00:02Z"}

event: tool_call_start
data: {"id": "tc_001", "name": "read_file", "arguments": {"path": "/src/main.py"}, "timestamp": "2026-01-08T10:00:03Z"}

event: tool_call_end
data: {"id": "tc_001", "result": "def main():...", "status": "success", "timestamp": "2026-01-08T10:00:04Z"}

event: message_end
data: {"message_id": "msg_001", "timestamp": "2026-01-08T10:00:05Z"}

event: done
data: {"timestamp": "2026-01-08T10:00:05Z"}
```

**错误事件**:
```
event: error
data: {"code": "EXECUTION_ERROR", "message": "工具执行失败", "timestamp": "2026-01-08T10:00:03Z"}
```

---

### GET /sessions/{session_id}/messages

获取会话的消息历史。

**Path Parameters**:
- `session_id`: string - opencode 会话 ID

**Response 200**:
```json
{
  "messages": [
    {
      "id": "msg_system",
      "role": "system",
      "content": "# My Skill\n\nYou are a helpful assistant...",
      "created_at": "2026-01-08T10:00:00Z"
    },
    {
      "id": "msg_001",
      "role": "user",
      "content": "请帮我分析这段代码...",
      "created_at": "2026-01-08T10:00:01Z"
    },
    {
      "id": "msg_002",
      "role": "assistant",
      "content": "好的，让我来分析这段代码...",
      "tool_calls": [...],
      "created_at": "2026-01-08T10:00:05Z"
    }
  ]
}
```

---

## 执行控制

### POST /sessions/{session_id}/cancel

取消正在进行的响应生成。

**Path Parameters**:
- `session_id`: string - opencode 会话 ID

**Response 200**:
```json
{
  "session_id": "oc_session_123456",
  "cancelled": true,
  "cancelled_at": "2026-01-08T10:02:00Z"
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
  "opencode": {
    "status": "connected",
    "server_url": "http://localhost:3000"
  }
}
```

**Response 503**:
```json
{
  "status": "unhealthy",
  "version": "1.0.0",
  "opencode": {
    "status": "disconnected",
    "error": "Connection refused"
  }
}
```

---

### GET /agents

获取可用的 opencode agents 列表。

**Response 200**:
```json
{
  "agents": [
    {
      "id": "default",
      "name": "Default Agent",
      "description": "The default coding assistant"
    },
    {
      "id": "sisyphus",
      "name": "Sisyphus",
      "description": "Persistent coding agent from oh-my-opencode"
    }
  ]
}
```

---

## TypeScript 类型定义

```typescript
// types/api.ts

export interface CreateSessionRequest {
  skill_instruction: string;
  skill_name: string;
}

export interface CreateSessionResponse {
  session_id: string;
  status: "created";
  created_at: string;
}

export interface SendMessageRequest {
  content: string;
  stream?: boolean;
}

export interface MessageResponse {
  message_id: string;
  role: "system" | "user" | "assistant";
  content: string;
  tool_calls?: ToolCall[];
  created_at: string;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  result?: string;
  status: "pending" | "running" | "success" | "failed";
}

export interface StreamEvent {
  event:
    | "message_start"
    | "content_delta"
    | "tool_call_start"
    | "tool_call_end"
    | "message_end"
    | "done"
    | "error";
  data: Record<string, unknown>;
}

export interface HealthResponse {
  status: "healthy" | "unhealthy";
  version: string;
  opencode: {
    status: "connected" | "disconnected";
    server_url?: string;
    error?: string;
  };
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
```

---

## 与 Python 后端的交互流程

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Python Backend │     │ opencode-bridge │     │ opencode server │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         │ POST /sessions        │                       │
         │──────────────────────▶│                       │
         │                       │ createOpencode()      │
         │                       │──────────────────────▶│
         │                       │◀──────────────────────│
         │◀──────────────────────│ session_id            │
         │                       │                       │
         │ POST /sessions/{id}/messages                  │
         │──────────────────────▶│                       │
         │                       │ session.sendMessage() │
         │                       │──────────────────────▶│
         │                       │                       │
         │ SSE: content_delta    │◀──────────────────────│
         │◀──────────────────────│ streaming response    │
         │                       │                       │
         │ SSE: tool_call_start  │                       │
         │◀──────────────────────│                       │
         │                       │                       │
         │ SSE: done             │                       │
         │◀──────────────────────│                       │
         │                       │                       │
```
