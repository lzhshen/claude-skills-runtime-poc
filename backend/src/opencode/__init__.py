"""OpenCode client package."""

from .client import OpencodeClient
from .config import ConfigAPI
from .events import EventStreamHandler, SSEEvent, parse_sse_stream
from .models import (
    OpencodeAgent,
    OpencodeAgentsResponse,
    OpencodeCreateSessionRequest,
    OpencodeErrorEvent,
    OpencodeEvent,
    OpencodeHealthResponse,
    OpencodeMessageEvent,
    OpencodeModel,
    OpencodePromptRequest,
    OpencodeProvider,
    OpencodeProvidersResponse,
    OpencodeSession,
    OpencodeToolCallEvent,
)
from .session import SessionAPI

__all__ = [
    # Main client
    "OpencodeClient",
    # API wrappers
    "SessionAPI",
    "ConfigAPI",
    # Event handling
    "EventStreamHandler",
    "SSEEvent",
    "parse_sse_stream",
    # Models
    "OpencodeHealthResponse",
    "OpencodeSession",
    "OpencodeCreateSessionRequest",
    "OpencodePromptRequest",
    "OpencodeProvider",
    "OpencodeModel",
    "OpencodeProvidersResponse",
    "OpencodeAgent",
    "OpencodeAgentsResponse",
    "OpencodeEvent",
    "OpencodeMessageEvent",
    "OpencodeToolCallEvent",
    "OpencodeErrorEvent",
]
