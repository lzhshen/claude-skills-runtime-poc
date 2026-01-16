"""Contract tests for GET /executions/{session_id}/logs endpoint."""

from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from src.models import (
    ExecutionSession,
    ExecutionStatus,
    ExecutionLog,
    LogType,
    MessageLogContent,
    Message,
    MessageRole,
)
from datetime import datetime, timezone


class TestLogsEndpoint:
    """Tests for GET /executions/{session_id}/logs endpoint."""

    def test_get_logs_returns_200(self, client: TestClient):
        """Get logs should return 200 and list of logs."""
        session_id = "test-session-id"

        with patch("src.services.execution_service.ExecutionService.get_session") as mock_get:
            # Create logs
            log1 = ExecutionLog(
                session_id=session_id,
                timestamp=datetime.now(timezone.utc),
                log_type=LogType.MESSAGE,
                content=MessageLogContent(message=Message(role=MessageRole.USER, content="Hello")),
            )

            mock_session = ExecutionSession(
                id=session_id,
                skill_package_id="skill-id",
                skill_name="Test",
                user_prompt="Hello",
                status=ExecutionStatus.RUNNING,
                started_at=datetime.now(timezone.utc),
                logs=[log1],
            )
            mock_get.return_value = mock_session

            response = client.get(f"/api/v1/executions/{session_id}/logs")

            assert response.status_code == 200
            data = response.json()
            assert data["session_id"] == session_id
            assert len(data["logs"]) == 1
            assert data["logs"][0]["type"] == "message"
            assert data["logs"][0]["content"]["message"]["content"] == "Hello"

    def test_get_logs_non_existent_session_returns_404(self, client: TestClient):
        """Get logs for non-existent session should return 404."""
        with patch(
            "src.services.execution_service.ExecutionService.get_session", return_value=None
        ):
            response = client.get("/api/v1/executions/missing-id/logs")
            assert response.status_code == 404
