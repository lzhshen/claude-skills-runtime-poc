"""Contract tests for POST /executions/{session_id}/cancel endpoint."""

from unittest.mock import patch
import pytest
from fastapi.testclient import TestClient
from src.models import ExecutionSession, ExecutionStatus
from datetime import datetime, timezone


class TestCancelEndpoint:
    """Tests for POST /executions/{session_id}/cancel endpoint."""

    def test_cancel_running_execution_returns_success(self, client: TestClient):
        """Cancel running execution should return success."""
        session_id = "test-session-id"

        # Mock get_session to return running session
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

            # Mock cancel_execution to return True
            with patch(
                "src.services.execution_service.ExecutionService.cancel_execution",
                new_callable=lambda: AsyncMock(return_value=True),
            ) as mock_cancel:
                # Need to use AsyncMock correctly with patch for async methods if called from async code
                # But here client is synchronous TestClient calling FastAPI app
                # FastAPI app calls async service method.
                # Standard patch with return_value=Future-like might be needed if not using AsyncMock
                # Actually, patch automatically handles async functions if passed AsyncMock?
                # Let's define the mock properly.

                # Note: TestClient runs FastAPI app in a way that handles async.
                # We need to ensure the service method is awaited.
                pass

        # Re-doing with simpler approach: mock the service method on the instance
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

            with patch(
                "src.services.execution_service.ExecutionService.cancel_execution"
            ) as mock_cancel:
                mock_cancel.return_value = True

                response = client.post(f"/api/v1/executions/{session_id}/cancel")

                assert response.status_code == 200
                assert response.json()["success"] is True

    def test_cancel_non_existent_session_returns_404(self, client: TestClient):
        """Cancel non-existent session should return 404."""
        with patch(
            "src.services.execution_service.ExecutionService.get_session", return_value=None
        ):
            response = client.post("/api/v1/executions/missing-id/cancel")
            assert response.status_code == 404

    def test_cancel_completed_session_returns_400(self, client: TestClient):
        """Cancel completed session should return 400."""
        session_id = "test-session-id"

        with patch("src.services.execution_service.ExecutionService.get_session") as mock_get:
            mock_session = ExecutionSession(
                id=session_id,
                skill_package_id="skill-id",
                skill_name="Test",
                user_prompt="Hi",
                status=ExecutionStatus.COMPLETED,
                started_at=datetime.now(timezone.utc),
                logs=[],
            )
            mock_get.return_value = mock_session

            # Service cancel checks status too, but API checks get_session first then calls cancel.
            # If cancel returns False, API returns 400.

            with patch(
                "src.services.execution_service.ExecutionService.cancel_execution"
            ) as mock_cancel:
                mock_cancel.return_value = False

                response = client.post(f"/api/v1/executions/{session_id}/cancel")

                assert response.status_code == 400
                assert response.json()["detail"]["error"]["code"] == "CANNOT_CANCEL"


from unittest.mock import AsyncMock
