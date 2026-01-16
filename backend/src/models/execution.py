"""Execution-related models."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import TYPE_CHECKING

from pydantic import BaseModel, Field

from .enums import ExecutionStatus, MessageRole, ToolCallStatus

if TYPE_CHECKING:
    from .execution_log import ExecutionLog


class Message(BaseModel):
    """Represents a message in a conversation."""

    role: MessageRole
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(UTC))


class ToolCall(BaseModel):
    """Represents a tool call made by AI assistant."""

    id: str
    name: str
    arguments: dict
    result: str | None = None
    status: ToolCallStatus = ToolCallStatus.PENDING
    started_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    ended_at: datetime | None = None


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
    stack_trace: str | None = None
    occurred_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    model_config = {"json_encoders": {datetime: lambda v: v.isoformat()}}


class ModelConfig(BaseModel):
    """Model configuration for execution."""

    provider_id: str
    model_id: str


class ExecutionSession(BaseModel):
    """Represents a single skill execution run."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    skill_package_id: str
    skill_name: str
    user_prompt: str
    model: ModelConfig | None = None
    status: ExecutionStatus = ExecutionStatus.PENDING
    started_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    ended_at: datetime | None = None
    duration_ms: int | None = None
    result: ExecutionResult | None = None
    error: ExecutionError | None = None
    opencode_session_id: str | None = None
    logs: list[ExecutionLog] = []
