"""File utility functions."""

import hashlib
import os
from typing import Optional

from ..models import FileType


# Binary file signatures (magic bytes)
BINARY_SIGNATURES = [
    b"\x89PNG",  # PNG
    b"\xff\xd8\xff",  # JPEG
    b"GIF87a",  # GIF
    b"GIF89a",  # GIF
    b"PK\x03\x04",  # ZIP
    b"PK\x05\x06",  # ZIP (empty)
    b"\x1f\x8b",  # GZIP
    b"BZ",  # BZIP2
    b"\x7fELF",  # ELF executable
    b"MZ",  # DOS/Windows executable
    b"\x00\x00\x01\x00",  # ICO
    b"\x00\x00\x02\x00",  # CUR
    b"RIFF",  # RIFF (WAV, AVI)
    b"\x00\x00\x00",  # Various binary formats
]

# Text file extensions
TEXT_EXTENSIONS = {
    ".md",
    ".markdown",
    ".txt",
    ".text",
    ".yaml",
    ".yml",
    ".json",
    ".xml",
    ".html",
    ".htm",
    ".css",
    ".js",
    ".ts",
    ".jsx",
    ".tsx",
    ".py",
    ".rb",
    ".go",
    ".rs",
    ".java",
    ".c",
    ".cpp",
    ".h",
    ".hpp",
    ".sh",
    ".bash",
    ".zsh",
    ".fish",
    ".sql",
    ".graphql",
    ".toml",
    ".ini",
    ".cfg",
    ".conf",
    ".env",
    ".gitignore",
    ".dockerignore",
    ".editorconfig",
    ".prettierrc",
    ".eslintrc",
}


def is_binary_file(file_path: str, content: Optional[bytes] = None) -> bool:
    """Detect if a file is binary.

    Args:
        file_path: Path to the file.
        content: Optional file content bytes.

    Returns:
        True if file is binary, False if text.
    """
    # Check extension first
    ext = os.path.splitext(file_path)[1].lower()
    if ext in TEXT_EXTENSIONS:
        return False

    # If content provided, check magic bytes
    if content:
        for sig in BINARY_SIGNATURES:
            if content.startswith(sig):
                return True

        # Check for null bytes (common in binary files)
        if b"\x00" in content[:1024]:
            return True

    # If no content and unknown extension, try to read
    if content is None and os.path.exists(file_path):
        try:
            with open(file_path, "rb") as f:
                sample = f.read(1024)
                return is_binary_file(file_path, sample)
        except Exception:
            return True

    return False


def get_file_type(file_path: str, is_directory: bool = False) -> FileType:
    """Determine the file type from path.

    Args:
        file_path: Path to the file.
        is_directory: Whether the path is a directory.

    Returns:
        FileType enum value.
    """
    if is_directory:
        return FileType.DIRECTORY

    ext = os.path.splitext(file_path)[1].lower()

    if ext in {".md", ".markdown"}:
        return FileType.MARKDOWN
    elif ext in {".yaml", ".yml"}:
        return FileType.YAML
    elif ext in TEXT_EXTENSIONS:
        return FileType.TEXT
    else:
        # Check if binary
        if os.path.exists(file_path):
            if is_binary_file(file_path):
                return FileType.BINARY
        return FileType.TEXT


def compute_file_hash(content: bytes) -> str:
    """Compute MD5 hash of file content.

    Args:
        content: File content bytes.

    Returns:
        Hexadecimal MD5 hash string.
    """
    return hashlib.md5(content).hexdigest()


def get_file_size(file_path: str) -> int:
    """Get file size in bytes.

    Args:
        file_path: Path to the file.

    Returns:
        File size in bytes.
    """
    return os.path.getsize(file_path)


def read_text_file(file_path: str, encoding: str = "utf-8") -> Optional[str]:
    """Read text file content.

    Args:
        file_path: Path to the file.
        encoding: Text encoding.

    Returns:
        File content as string, or None if binary.
    """
    if is_binary_file(file_path):
        return None

    try:
        with open(file_path, "r", encoding=encoding) as f:
            return f.read()
    except UnicodeDecodeError:
        return None
    except Exception:
        return None
