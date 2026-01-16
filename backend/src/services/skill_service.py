"""Skill package management service."""

import os
import shutil
import uuid
from datetime import UTC, datetime

from ..models import ErrorCode, SkillFile, SkillPackage, ValidationStatus
from ..models import ValidationError as ValidationErrorModel
from ..utils.config import get_settings
from ..utils.file_utils import compute_file_hash, get_file_type, is_binary_file, read_text_file
from ..utils.zip_extractor import extract_zip, find_skill_root
from .skill_storage import get_skill_storage
from .skill_validator import validate_skill_md


class SkillService:
    """Service for managing skill packages."""

    def __init__(self):
        self.storage = get_skill_storage()
        self.settings = get_settings()

    def _get_temp_dir(self, package_id: str) -> str:
        """Get temporary directory for a package."""
        return os.path.join(self.settings.temp_dir, package_id)

    def _scan_files(self, directory: str, base_path: str = "") -> list[SkillFile]:
        """Scan directory and create SkillFile list.

        Args:
            directory: Directory to scan.
            base_path: Base path for relative paths.

        Returns:
            List of SkillFile objects.
        """
        files: list[SkillFile] = []

        for entry in sorted(os.listdir(directory)):
            full_path = os.path.join(directory, entry)
            rel_path = os.path.join(base_path, entry) if base_path else entry

            if os.path.isdir(full_path):
                # Recurse into subdirectories
                files.extend(self._scan_files(full_path, rel_path))
            else:
                # Read file info
                size = os.path.getsize(full_path)
                is_binary = is_binary_file(full_path)
                file_type = get_file_type(full_path)

                # Read content for text files
                content = None
                if not is_binary:
                    content = read_text_file(full_path)

                # Compute hash
                with open(full_path, "rb") as f:
                    file_hash = compute_file_hash(f.read())

                files.append(
                    SkillFile(
                        path=rel_path,
                        name=entry,
                        file_type=file_type,
                        size_bytes=size,
                        content=content,
                        is_modified=False,
                        original_hash=file_hash,
                        is_binary=is_binary,
                    )
                )

        return files

    async def upload_and_validate(
        self,
        file_content: bytes,
        filename: str,
    ) -> SkillPackage:
        """Upload and validate a skill package.

        Args:
            file_content: Raw zip file bytes.
            filename: Original filename.

        Returns:
            SkillPackage with validation results.
        """
        package_id = str(uuid.uuid4())
        temp_dir = self._get_temp_dir(package_id)

        # Create package with pending status
        package = SkillPackage(
            id=package_id,
            original_filename=filename,
            extracted_path=temp_dir,
            validation_status=ValidationStatus.PENDING,
            size_bytes=len(file_content),
            uploaded_at=datetime.now(UTC),
        )

        # Extract zip
        extract_result = extract_zip(
            file_content,
            temp_dir,
            max_size_bytes=self.settings.max_upload_size_bytes,
        )

        if not extract_result.success:
            error_code = (
                ErrorCode[extract_result.error_code]
                if extract_result.error_code in ErrorCode.__members__
                else ErrorCode.INVALID_ZIP
            )
            package.validation_status = ValidationStatus.INVALID
            package.validation_errors = [
                ValidationErrorModel(
                    code=error_code,
                    message=extract_result.error_message or "解压失败",
                    suggestion="请确保上传的是有效的 zip 文件",
                )
            ]
            self.storage.save(package)
            return package

        # Find skill root (handles single top-level directory case)
        skill_root = find_skill_root(temp_dir)

        if skill_root is None:
            package.validation_status = ValidationStatus.INVALID
            package.validation_errors = [
                ValidationErrorModel(
                    code=ErrorCode.MISSING_SKILL_MD,
                    message="需要 SKILL.md 文件",
                    suggestion="请确保 zip 包根目录或单个顶级目录包含 SKILL.md 文件",
                )
            ]
            self.storage.save(package)
            return package

        # Update extracted path to skill root
        package.extracted_path = skill_root

        # Scan files
        package.files = self._scan_files(skill_root)

        # Read and validate SKILL.md
        skill_md_path = os.path.join(skill_root, "SKILL.md")
        with open(skill_md_path, encoding="utf-8") as f:
            skill_md_content = f.read()

        validation_result = validate_skill_md(skill_md_content)

        if not validation_result.is_valid:
            package.validation_status = ValidationStatus.INVALID
            package.validation_errors = validation_result.errors
        else:
            package.validation_status = ValidationStatus.VALID
            package.metadata = validation_result.metadata

        self.storage.save(package)
        return package

    def get_package(self, package_id: str) -> SkillPackage | None:
        """Get a skill package by ID.

        Args:
            package_id: Package ID.

        Returns:
            SkillPackage if found, None otherwise.
        """
        return self.storage.get(package_id)

    def delete_package(self, package_id: str) -> bool:
        """Delete a skill package.

        Args:
            package_id: Package ID.

        Returns:
            True if deleted, False if not found.
        """
        package = self.storage.get(package_id)
        if package:
            # Clean up temp directory
            temp_dir = self._get_temp_dir(package_id)
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir, ignore_errors=True)

            return self.storage.delete(package_id)
        return False

    def get_file_content(self, package_id: str, file_path: str) -> SkillFile | None:
        """Get file content from a package.

        Args:
            package_id: Package ID.
            file_path: Relative file path within the package.

        Returns:
            SkillFile with content if found, None otherwise.
        """
        package = self.storage.get(package_id)
        if not package:
            return None

        # Find the file
        for file in package.files:
            if file.path == file_path:
                # If content not loaded, load it
                if file.content is None and not file.is_binary:
                    full_path = os.path.join(package.extracted_path, file_path)
                    if os.path.exists(full_path):
                        file.content = read_text_file(full_path)
                return file

        return None

    def update_file_content(
        self, package_id: str, file_path: str, content: str
    ) -> SkillFile | None:
        """Update file content in a package.

        Args:
            package_id: Package ID.
            file_path: Relative file path.
            content: New file content.

        Returns:
            Updated SkillFile if successful, None otherwise.
        """
        package = self.storage.get(package_id)
        if not package:
            return None

        # Find and update the file
        for i, file in enumerate(package.files):
            if file.path == file_path:
                if file.is_binary:
                    return None  # Cannot edit binary files

                # Write to disk
                full_path = os.path.join(package.extracted_path, file_path)
                with open(full_path, "w", encoding="utf-8") as f:
                    f.write(content)

                # Update file object
                file.content = content
                file.is_modified = True
                file.size_bytes = len(content.encode("utf-8"))

                # Update package
                package.files[i] = file
                self.storage.save(package)

                return file

        return None


# Global service instance
_service: SkillService | None = None


def get_skill_service() -> SkillService:
    """Get the global skill service instance."""
    global _service
    if _service is None:
        _service = SkillService()
    return _service
