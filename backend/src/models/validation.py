"""Validation error model."""


from pydantic import BaseModel

from .enums import ErrorCode


class ValidationError(BaseModel):
    """Represents a validation error found during skill package validation."""

    code: ErrorCode
    message: str
    suggestion: str | None = None
    field: str | None = None
