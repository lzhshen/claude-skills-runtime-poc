"""Skill package model."""

import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from .enums import ValidationStatus
from .skill_file import SkillFile
from .skill_metadata import SkillMetadata
from .validation import ValidationError


class SkillPackage(BaseModel):
    """Represents an uploaded and extracted skill package."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    original_filename: str
    extracted_path: str
    validation_status: ValidationStatus = ValidationStatus.PENDING
    validation_errors: list[ValidationError] = []
    files: list[SkillFile] = []
    metadata: Optional[SkillMetadata] = None
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    size_bytes: int
