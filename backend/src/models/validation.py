"""Validation error model."""

from typing import Optional

from pydantic import BaseModel

from .enums import ErrorCode


class ValidationError(BaseModel):
    """Represents a validation error found during skill package validation."""

    code: ErrorCode
    message: str
    suggestion: Optional[str] = None
    field: Optional[str] = None
