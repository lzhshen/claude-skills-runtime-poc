"""Contract tests for GET /skills/{skill_id}/download endpoint."""

import io
import zipfile
import pytest
from fastapi.testclient import TestClient
from src.main import app


def create_download_test_zip() -> bytes:
    """Create a skill package zip for download testing."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("SKILL.md", "---\nname: Download Test\ndescription: D\n---\n")
    buffer.seek(0)
    return buffer.read()


class TestDownloadEndpoint:
    """Tests for GET /skills/{skill_id}/download endpoint."""

    @pytest.fixture
    def uploaded_skill_id(self, client: TestClient) -> str:
        """Upload a skill and return its ID."""
        zip_content = create_download_test_zip()
        files = {"file": ("my-skill.zip", zip_content, "application/zip")}
        response = client.post("/api/v1/skills/upload", files=files)
        return response.json()["id"]

    def test_download_returns_zip(self, client: TestClient, uploaded_skill_id: str):
        """Download should return a zip file."""
        response = client.get(f"/api/v1/skills/{uploaded_skill_id}/download")
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/zip"
        assert 'filename="my-skill.zip"' in response.headers["content-disposition"]

    def test_download_includes_modifications(self, client: TestClient, uploaded_skill_id: str):
        """Download should include modifications and update filename."""
        # Modify a file
        client.put(
            f"/api/v1/skills/{uploaded_skill_id}/files/SKILL.md",
            json={"content": "---\nname: Modified\ndescription: D\n---\n"},
        )

        # Download
        response = client.get(f"/api/v1/skills/{uploaded_skill_id}/download")
        assert response.status_code == 200
        assert 'filename="my-skill_modified.zip"' in response.headers["content-disposition"]

        # Verify content
        zip_content = io.BytesIO(response.content)
        with zipfile.ZipFile(zip_content, "r") as zf:
            content = zf.read("SKILL.md").decode("utf-8")
            assert "name: Modified" in content

    def test_download_skill_not_found(self, client: TestClient):
        """Download non-existent skill should return 404."""
        response = client.get("/api/v1/skills/bad-id/download")
        assert response.status_code == 404
