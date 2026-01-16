"""Contract tests for GET /skills/{skill_id}/files/{file_path} endpoint."""

import io
import zipfile
import pytest
from fastapi.testclient import TestClient
from src.main import app


def create_content_test_zip() -> bytes:
    """Create a skill package zip for content testing."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("SKILL.md", "---\nname: Test\ndescription: D\n---\n# Content")
        zf.writestr("script.py", "print('hello world')")
        zf.writestr("data/config.json", '{"key": "value"}')
    buffer.seek(0)
    return buffer.read()


class TestFileContentEndpoint:
    """Tests for GET /skills/{skill_id}/files/{file_path} endpoint."""

    @pytest.fixture
    def uploaded_skill_id(self, client: TestClient) -> str:
        """Upload a skill and return its ID."""
        zip_content = create_content_test_zip()
        files = {"file": ("content-skill.zip", zip_content, "application/zip")}
        response = client.post("/api/v1/skills/upload", files=files)
        return response.json()["id"]

    def test_get_file_content_returns_200(self, client: TestClient, uploaded_skill_id: str):
        """Get file content should return 200."""
        response = client.get(f"/api/v1/skills/{uploaded_skill_id}/files/script.py")
        assert response.status_code == 200
        assert response.json()["content"] == "print('hello world')"

    def test_get_nested_file_content(self, client: TestClient, uploaded_skill_id: str):
        """Get nested file content should return correct content."""
        response = client.get(f"/api/v1/skills/{uploaded_skill_id}/files/data/config.json")
        assert response.status_code == 200
        assert response.json()["content"] == '{"key": "value"}'

    def test_get_file_content_metadata(self, client: TestClient, uploaded_skill_id: str):
        """Response should include file metadata."""
        response = client.get(f"/api/v1/skills/{uploaded_skill_id}/files/script.py")
        data = response.json()
        assert data["name"] == "script.py"
        assert data["path"] == "script.py"
        assert data["file_type"] == "text"
        assert not data["is_binary"]

    def test_get_file_not_found_in_skill(self, client: TestClient, uploaded_skill_id: str):
        """Get non-existent file in skill should return 404."""
        response = client.get(f"/api/v1/skills/{uploaded_skill_id}/files/missing.txt")
        assert response.status_code == 404

    def test_get_file_skill_not_found(self, client: TestClient):
        """Get file from non-existent skill should return 404."""
        response = client.get("/api/v1/skills/bad-id/files/SKILL.md")
        assert response.status_code == 404
