"""Enumeration types for the Claude Skills Runtime."""

from enum import Enum


class ValidationStatus(str, Enum):
    """Status of skill package validation."""

    PENDING = "pending"
    VALID = "valid"
    INVALID = "invalid"


class FileType(str, Enum):
    """Type of file in a skill package."""

    MARKDOWN = "markdown"
    YAML = "yaml"
    TEXT = "text"
    BINARY = "binary"
    DIRECTORY = "directory"


class ErrorCode(str, Enum):
    """Error codes for validation errors."""

    INVALID_ZIP = "INVALID_ZIP"
    MISSING_SKILL_MD = "MISSING_SKILL_MD"
    INVALID_YAML = "INVALID_YAML"
    MISSING_NAME = "MISSING_NAME"
    MISSING_DESCRIPTION = "MISSING_DESCRIPTION"
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    PATH_TRAVERSAL = "PATH_TRAVERSAL"
    ZIP_BOMB = "ZIP_BOMB"


class ExecutionStatus(str, Enum):
    """Status of skill execution."""

    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMEOUT = "timeout"


class LogType(str, Enum):
    """Type of execution log entry."""

    MESSAGE = "message"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    ERROR = "error"
    SYSTEM = "system"


class MessageRole(str, Enum):
    """Role of a message in conversation."""

    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"


class ToolCallStatus(str, Enum):
    """Status of a tool call."""

    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
