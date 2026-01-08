"""Contract tests for POST /skills/upload endpoint."""

import io
import zipfile

import pytest
from fastapi.testclient import TestClient

from src.main import app


@pytest.fixture
def client():
    """Create test client."""
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

This is a test skill that does something useful.
"""
        zf.writestr("SKILL.md", skill_md_content)
    buffer.seek(0)
    return buffer.read()


def create_invalid_skill_zip_missing_skill_md() -> bytes:
    """Create a skill package zip without SKILL.md."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("README.md", "# Some readme")
    buffer.seek(0)
    return buffer.read()


def create_invalid_skill_zip_missing_name() -> bytes:
    """Create a skill package with SKILL.md missing name field."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        skill_md_content = """---
description: A test skill without name
---

# Instructions

Missing name field.
"""
        zf.writestr("SKILL.md", skill_md_content)
    buffer.seek(0)
    return buffer.read()


def create_invalid_skill_zip_invalid_yaml() -> bytes:
    """Create a skill package with invalid YAML in SKILL.md."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        skill_md_content = """---
name: Test Skill
description: [invalid yaml
---

# Instructions

Invalid YAML.
"""
        zf.writestr("SKILL.md", skill_md_content)
    buffer.seek(0)
    return buffer.read()


class TestUploadEndpoint:
    """Tests for POST /skills/upload endpoint."""

    def test_upload_valid_skill_returns_200(self, client: TestClient):
        """Upload valid skill should return 200."""
        zip_content = create_valid_skill_zip()
        files = {"file": ("test-skill.zip", zip_content, "application/zip")}

        response = client.post("/api/v1/skills/upload", files=files)

        assert response.status_code == 200

    def test_upload_valid_skill_response_structure(self, client: TestClient):
        """Upload response should have correct structure."""
        zip_content = create_valid_skill_zip()
        files = {"file": ("test-skill.zip", zip_content, "application/zip")}

        response = client.post("/api/v1/skills/upload", files=files)
        data = response.json()

        assert "id" in data
        assert "original_filename" in data
        assert "validation_status" in data
        assert "validation_errors" in data
        assert "metadata" in data
        assert "files" in data
        assert "uploaded_at" in data
        assert "size_bytes" in data

    def test_upload_valid_skill_status_is_valid(self, client: TestClient):
        """Valid skill should have status 'valid'."""
        zip_content = create_valid_skill_zip()
        files = {"file": ("test-skill.zip", zip_content, "application/zip")}

        response = client.post("/api/v1/skills/upload", files=files)
        data = response.json()

        assert data["validation_status"] == "valid"
        assert len(data["validation_errors"]) == 0

    def test_upload_valid_skill_metadata_extracted(self, client: TestClient):
        """Valid skill should have metadata extracted."""
        zip_content = create_valid_skill_zip()
        files = {"file": ("test-skill.zip", zip_content, "application/zip")}

        response = client.post("/api/v1/skills/upload", files=files)
        data = response.json()

        assert data["metadata"] is not None
        assert data["metadata"]["name"] == "Test Skill"
        assert data["metadata"]["description"] == "A test skill for unit testing"

    def test_upload_missing_skill_md_returns_invalid(self, client: TestClient):
        """Missing SKILL.md should return invalid status."""
        zip_content = create_invalid_skill_zip_missing_skill_md()
        files = {"file": ("invalid-skill.zip", zip_content, "application/zip")}

        response = client.post("/api/v1/skills/upload", files=files)
        data = response.json()

        assert response.status_code == 200
        assert data["validation_status"] == "invalid"
        assert len(data["validation_errors"]) > 0
        assert any(e["code"] == "MISSING_SKILL_MD" for e in data["validation_errors"])

    def test_upload_missing_name_returns_invalid(self, client: TestClient):
        """Missing name field should return invalid status."""
        zip_content = create_invalid_skill_zip_missing_name()
        files = {"file": ("invalid-skill.zip", zip_content, "application/zip")}

        response = client.post("/api/v1/skills/upload", files=files)
        data = response.json()

        assert response.status_code == 200
        assert data["validation_status"] == "invalid"
        assert any(e["code"] == "MISSING_NAME" for e in data["validation_errors"])

    def test_upload_invalid_yaml_returns_invalid(self, client: TestClient):
        """Invalid YAML should return invalid status."""
        zip_content = create_invalid_skill_zip_invalid_yaml()
        files = {"file": ("invalid-skill.zip", zip_content, "application/zip")}

        response = client.post("/api/v1/skills/upload", files=files)
        data = response.json()

        assert response.status_code == 200
        assert data["validation_status"] == "invalid"
        assert any(e["code"] == "INVALID_YAML" for e in data["validation_errors"])

    def test_upload_no_file_returns_400(self, client: TestClient):
        """Upload without file should return 400."""
        response = client.post("/api/v1/skills/upload")

        assert response.status_code == 422  # FastAPI validation error

    def test_upload_non_zip_returns_400(self, client: TestClient):
        """Upload non-zip file should return 400."""
        files = {"file": ("test.txt", b"not a zip file", "text/plain")}

        response = client.post("/api/v1/skills/upload", files=files)

        assert response.status_code == 400
        data = response.json()
        assert data["error"]["code"] == "INVALID_ZIP"

    def test_upload_preserves_original_filename(self, client: TestClient):
        """Original filename should be preserved."""
        zip_content = create_valid_skill_zip()
        files = {"file": ("my-custom-skill.zip", zip_content, "application/zip")}

        response = client.post("/api/v1/skills/upload", files=files)
        data = response.json()

        assert data["original_filename"] == "my-custom-skill.zip"
