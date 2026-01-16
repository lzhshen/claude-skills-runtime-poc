"""Contract tests for POST /skills/{skill_id}/repack endpoint."""

import io
import zipfile
import pytest
from fastapi.testclient import TestClient
from src.main import app


def create_repack_test_zip() -> bytes:
    """Create a skill package zip for repack testing."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("SKILL.md", "---\nname: Repack Test\ndescription: D\n---\nOriginal")
        zf.writestr("script.py", "print('original')")
    buffer.seek(0)
    return buffer.read()


class TestRepackEndpoint:
    """Tests for POST /skills/{skill_id}/repack endpoint."""

    @pytest.fixture
    def uploaded_skill_id(self, client: TestClient) -> str:
        """Upload a skill and return its ID."""
        zip_content = create_repack_test_zip()
        files = {"file": ("repack-skill.zip", zip_content, "application/zip")}
        response = client.post("/api/v1/skills/upload", files=files)
        return response.json()["id"]

    def test_repack_returns_zip(self, client: TestClient, uploaded_skill_id: str):
        """Repack should return a zip file."""
        response = client.post(f"/api/v1/skills/{uploaded_skill_id}/repack")
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/zip"
        assert "attachment" in response.headers["content-disposition"]

    def test_repack_includes_modifications(self, client: TestClient, uploaded_skill_id: str):
        """Repacked zip should include modified files."""
        # Modify a file
        client.put(
            f"/api/v1/skills/{uploaded_skill_id}/files/script.py",
            json={"content": "print('modified')"},
        )

        # Repack
        response = client.post(f"/api/v1/skills/{uploaded_skill_id}/repack")
        assert response.status_code == 200

        # Verify zip content
        zip_content = io.BytesIO(response.content)
        with zipfile.ZipFile(zip_content, "r") as zf:
            assert "script.py" in zf.namelist()
            content = zf.read("script.py").decode("utf-8")
            assert content == "print('modified')"

    def test_repack_skill_not_found(self, client: TestClient):
        """Repack non-existent skill should return 404."""
        response = client.post("/api/v1/skills/bad-id/repack")
        assert response.status_code == 404
