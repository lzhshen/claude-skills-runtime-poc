"""Contract tests for GET /executions endpoint."""

from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from src.models import ExecutionSession, ExecutionStatus
from datetime import datetime, timezone


class TestExecutionListEndpoint:
    """Tests for GET /executions endpoint."""

    def test_list_executions_returns_200(self, client: TestClient):
        """List executions should return 200 and list of sessions."""
        with patch("src.services.execution_service.ExecutionService.list_sessions") as mock_list:
            mock_session = ExecutionSession(
                id="session-1",
                skill_package_id="skill-1",
                skill_name="Test Skill",
                user_prompt="Run",
                status=ExecutionStatus.COMPLETED,
                started_at=datetime.now(timezone.utc),
                ended_at=datetime.now(timezone.utc),
                logs=[],
            )
            mock_list.return_value = [mock_session]

            response = client.get("/api/v1/executions")

            assert response.status_code == 200
            data = response.json()
            assert "sessions" in data
            assert len(data["sessions"]) == 1
            assert data["sessions"][0]["id"] == "session-1"
            assert data["sessions"][0]["status"] == "completed"

    def test_list_executions_filter_by_skill(self, client: TestClient):
        """List executions should accept skill_id filter."""
        with patch("src.services.execution_service.ExecutionService.list_sessions") as mock_list:
            mock_list.return_value = []

            client.get("/api/v1/executions?skill_id=some-skill")

            mock_list.assert_called_with("some-skill")
