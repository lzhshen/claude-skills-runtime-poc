"""Zip extraction utility with security protections."""

import os
import zipfile
from dataclasses import dataclass
from io import BytesIO
from typing import Optional


@dataclass
class ExtractionResult:
    """Result of zip extraction."""

    success: bool
    extracted_path: Optional[str] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    file_count: int = 0
    total_size: int = 0


def is_path_safe(path: str, base_dir: str) -> bool:
    """Check if extracted path is safe (no path traversal)."""
    # Normalize paths
    abs_base = os.path.abspath(base_dir)
    abs_path = os.path.abspath(os.path.join(base_dir, path))

    # Check if the path is within the base directory
    return abs_path.startswith(abs_base + os.sep) or abs_path == abs_base


def extract_zip(
    zip_data: bytes,
    target_dir: str,
    max_size_bytes: int = 10 * 1024 * 1024,  # 10MB default
    max_files: int = 1000,
    max_ratio: float = 10.0,  # Compression ratio limit for zip bomb detection
) -> ExtractionResult:
    """Extract zip file with security protections.

    Args:
        zip_data: Raw zip file bytes.
        target_dir: Directory to extract to.
        max_size_bytes: Maximum total extracted size.
        max_files: Maximum number of files to extract.
        max_ratio: Maximum compression ratio (zip bomb protection).

    Returns:
        ExtractionResult with extraction status and details.
    """
    try:
        zip_buffer = BytesIO(zip_data)
        zip_size = len(zip_data)

        with zipfile.ZipFile(zip_buffer, "r") as zf:
            # Check for too many files
            if len(zf.namelist()) > max_files:
                return ExtractionResult(
                    success=False,
                    error_code="ZIP_BOMB",
                    error_message=f"Too many files in archive (>{max_files})",
                )

            # Calculate total uncompressed size
            total_size = sum(info.file_size for info in zf.infolist())

            # Check size limit
            if total_size > max_size_bytes:
                return ExtractionResult(
                    success=False,
                    error_code="FILE_TOO_LARGE",
                    error_message=f"Extracted size ({total_size} bytes) exceeds limit ({max_size_bytes} bytes)",
                )

            # Check compression ratio (zip bomb protection)
            if zip_size > 0 and total_size / zip_size > max_ratio:
                return ExtractionResult(
                    success=False,
                    error_code="ZIP_BOMB",
                    error_message=f"Suspicious compression ratio detected",
                )

            # Check for path traversal in all entries
            for name in zf.namelist():
                if not is_path_safe(name, target_dir):
                    return ExtractionResult(
                        success=False,
                        error_code="PATH_TRAVERSAL",
                        error_message=f"Path traversal detected in: {name}",
                    )

                # Also check for absolute paths
                if os.path.isabs(name):
                    return ExtractionResult(
                        success=False,
                        error_code="PATH_TRAVERSAL",
                        error_message=f"Absolute path in archive: {name}",
                    )

            # Create target directory if it doesn't exist
            os.makedirs(target_dir, exist_ok=True)

            # Extract all files
            file_count = 0
            for info in zf.infolist():
                # Skip directories (they'll be created automatically)
                if info.is_dir():
                    continue

                # Extract file
                target_path = os.path.join(target_dir, info.filename)
                target_parent = os.path.dirname(target_path)

                if target_parent:
                    os.makedirs(target_parent, exist_ok=True)

                with zf.open(info) as src, open(target_path, "wb") as dst:
                    dst.write(src.read())

                file_count += 1

            return ExtractionResult(
                success=True,
                extracted_path=target_dir,
                file_count=file_count,
                total_size=total_size,
            )

    except zipfile.BadZipFile:
        return ExtractionResult(
            success=False,
            error_code="INVALID_ZIP",
            error_message="Invalid or corrupted zip file",
        )
    except Exception as e:
        return ExtractionResult(
            success=False,
            error_code="EXTRACTION_ERROR",
            error_message=str(e),
        )


def find_skill_root(extracted_dir: str) -> Optional[str]:
    """Find the root directory containing SKILL.md.

    Handles cases where:
    - SKILL.md is in the root
    - SKILL.md is in a single top-level directory

    Args:
        extracted_dir: Directory where zip was extracted.

    Returns:
        Path to directory containing SKILL.md, or None if not found.
    """
    # Check if SKILL.md is in the root
    if os.path.exists(os.path.join(extracted_dir, "SKILL.md")):
        return extracted_dir

    # Check for single top-level directory
    entries = os.listdir(extracted_dir)
    if len(entries) == 1:
        single_dir = os.path.join(extracted_dir, entries[0])
        if os.path.isdir(single_dir):
            if os.path.exists(os.path.join(single_dir, "SKILL.md")):
                return single_dir

    return None
