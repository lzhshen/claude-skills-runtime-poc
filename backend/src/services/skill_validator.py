"""SKILL.md validator service."""

from dataclasses import dataclass
from typing import Optional

from ..models import ErrorCode, SkillMetadata
from ..models import ValidationError as ValidationErrorModel
from ..utils.yaml_parser import parse_frontmatter


@dataclass
class ValidationResult:
    """Result of SKILL.md validation."""

    is_valid: bool
    metadata: Optional[SkillMetadata] = None
    errors: list[ValidationErrorModel] = None

    def __post_init__(self):
        if self.errors is None:
            self.errors = []


def validate_skill_md(content: str) -> ValidationResult:
    """Validate SKILL.md content and extract metadata.

    Args:
        content: Raw SKILL.md file content.

    Returns:
        ValidationResult with validation status and extracted metadata.
    """
    errors: list[ValidationErrorModel] = []

    # Parse frontmatter
    parse_result = parse_frontmatter(content)

    if not parse_result.success:
        errors.append(
            ValidationErrorModel(
                code=ErrorCode.INVALID_YAML,
                message=f"YAML 解析失败: {parse_result.error}",
                suggestion="请检查 SKILL.md 文件开头的 YAML frontmatter 格式是否正确",
            )
        )
        return ValidationResult(is_valid=False, errors=errors)

    frontmatter = parse_result.frontmatter

    # Check required fields
    name = frontmatter.get("name")
    description = frontmatter.get("description")

    if not name:
        errors.append(
            ValidationErrorModel(
                code=ErrorCode.MISSING_NAME,
                message="缺少必填字段: name",
                suggestion="请在 YAML frontmatter 中添加 'name' 字段",
                field="name",
            )
        )

    if not description:
        errors.append(
            ValidationErrorModel(
                code=ErrorCode.MISSING_DESCRIPTION,
                message="缺少必填字段: description",
                suggestion="请在 YAML frontmatter 中添加 'description' 字段",
                field="description",
            )
        )

    if errors:
        return ValidationResult(is_valid=False, errors=errors)

    # Extract extra fields (everything except name and description)
    extra_fields = {k: v for k, v in frontmatter.items() if k not in ("name", "description")}

    # Create metadata
    metadata = SkillMetadata(
        name=str(name),
        description=str(description),
        raw_content=content,
        instruction=parse_result.body.strip(),
        extra_fields=extra_fields,
    )

    return ValidationResult(is_valid=True, metadata=metadata)
