"""Execution-related models."""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional, List, Any
from datetime import datetime

from pydantic import BaseModel, Field

from .enums import ExecutionStatus, MessageRole, ToolCallStatus


class Message(BaseModel):
    """Represents a message in a conversation."""

    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"json_encoders": {datetime: lambda v: v.isoformat()}}


class ToolCall(BaseModel):
    """Represents a tool call made by AI assistant."""

    id: str
    name: str
    arguments: dict
    result: Optional[str] = None
    status: ToolCallStatus = ToolCallStatus.PENDING
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None

    model_config = {"json_encoders": {datetime: lambda v: v.isoformat()}}


class ExecutionResult(BaseModel):
    """Result of a successful execution."""

    response: str
    messages: list[Message] = []
    tool_calls_count: int = 0

    model_config = {"json_encoders": {datetime: lambda v: v.isoformat()}}


class ExecutionError(BaseModel):
    """Error information for a failed execution."""

    code: str
    message: str
    stack_trace: Optional[str] = None
    occurred_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {"json_encoders": {datetime: lambda v: v.isoformat()}}


class ModelConfig(BaseModel):
    """Model configuration for execution."""

    provider_id: str
    model_id: str

    model_config = {"json_encoders": {datetime: lambda v: v.isoformat()}}


class ExecutionSession(BaseModel):
    """Represents a single skill execution run."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    skill_package_id: str
    skill_name: str
    user_prompt: str
    model: Optional[ModelConfig] = None
    status: ExecutionStatus = ExecutionStatus.PENDING
    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
    duration_ms: Optional[int] = None
    result: Optional[ExecutionResult] = None
    error: Optional[ExecutionError] = None
    opencode_session_id: Optional[str] = None
    logs: List[ExecutionLog] = []

    model_config = {"json_encoders": {datetime: lambda v: v.isoformat()}}
