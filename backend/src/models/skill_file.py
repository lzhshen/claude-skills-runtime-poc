"""Skill file model."""

from typing import Optional

from pydantic import BaseModel

from .enums import FileType


class SkillFile(BaseModel):
    """Represents a single file in a skill package."""

    path: str
    name: str
    file_type: FileType
    size_bytes: int
    content: Optional[str] = None
    is_modified: bool = False
    original_hash: str
    is_binary: bool = False
