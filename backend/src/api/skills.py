"""Skills API endpoints."""

from typing import Optional

from fastapi import APIRouter, File, HTTPException, Request, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel

from ..models import SkillFile, SkillPackage
from ..services.skill_service import get_skill_service
from ..utils.config import get_settings
from ..utils.errors import BinaryFileError, FileTooLargeError, InvalidRequestError, NotFoundError
from ..utils.zip_repacker import repack_skill_zip

router = APIRouter(prefix="/skills", tags=["skills"])


class FileUpdateRequest(BaseModel):
    """Request body for file update."""

    content: str


class FileTreeNode(BaseModel):
    """File tree node for response."""

    path: str
    name: str
    file_type: str
    size_bytes: Optional[int] = None
    is_binary: Optional[bool] = None
    is_modified: Optional[bool] = None
    children: Optional[list["FileTreeNode"]] = None


class FileTreeResponse(BaseModel):
    """Response for file tree endpoint."""

    tree: list[FileTreeNode]


@router.post("/upload", response_model=SkillPackage)
async def upload_skill(
    file: UploadFile = File(...),
) -> SkillPackage:
    """Upload and validate a skill package.

    Accepts a zip file containing a Claude Skill package.
    The package must contain a SKILL.md file with valid YAML frontmatter.
    """
    settings = get_settings()
    service = get_skill_service()

    # Validate file
    if not file.filename:
        raise InvalidRequestError("未提供文件或文件格式无效").to_http_exception()

    # Check file extension
    if not file.filename.lower().endswith(".zip"):
        raise InvalidRequestError("文件必须是 .zip 格式").to_http_exception()

    # Read file content
    content = await file.read()

    # Check file size
    if len(content) > settings.max_upload_size_bytes:
        raise FileTooLargeError(settings.max_upload_size_mb).to_http_exception()

    # Validate it's actually a zip file
    if not content.startswith(b"PK"):
        raise InvalidRequestError("无效的 zip 文件").to_http_exception()

    # Process upload
    package = await service.upload_and_validate(content, file.filename)

    return package


@router.get("/{skill_id}", response_model=SkillPackage)
async def get_skill(skill_id: str) -> SkillPackage:
    """Get skill package details."""
    service = get_skill_service()
    package = service.get_package(skill_id)

    if not package:
        raise NotFoundError("技能包", skill_id).to_http_exception()

    return package


@router.delete("/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_skill(skill_id: str) -> None:
    """Delete a skill package."""
    service = get_skill_service()

    if not service.delete_package(skill_id):
        raise NotFoundError("技能包", skill_id).to_http_exception()


@router.get("/{skill_id}/files", response_model=FileTreeResponse)
async def get_file_tree(skill_id: str) -> FileTreeResponse:
    """Get the file tree for a skill package."""
    service = get_skill_service()
    package = service.get_package(skill_id)

    if not package:
        raise NotFoundError("技能包", skill_id).to_http_exception()

    # Build tree structure
    def build_tree(files: list[SkillFile]) -> list[FileTreeNode]:
        # Group files by directory
        tree: dict[str, FileTreeNode] = {}
        root_files: list[FileTreeNode] = []

        for file in files:
            parts = file.path.split("/")

            if len(parts) == 1:
                # Root level file
                root_files.append(
                    FileTreeNode(
                        path=file.path,
                        name=file.name,
                        file_type=file.file_type.value,
                        size_bytes=file.size_bytes,
                        is_binary=file.is_binary,
                        is_modified=file.is_modified,
                        children=None,
                    )
                )
            else:
                # File in subdirectory - add to appropriate directory node
                dir_path = "/".join(parts[:-1])

                if dir_path not in tree:
                    tree[dir_path] = FileTreeNode(
                        path=dir_path,
                        name=parts[-2] if len(parts) > 1 else dir_path,
                        file_type="directory",
                        children=[],
                    )

                tree[dir_path].children.append(
                    FileTreeNode(
                        path=file.path,
                        name=file.name,
                        file_type=file.file_type.value,
                        size_bytes=file.size_bytes,
                        is_binary=file.is_binary,
                        is_modified=file.is_modified,
                        children=None,
                    )
                )

        # Add directories to root
        for dir_node in tree.values():
            # Only add top-level directories
            if "/" not in dir_node.path:
                root_files.append(dir_node)

        return sorted(root_files, key=lambda x: (x.file_type != "directory", x.name))

    tree = build_tree(package.files)

    return FileTreeResponse(tree=tree)


@router.get("/{skill_id}/files/{file_path:path}", response_model=SkillFile)
async def get_file_content(skill_id: str, file_path: str) -> SkillFile:
    """Get content of a specific file."""
    service = get_skill_service()

    file = service.get_file_content(skill_id, file_path)

    if not file:
        raise NotFoundError("文件", file_path).to_http_exception()

    return file


@router.put("/{skill_id}/files/{file_path:path}", response_model=SkillFile)
async def update_file_content(
    skill_id: str,
    file_path: str,
    body: FileUpdateRequest,
) -> SkillFile:
    """Update content of a specific file."""
    service = get_skill_service()

    # Check if package exists
    package = service.get_package(skill_id)
    if not package:
        raise NotFoundError("技能包", skill_id).to_http_exception()

    # Check if file exists and is not binary
    existing_file = service.get_file_content(skill_id, file_path)
    if not existing_file:
        raise NotFoundError("文件", file_path).to_http_exception()

    if existing_file.is_binary:
        raise BinaryFileError().to_http_exception()

    # Update file
    updated_file = service.update_file_content(skill_id, file_path, body.content)

    if not updated_file:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": {"code": "UPDATE_FAILED", "message": "文件更新失败"}},
        )

    return updated_file


@router.post("/{skill_id}/repack")
async def repack_skill(skill_id: str) -> Response:
    """Repack the skill package with any modifications.

    Returns the repacked zip file as a downloadable response.
    """
    service = get_skill_service()
    package = service.get_package(skill_id)

    if not package:
        raise NotFoundError("技能包", skill_id).to_http_exception()

    # Collect modified contents
    modified_contents = {}
    for file in package.files:
        if file.is_modified and file.content is not None:
            modified_contents[file.path] = file.content

    # Repack the zip
    zip_bytes = repack_skill_zip(package.files, modified_contents)

    # Generate filename
    base_name = package.original_filename.rsplit(".", 1)[0]
    download_filename = f"{base_name}_modified.zip"

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{download_filename}"',
        },
    )


@router.get("/{skill_id}/download")
async def download_skill(skill_id: str) -> Response:
    """Download the skill package (with any modifications).

    Returns the zip file as a downloadable response.
    """
    service = get_skill_service()
    package = service.get_package(skill_id)

    if not package:
        raise NotFoundError("技能包", skill_id).to_http_exception()

    # Check if there are any modifications
    has_modifications = any(f.is_modified for f in package.files)

    # Collect modified contents
    modified_contents = {}
    for file in package.files:
        if file.is_modified and file.content is not None:
            modified_contents[file.path] = file.content

    # Repack the zip
    zip_bytes = repack_skill_zip(package.files, modified_contents)

    # Generate filename
    base_name = package.original_filename.rsplit(".", 1)[0]
    if has_modifications:
        download_filename = f"{base_name}_modified.zip"
    else:
        download_filename = package.original_filename

    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="{download_filename}"',
        },
    )
