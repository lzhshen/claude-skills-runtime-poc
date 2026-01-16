"""Log content models."""

from datetime import datetime
from typing import Literal, Union

from pydantic import BaseModel

from .execution import ExecutionError, Message, ToolCall


class MessageLogContent(BaseModel):
    """Log content for a message."""

    type: Literal["message"] = "message"
    message: Message


class ToolCallLogContent(BaseModel):
    """Log content for a tool call."""

    type: Literal["tool_call"] = "tool_call"
    tool_call: ToolCall


class ToolResultLogContent(BaseModel):
    """Log content for a tool result."""

    type: Literal["tool_result"] = "tool_result"
    tool_call_id: str
    result: str


class ErrorLogContent(BaseModel):
    """Log content for an error."""

    type: Literal["error"] = "error"
    error: ExecutionError


class SystemLogContent(BaseModel):
    """Log content for a system message."""

    type: Literal["system"] = "system"
    text: str


LogContent = Union[
    MessageLogContent,
    ToolCallLogContent,
    ToolResultLogContent,
    ErrorLogContent,
    SystemLogContent,
]
