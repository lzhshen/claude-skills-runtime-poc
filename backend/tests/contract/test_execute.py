"""Contract tests for POST /executions/skills/{skill_id}/execute endpoint."""

import io
import zipfile
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from src.models import ExecutionSession, ExecutionStatus
from src.services.execution_service import get_execution_service


def create_simple_skill_zip() -> bytes:
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("SKILL.md", "---\nname: Exec Test\ndescription: D\n---\nPrompt")
    buffer.seek(0)
    return buffer.read()


class TestExecuteEndpoint:
    """Tests for POST /executions/skills/{skill_id}/execute endpoint."""

    @pytest.fixture
    def uploaded_skill_id(self, client: TestClient) -> str:
        zip_content = create_simple_skill_zip()
        files = {"file": ("exec-skill.zip", zip_content, "application/zip")}
        response = client.post("/api/v1/skills/upload", files=files)
        return response.json()["id"]

    def test_execute_valid_skill_returns_200(self, client: TestClient, uploaded_skill_id: str):
        """Execute valid skill should return 200 and session ID."""
        # Mock execution service to avoid actual opencode connection
        with patch("src.services.execution_service.ExecutionService.start_execution") as mock_start:
            # Setup mock return value
            mock_session = ExecutionSession(
                id="test-session-id",
                skill_package_id=uploaded_skill_id,
                skill_name="Exec Test",
                user_prompt="Hello",
                status=ExecutionStatus.PENDING,
                started_at="2023-01-01T00:00:00Z",
                logs=[],
            )
            mock_start.return_value = mock_session

            response = client.post(
                f"/api/v1/executions/skills/{uploaded_skill_id}/execute", json={"prompt": "Hello"}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["session_id"] == "test-session-id"
            assert data["status"] == "pending"

    def test_execute_with_model_config(self, client: TestClient, uploaded_skill_id: str):
        """Execute with model config should pass config to service."""
        with patch("src.services.execution_service.ExecutionService.start_execution") as mock_start:
            mock_session = ExecutionSession(
                id="test-session-id",
                skill_package_id=uploaded_skill_id,
                skill_name="Exec Test",
                user_prompt="Hello",
                status=ExecutionStatus.PENDING,
                started_at="2023-01-01T00:00:00Z",
                logs=[],
            )
            mock_start.return_value = mock_session

            client.post(
                f"/api/v1/executions/skills/{uploaded_skill_id}/execute",
                json={"prompt": "Hello", "model": "gpt-4", "provider": "openai"},
            )

            # Verify mock was called with correct model config
            call_args = mock_start.call_args
            assert call_args is not None
            assert call_args.kwargs["model_config"].model_id == "gpt-4"
            assert call_args.kwargs["model_config"].provider_id == "openai"

    def test_execute_non_existent_skill_returns_404(self, client: TestClient):
        """Execute non-existent skill should return 404 (or 400 from service)."""
        # The service raises ValueError if skill not found, which API maps to 400 InvalidRequestError
        # But wait, looking at executions.py:
        # except ValueError as e: raise InvalidRequestError(str(e)).to_http_exception()
        # InvalidRequestError usually maps to 400.

        # We don't mock here to test the actual lookup logic failure
        response = client.post("/api/v1/executions/skills/bad-id/execute", json={"prompt": "Hello"})
        assert response.status_code == 400
