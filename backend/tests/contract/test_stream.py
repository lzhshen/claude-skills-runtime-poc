"""Contract tests for GET /executions/{session_id}/stream endpoint."""

import json
from unittest.mock import MagicMock, patch, AsyncMock
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


class TestStreamEndpoint:
    """Tests for GET /executions/{session_id}/stream endpoint."""

    def test_stream_logs_returns_sse(self, client: TestClient):
        """Stream logs should return text/event-stream."""
        session_id = "test-session-id"

        # Mock get_session to return a valid session
        with patch("src.services.execution_service.ExecutionService.get_session") as mock_get:
            mock_session = ExecutionSession(
                id=session_id,
                skill_package_id="skill-id",
                skill_name="Test",
                user_prompt="Hi",
                status=ExecutionStatus.RUNNING,
                started_at=datetime.now(timezone.utc),
                logs=[],
            )
            mock_get.return_value = mock_session

            # Mock stream_logs to yield some logs
            async def mock_stream(*args, **kwargs):
                log = ExecutionLog(
                    session_id=session_id,
                    timestamp=datetime.now(timezone.utc),
                    log_type=LogType.MESSAGE,
                    content=MessageLogContent(
                        message=Message(role=MessageRole.ASSISTANT, content="Hello")
                    ),
                )
                yield log

            with patch(
                "src.services.execution_service.ExecutionService.stream_logs",
                side_effect=mock_stream,
            ):
                response = client.get(f"/api/v1/executions/{session_id}/stream")

                assert response.status_code == 200
                assert "text/event-stream" in response.headers["content-type"]

                # Verify content format (basic check)
                content = response.text
                assert "data: " in content
                assert '"type": "message"' in content
                assert '"content": "Hello"' in content

    def test_stream_non_existent_session_returns_404(self, client: TestClient):
        """Stream non-existent session should return 404."""
        # Ensure get_session returns None (default if not found in storage usually)
        # But we rely on real storage being empty or mocked
        # Let's mock it to be sure
        with patch(
            "src.services.execution_service.ExecutionService.get_session", return_value=None
        ):
            response = client.get("/api/v1/executions/missing-id/stream")
            assert response.status_code == 404
