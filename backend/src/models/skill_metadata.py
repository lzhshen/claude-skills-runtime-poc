"""Skill metadata model."""

from typing import Any

from pydantic import BaseModel


class SkillMetadata(BaseModel):
    """Metadata parsed from SKILL.md YAML frontmatter."""

    name: str
    description: str
    raw_content: str
    instruction: str
    extra_fields: dict[str, Any] = {}
