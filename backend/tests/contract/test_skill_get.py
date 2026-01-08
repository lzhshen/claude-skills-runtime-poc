"""Contract tests for GET /skills/{skill_id} endpoint."""

import io
import zipfile

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock

from src.main import app


@pytest.fixture
def client():
    """Create test client with mocked opencode_client."""
    mock_client = MagicMock()
    mock_client.check_health = AsyncMock(return_value=True)
    mock_client.base_url = "http://localhost:8080"
    mock_client.close = AsyncMock()

    app.state.opencode_client = mock_client
    return TestClient(app)


def create_valid_skill_zip() -> bytes:
    """Create a valid skill package zip file."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        skill_md_content = """---
name: Test Skill
description: A test skill for unit testing
---

# Instructions

This is a test skill.
"""
        zf.writestr("SKILL.md", skill_md_content)
    buffer.seek(0)
    return buffer.read()


class TestGetSkillEndpoint:
    """Tests for GET /skills/{skill_id} endpoint."""

    def test_get_existing_skill_returns_200(self, client: TestClient):
        """Get existing skill should return 200."""
        # First upload a skill
        zip_content = create_valid_skill_zip()
        files = {"file": ("test-skill.zip", zip_content, "application/zip")}
        upload_response = client.post("/api/v1/skills/upload", files=files)
        skill_id = upload_response.json()["id"]

        # Then get it
        response = client.get(f"/api/v1/skills/{skill_id}")

        assert response.status_code == 200

    def test_get_skill_response_structure(self, client: TestClient):
        """Get skill response should have correct structure."""
        zip_content = create_valid_skill_zip()
        files = {"file": ("test-skill.zip", zip_content, "application/zip")}
        upload_response = client.post("/api/v1/skills/upload", files=files)
        skill_id = upload_response.json()["id"]

        response = client.get(f"/api/v1/skills/{skill_id}")
        data = response.json()

        assert data["id"] == skill_id
        assert "original_filename" in data
        assert "validation_status" in data
        assert "metadata" in data
        assert "files" in data

    def test_get_nonexistent_skill_returns_404(self, client: TestClient):
        """Get nonexistent skill should return 404."""
        fake_id = "00000000-0000-0000-0000-000000000000"

        response = client.get(f"/api/v1/skills/{fake_id}")

        assert response.status_code == 404
        data = response.json()
        assert data["detail"]["code"] == "NOT_FOUND"

    def test_get_skill_matches_upload_data(self, client: TestClient):
        """Get skill should return same data as upload."""
        zip_content = create_valid_skill_zip()
        files = {"file": ("test-skill.zip", zip_content, "application/zip")}
        upload_response = client.post("/api/v1/skills/upload", files=files)
        upload_data = upload_response.json()

        response = client.get(f"/api/v1/skills/{upload_data['id']}")
        data = response.json()

        assert data["id"] == upload_data["id"]
        assert data["original_filename"] == upload_data["original_filename"]
        assert data["validation_status"] == upload_data["validation_status"]
        assert data["metadata"] == upload_data["metadata"]
