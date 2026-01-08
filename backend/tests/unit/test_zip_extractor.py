"""Unit tests for zip extraction utility."""

import io
import os
import tempfile
import zipfile

import pytest


class TestZipExtractor:
    """Tests for zip extraction functionality."""

    def test_extract_valid_zip(self):
        """Should extract valid zip file."""
        from src.utils.zip_extractor import extract_zip

        # Create a test zip
        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as zf:
            zf.writestr("test.txt", "Hello World")
        buffer.seek(0)

        with tempfile.TemporaryDirectory() as tmpdir:
            result = extract_zip(buffer.read(), tmpdir)

            assert result.success is True
            assert os.path.exists(os.path.join(tmpdir, "test.txt"))

    def test_extract_invalid_zip(self):
        """Should return error for invalid zip."""
        from src.utils.zip_extractor import extract_zip

        with tempfile.TemporaryDirectory() as tmpdir:
            result = extract_zip(b"not a zip file", tmpdir)

            assert result.success is False
            assert result.error_code == "INVALID_ZIP"

    def test_extract_empty_zip(self):
        """Should handle empty zip file."""
        from src.utils.zip_extractor import extract_zip

        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w"):
            pass  # Create empty zip
        buffer.seek(0)

        with tempfile.TemporaryDirectory() as tmpdir:
            result = extract_zip(buffer.read(), tmpdir)

            assert result.success is True

    def test_extract_nested_directories(self):
        """Should extract nested directory structure."""
        from src.utils.zip_extractor import extract_zip

        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as zf:
            zf.writestr("dir1/dir2/file.txt", "Nested content")
        buffer.seek(0)

        with tempfile.TemporaryDirectory() as tmpdir:
            result = extract_zip(buffer.read(), tmpdir)

            assert result.success is True
            assert os.path.exists(os.path.join(tmpdir, "dir1", "dir2", "file.txt"))

    def test_reject_path_traversal(self):
        """Should reject zip with path traversal attempts."""
        from src.utils.zip_extractor import extract_zip

        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as zf:
            # Attempt path traversal
            zf.writestr("../../../etc/passwd", "malicious content")
        buffer.seek(0)

        with tempfile.TemporaryDirectory() as tmpdir:
            result = extract_zip(buffer.read(), tmpdir)

            assert result.success is False
            assert result.error_code == "PATH_TRAVERSAL"

    def test_reject_oversized_file(self):
        """Should reject zip exceeding size limit."""
        from src.utils.zip_extractor import extract_zip

        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as zf:
            # Create a large file (11MB)
            large_content = b"x" * (11 * 1024 * 1024)
            zf.writestr("large.bin", large_content)
        buffer.seek(0)

        with tempfile.TemporaryDirectory() as tmpdir:
            result = extract_zip(buffer.read(), tmpdir, max_size_bytes=10 * 1024 * 1024)

            assert result.success is False
            assert result.error_code == "FILE_TOO_LARGE"

    def test_extract_with_single_root_folder(self):
        """Should handle zip with single root folder."""
        from src.utils.zip_extractor import extract_zip

        buffer = io.BytesIO()
        with zipfile.ZipFile(buffer, "w") as zf:
            zf.writestr("my-skill/SKILL.md", "# Skill")
            zf.writestr("my-skill/README.md", "# Readme")
        buffer.seek(0)

        with tempfile.TemporaryDirectory() as tmpdir:
            result = extract_zip(buffer.read(), tmpdir)

            assert result.success is True
            # Should extract contents directly or preserve structure
            assert result.extracted_path is not None
