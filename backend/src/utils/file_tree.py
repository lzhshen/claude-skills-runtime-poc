"""File tree building utility."""

from typing import Optional

from ..models import FileType, SkillFile


class FileTreeNode:
    """Represents a node in the file tree."""

    def __init__(
        self,
        path: str,
        name: str,
        file_type: FileType,
        size_bytes: Optional[int] = None,
        is_binary: Optional[bool] = None,
        is_modified: Optional[bool] = None,
    ):
        self.path = path
        self.name = name
        self.file_type = file_type
        self.size_bytes = size_bytes
        self.is_binary = is_binary
        self.is_modified = is_modified
        self.children: list["FileTreeNode"] = []

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        result = {
            "path": self.path,
            "name": self.name,
            "file_type": self.file_type.value
            if isinstance(self.file_type, FileType)
            else self.file_type,
        }

        if self.file_type != FileType.DIRECTORY:
            result["size_bytes"] = self.size_bytes
            result["is_binary"] = self.is_binary
            result["is_modified"] = self.is_modified
            result["children"] = None
        else:
            result["children"] = [child.to_dict() for child in self.children]

        return result


def build_file_tree(files: list[SkillFile]) -> list[FileTreeNode]:
    """Build a hierarchical file tree from a flat list of files.

    Args:
        files: List of SkillFile objects.

    Returns:
        List of root-level FileTreeNode objects.
    """
    # Create a mapping of paths to nodes
    nodes: dict[str, FileTreeNode] = {}
    root_nodes: list[FileTreeNode] = []

    # Sort files by path to ensure parents are created before children
    sorted_files = sorted(files, key=lambda f: f.path)

    for file in sorted_files:
        parts = file.path.split("/")

        if len(parts) == 1:
            # Root level file
            node = FileTreeNode(
                path=file.path,
                name=file.name,
                file_type=file.file_type,
                size_bytes=file.size_bytes,
                is_binary=file.is_binary,
                is_modified=file.is_modified,
            )
            nodes[file.path] = node
            root_nodes.append(node)
        else:
            # File in subdirectory
            # Ensure all parent directories exist
            for i in range(1, len(parts)):
                dir_path = "/".join(parts[:i])
                if dir_path not in nodes:
                    dir_name = parts[i - 1]
                    dir_node = FileTreeNode(
                        path=dir_path,
                        name=dir_name,
                        file_type=FileType.DIRECTORY,
                    )
                    nodes[dir_path] = dir_node

                    # Add to parent or root
                    if i == 1:
                        root_nodes.append(dir_node)
                    else:
                        parent_path = "/".join(parts[: i - 1])
                        if parent_path in nodes:
                            nodes[parent_path].children.append(dir_node)

            # Create file node
            file_node = FileTreeNode(
                path=file.path,
                name=file.name,
                file_type=file.file_type,
                size_bytes=file.size_bytes,
                is_binary=file.is_binary,
                is_modified=file.is_modified,
            )
            nodes[file.path] = file_node

            # Add to parent directory
            parent_path = "/".join(parts[:-1])
            if parent_path in nodes:
                nodes[parent_path].children.append(file_node)

    # Sort children: directories first, then alphabetically
    def sort_children(node: FileTreeNode) -> None:
        node.children.sort(key=lambda n: (n.file_type != FileType.DIRECTORY, n.name.lower()))
        for child in node.children:
            if child.file_type == FileType.DIRECTORY:
                sort_children(child)

    for node in root_nodes:
        if node.file_type == FileType.DIRECTORY:
            sort_children(node)

    # Sort root nodes
    root_nodes.sort(key=lambda n: (n.file_type != FileType.DIRECTORY, n.name.lower()))

    return root_nodes
