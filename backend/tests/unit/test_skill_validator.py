"""Unit tests for SKILL.md validation."""

import pytest


class TestSkillValidator:
    """Tests for SKILL.md validation."""

    def test_validate_valid_skill_md(self):
        """Should validate correct SKILL.md."""
        from src.services.skill_validator import validate_skill_md

        content = """---
name: Test Skill
description: A test skill
---

# Instructions

Do something useful.
"""
        result = validate_skill_md(content)

        assert result.is_valid is True
        assert result.metadata is not None
        assert result.metadata.name == "Test Skill"
        assert result.metadata.description == "A test skill"

    def test_validate_missing_frontmatter(self):
        """Should reject SKILL.md without frontmatter."""
        from src.services.skill_validator import validate_skill_md

        content = """# Instructions

No frontmatter here.
"""
        result = validate_skill_md(content)

        assert result.is_valid is False
        assert any(e.code.value == "INVALID_YAML" for e in result.errors)

    def test_validate_missing_name(self):
        """Should reject SKILL.md without name field."""
        from src.services.skill_validator import validate_skill_md

        content = """---
description: A skill without name
---

# Instructions
"""
        result = validate_skill_md(content)

        assert result.is_valid is False
        assert any(e.code.value == "MISSING_NAME" for e in result.errors)

    def test_validate_missing_description(self):
        """Should reject SKILL.md without description field."""
        from src.services.skill_validator import validate_skill_md

        content = """---
name: Test Skill
---

# Instructions
"""
        result = validate_skill_md(content)

        assert result.is_valid is False
        assert any(e.code.value == "MISSING_DESCRIPTION" for e in result.errors)

    def test_validate_invalid_yaml(self):
        """Should reject SKILL.md with invalid YAML."""
        from src.services.skill_validator import validate_skill_md

        content = """---
name: Test Skill
description: [unclosed bracket
---

# Instructions
"""
        result = validate_skill_md(content)

        assert result.is_valid is False
        assert any(e.code.value == "INVALID_YAML" for e in result.errors)

    def test_validate_extracts_instruction(self):
        """Should extract instruction from markdown body."""
        from src.services.skill_validator import validate_skill_md

        content = """---
name: Test Skill
description: A test skill
---

# Instructions

This is the instruction body.

## Section 2

More content here.
"""
        result = validate_skill_md(content)

        assert result.is_valid is True
        assert "This is the instruction body" in result.metadata.instruction
        assert "More content here" in result.metadata.instruction

    def test_validate_preserves_extra_fields(self):
        """Should preserve extra YAML fields."""
        from src.services.skill_validator import validate_skill_md

        content = """---
name: Test Skill
description: A test skill
version: 1.0.0
author: Test Author
tags:
  - test
  - example
---

# Instructions
"""
        result = validate_skill_md(content)

        assert result.is_valid is True
        assert result.metadata.extra_fields.get("version") == "1.0.0"
        assert result.metadata.extra_fields.get("author") == "Test Author"
        assert result.metadata.extra_fields.get("tags") == ["test", "example"]
