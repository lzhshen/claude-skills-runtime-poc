"""Pydantic models for opencode client."""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel


class OpencodeHealthResponse(BaseModel):
    """Response from opencode health endpoint."""

    status: str
    version: Optional[str] = None


class OpencodeSession(BaseModel):
    """OpenCode session representation."""

    id: str
    created_at: Optional[datetime] = None


class OpencodeCreateSessionRequest(BaseModel):
    """Request to create a new session."""

    path: Optional[str] = None


class OpencodePromptRequest(BaseModel):
    """Request to send a prompt."""

    content: str
    no_reply: bool = False


class OpencodeProvider(BaseModel):
    """Model provider information."""

    id: str
    name: str


class OpencodeModel(BaseModel):
    """Model information."""

    id: str
    name: str
    provider: str


class OpencodeProvidersResponse(BaseModel):
    """Response from providers endpoint."""

    providers: list[OpencodeProvider]
    models: list[OpencodeModel]


class OpencodeAgent(BaseModel):
    """Agent information."""

    id: str
    name: str
    description: Optional[str] = None


class OpencodeAgentsResponse(BaseModel):
    """Response from agents endpoint."""

    agents: list[OpencodeAgent]


class OpencodeEvent(BaseModel):
    """Base class for opencode events."""

    type: str
    timestamp: datetime
    data: dict[str, Any] = {}


class OpencodeMessageEvent(OpencodeEvent):
    """Message event from opencode."""

    message_id: Optional[str] = None
    role: Optional[str] = None
    content: Optional[str] = None


class OpencodeToolCallEvent(OpencodeEvent):
    """Tool call event from opencode."""

    tool_call_id: Optional[str] = None
    name: Optional[str] = None
    arguments: Optional[dict[str, Any]] = None
    result: Optional[str] = None
    status: Optional[str] = None


class OpencodeErrorEvent(OpencodeEvent):
    """Error event from opencode."""

    code: Optional[str] = None
    message: Optional[str] = None
