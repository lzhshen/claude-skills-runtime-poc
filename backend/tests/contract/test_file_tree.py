"""Contract tests for GET /skills/{skill_id}/files endpoint."""

import io
import zipfile
import pytest
from fastapi.testclient import TestClient
from src.main import app


def create_complex_skill_zip() -> bytes:
    """Create a skill package zip with nested directories."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        # Root file
        zf.writestr("SKILL.md", "---\nname: Test Skill\ndescription: Test\n---\n")
        # Root binary file (simulated)
        zf.writestr("logo.png", b"\x89PNG\r\n\x1a\n")
        # Nested file
        zf.writestr("src/main.py", "print('hello')")
        # Deeply nested file
        zf.writestr("src/utils/helper.py", "def help(): pass")
    buffer.seek(0)
    return buffer.read()


class TestFileTreeEndpoint:
    """Tests for GET /skills/{skill_id}/files endpoint."""

    @pytest.fixture
    def uploaded_skill_id(self, client: TestClient) -> str:
        """Upload a skill and return its ID."""
        zip_content = create_complex_skill_zip()
        files = {"file": ("complex-skill.zip", zip_content, "application/zip")}
        response = client.post("/api/v1/skills/upload", files=files)
        assert response.status_code == 200
        return response.json()["id"]

    def test_get_file_tree_returns_200(self, client: TestClient, uploaded_skill_id: str):
        """Get file tree should return 200."""
        response = client.get(f"/api/v1/skills/{uploaded_skill_id}/files")
        assert response.status_code == 200

    def test_get_file_tree_structure(self, client: TestClient, uploaded_skill_id: str):
        """File tree should correctly reflect directory structure."""
        response = client.get(f"/api/v1/skills/{uploaded_skill_id}/files")
        data = response.json()

        assert "tree" in data
        tree = data["tree"]

        # Verify root nodes
        root_names = [node["name"] for node in tree]
        assert "SKILL.md" in root_names
        assert "logo.png" in root_names
        assert "src" in root_names

        # Verify SKILL.md details
        skill_md = next(n for n in tree if n["name"] == "SKILL.md")
        assert skill_md["file_type"] == "markdown"
        assert skill_md["path"] == "SKILL.md"

        # Verify src directory
        src_dir = next(n for n in tree if n["name"] == "src")
        assert src_dir["file_type"] == "directory"
        assert len(src_dir["children"]) > 0

        # Verify nested content in src
        src_children_names = [n["name"] for n in src_dir["children"]]
        assert "main.py" in src_children_names
        assert "utils" in src_children_names

        # Verify utils directory
        utils_dir = next(n for n in src_dir["children"] if n["name"] == "utils")
        assert utils_dir["file_type"] == "directory"
        assert utils_dir["children"][0]["name"] == "helper.py"

    def test_get_file_tree_not_found(self, client: TestClient):
        """Get file tree for non-existent skill should return 404."""
        response = client.get("/api/v1/skills/non-existent-id/files")
        assert response.status_code == 404
