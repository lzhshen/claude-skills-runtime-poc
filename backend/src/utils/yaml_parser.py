"""YAML frontmatter parser utility."""

from dataclasses import dataclass
from typing import Any

import yaml


@dataclass
class FrontmatterResult:
    """Result of frontmatter parsing."""

    success: bool
    frontmatter: dict[str, Any]
    body: str
    error: str | None = None


def parse_frontmatter(content: str) -> FrontmatterResult:
    """Parse YAML frontmatter from markdown content.

    Args:
        content: Markdown content with optional YAML frontmatter.

    Returns:
        FrontmatterResult with parsed frontmatter and body.
    """
    content = content.strip()

    # Check for frontmatter delimiter
    if not content.startswith("---"):
        return FrontmatterResult(
            success=False,
            frontmatter={},
            body=content,
            error="No frontmatter found - content must start with '---'",
        )

    # Find the closing delimiter
    lines = content.split("\n")
    end_index = -1

    for i, line in enumerate(lines[1:], start=1):
        if line.strip() == "---":
            end_index = i
            break

    if end_index == -1:
        return FrontmatterResult(
            success=False,
            frontmatter={},
            body=content,
            error="No closing frontmatter delimiter found",
        )

    # Extract frontmatter and body
    frontmatter_lines = lines[1:end_index]
    body_lines = lines[end_index + 1 :]

    frontmatter_text = "\n".join(frontmatter_lines)
    body = "\n".join(body_lines)

    # Parse YAML
    try:
        if frontmatter_text.strip():
            frontmatter = yaml.safe_load(frontmatter_text)
            if frontmatter is None:
                frontmatter = {}
        else:
            frontmatter = {}

        return FrontmatterResult(
            success=True,
            frontmatter=frontmatter,
            body=body,
        )
    except yaml.YAMLError as e:
        return FrontmatterResult(
            success=False,
            frontmatter={},
            body=body,
            error=f"Invalid YAML: {e}",
        )
