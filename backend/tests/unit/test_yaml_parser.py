"""Unit tests for YAML frontmatter parsing."""

import pytest


class TestYamlParser:
    """Tests for YAML frontmatter parsing."""

    def test_parse_valid_frontmatter(self):
        """Should parse valid YAML frontmatter."""
        from src.utils.yaml_parser import parse_frontmatter

        content = """---
name: Test
description: A test
---

Body content here.
"""
        result = parse_frontmatter(content)

        assert result.success is True
        assert result.frontmatter == {"name": "Test", "description": "A test"}
        assert result.body.strip() == "Body content here."

    def test_parse_no_frontmatter(self):
        """Should handle content without frontmatter."""
        from src.utils.yaml_parser import parse_frontmatter

        content = """# Just markdown

No frontmatter here.
"""
        result = parse_frontmatter(content)

        assert result.success is False
        assert result.error is not None

    def test_parse_empty_frontmatter(self):
        """Should handle empty frontmatter."""
        from src.utils.yaml_parser import parse_frontmatter

        content = """---
---

Body only.
"""
        result = parse_frontmatter(content)

        assert result.success is True
        assert result.frontmatter == {}
        assert result.body.strip() == "Body only."

    def test_parse_complex_yaml(self):
        """Should parse complex YAML structures."""
        from src.utils.yaml_parser import parse_frontmatter

        content = """---
name: Complex Skill
description: A skill with complex config
config:
  timeout: 30
  retries: 3
tags:
  - tag1
  - tag2
---

Instructions.
"""
        result = parse_frontmatter(content)

        assert result.success is True
        assert result.frontmatter["config"]["timeout"] == 30
        assert result.frontmatter["tags"] == ["tag1", "tag2"]

    def test_parse_invalid_yaml(self):
        """Should return error for invalid YAML."""
        from src.utils.yaml_parser import parse_frontmatter

        content = """---
name: Test
description: [unclosed
---

Body.
"""
        result = parse_frontmatter(content)

        assert result.success is False
        assert result.error is not None

    def test_parse_multiline_strings(self):
        """Should handle multiline YAML strings."""
        from src.utils.yaml_parser import parse_frontmatter

        content = """---
name: Test
description: |
  This is a multiline
  description that spans
  multiple lines.
---

Body.
"""
        result = parse_frontmatter(content)

        assert result.success is True
        assert "multiline" in result.frontmatter["description"]

    def test_parse_preserves_body_formatting(self):
        """Should preserve body formatting."""
        from src.utils.yaml_parser import parse_frontmatter

        content = """---
name: Test
description: Test
---

# Header

Paragraph 1.

Paragraph 2.

```python
code block
```
"""
        result = parse_frontmatter(content)

        assert result.success is True
        assert "# Header" in result.body
        assert "```python" in result.body
