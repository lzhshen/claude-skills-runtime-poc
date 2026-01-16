"""Contract tests for GET /executions/{session_id} endpoint."""

from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from src.models import ExecutionSession, ExecutionStatus
from datetime import datetime, timezone


class TestExecutionDetailEndpoint:
    """Tests for GET /executions/{session_id} endpoint."""

    def test_get_execution_returns_200(self, client: TestClient):
        """Get execution details should return 200 and session data."""
        session_id = "test-session-id"

        with patch("src.services.execution_service.ExecutionService.get_session") as mock_get:
            mock_session = ExecutionSession(
                id=session_id,
                skill_package_id="skill-id",
                skill_name="Test Skill",
                user_prompt="Run this",
                status=ExecutionStatus.RUNNING,
                started_at=datetime.now(timezone.utc),
                logs=[],
            )
            mock_get.return_value = mock_session

            response = client.get(f"/api/v1/executions/{session_id}")

            assert response.status_code == 200
            data = response.json()
            assert data["id"] == session_id
            assert data["status"] == "running"
            assert data["skill_name"] == "Test Skill"

    def test_get_non_existent_execution_returns_404(self, client: TestClient):
        """Get non-existent execution should return 404."""
        with patch(
            "src.services.execution_service.ExecutionService.get_session", return_value=None
        ):
            response = client.get("/api/v1/executions/missing-id")
            assert response.status_code == 404
