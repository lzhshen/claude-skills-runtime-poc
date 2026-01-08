"""Zip repacking utility for modified skill packages."""

import io
import zipfile
from typing import Dict

from ..models import SkillFile


def repack_skill_zip(
    files: list[SkillFile],
    modified_contents: Dict[str, str],
) -> bytes:
    """Repack skill files into a new zip archive.

    Args:
        files: List of SkillFile objects from the original package.
        modified_contents: Dictionary mapping file paths to their modified content.

    Returns:
        Bytes of the new zip archive.
    """
    buffer = io.BytesIO()

    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for file in files:
            # Skip directories - they're created implicitly
            if file.file_type.value == "directory":
                continue

            # Use modified content if available, otherwise use original
            if file.path in modified_contents:
                content = modified_contents[file.path]
                # Write as text (UTF-8)
                zf.writestr(file.path, content.encode("utf-8"))
            elif file.content is not None:
                # Original text content
                zf.writestr(file.path, file.content.encode("utf-8"))
            elif file.binary_content is not None:
                # Original binary content
                zf.writestr(file.path, file.binary_content)
            # Skip files with no content (shouldn't happen)

    buffer.seek(0)
    return buffer.read()


def validate_repack_request(
    files: list[SkillFile],
    modified_paths: set[str],
) -> list[str]:
    """Validate that all modified paths exist in the skill package.

    Args:
        files: List of SkillFile objects from the package.
        modified_paths: Set of file paths that have been modified.

    Returns:
        List of error messages (empty if valid).
    """
    errors = []
    existing_paths = {f.path for f in files}

    for path in modified_paths:
        if path not in existing_paths:
            errors.append(f"Modified file not found in package: {path}")

    return errors
