"""Execution log model."""

import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, Field

from .enums import LogType
from .log_content import LogContent


class ExecutionLog(BaseModel):
    """Represents a single log entry during execution."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    log_type: LogType
    content: LogContent
