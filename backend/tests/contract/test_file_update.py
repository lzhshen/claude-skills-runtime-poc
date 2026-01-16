"""Contract tests for PUT /skills/{skill_id}/files/{file_path} endpoint."""

import io
import zipfile
import pytest
from fastapi.testclient import TestClient
from src.main import app


def create_update_test_zip() -> bytes:
    """Create a skill package zip for update testing."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("SKILL.md", "---\nname: Test\ndescription: D\n---\n")
        zf.writestr("config.json", '{"version": 1}')
        zf.writestr("image.png", b"\x89PNG\r\n\x1a\n")
    buffer.seek(0)
    return buffer.read()


class TestFileUpdateEndpoint:
    """Tests for PUT /skills/{skill_id}/files/{file_path} endpoint."""

    @pytest.fixture
    def uploaded_skill_id(self, client: TestClient) -> str:
        """Upload a skill and return its ID."""
        zip_content = create_update_test_zip()
        files = {"file": ("update-skill.zip", zip_content, "application/zip")}
        response = client.post("/api/v1/skills/upload", files=files)
        return response.json()["id"]

    def test_update_file_content_returns_200(self, client: TestClient, uploaded_skill_id: str):
        """Update file content should return 200 and updated file."""
        new_content = '{"version": 2}'
        response = client.put(
            f"/api/v1/skills/{uploaded_skill_id}/files/config.json", json={"content": new_content}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["content"] == new_content
        assert data["is_modified"] is True

    def test_update_persists_change(self, client: TestClient, uploaded_skill_id: str):
        """Updated content should be retrieved by subsequent GET."""
        new_content = '{"version": 3}'
        # Update
        client.put(
            f"/api/v1/skills/{uploaded_skill_id}/files/config.json", json={"content": new_content}
        )
        # Get
        response = client.get(f"/api/v1/skills/{uploaded_skill_id}/files/config.json")
        assert response.status_code == 200
        assert response.json()["content"] == new_content

    def test_update_binary_file_fails(self, client: TestClient, uploaded_skill_id: str):
        """Updating binary file should fail."""
        response = client.put(
            f"/api/v1/skills/{uploaded_skill_id}/files/image.png", json={"content": "new content"}
        )
        # Expecting 400 or 422 depending on implementation of BinaryFileError
        # Checking implementation... BinaryFileError maps to 400
        assert response.status_code == 400
        assert response.json()["detail"]["code"] == "BINARY_FILE"

    def test_update_non_existent_file_fails(self, client: TestClient, uploaded_skill_id: str):
        """Updating non-existent file should fail."""
        response = client.put(
            f"/api/v1/skills/{uploaded_skill_id}/files/missing.txt", json={"content": "content"}
        )
        assert response.status_code == 404

    def test_update_skill_not_found(self, client: TestClient):
        """Updating file in non-existent skill should fail."""
        response = client.put(
            "/api/v1/skills/bad-id/files/config.json", json={"content": "content"}
        )
        assert response.status_code == 404
