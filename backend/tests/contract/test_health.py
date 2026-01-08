"""Contract tests for health check endpoint."""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock

from src.main import app


@pytest.fixture
def client():
    """Create test client with mocked opencode_client."""
    # Mock the opencode client
    mock_client = MagicMock()
    mock_client.check_health = AsyncMock(return_value=True)
    mock_client.base_url = "http://localhost:8080"
    mock_client.close = AsyncMock()

    app.state.opencode_client = mock_client
    return TestClient(app)


class TestHealthEndpoint:
    """Tests for GET /health endpoint."""

    def test_health_returns_200(self, client: TestClient):
        """Health endpoint should return 200 status code."""
        response = client.get("/api/v1/health")
        assert response.status_code == 200

    def test_health_response_structure(self, client: TestClient):
        """Health response should have correct structure."""
        response = client.get("/api/v1/health")
        data = response.json()

        assert "status" in data
        assert "version" in data
        assert "opencode_server" in data

        opencode_server = data["opencode_server"]
        assert "status" in opencode_server
        assert "url" in opencode_server

    def test_health_status_values(self, client: TestClient):
        """Health status should be 'healthy' or 'unhealthy'."""
        response = client.get("/api/v1/health")
        data = response.json()

        assert data["status"] in ["healthy", "unhealthy"]

    def test_health_version_format(self, client: TestClient):
        """Version should be a string."""
        response = client.get("/api/v1/health")
        data = response.json()

        assert isinstance(data["version"], str)
        assert len(data["version"]) > 0

    def test_opencode_server_status_values(self, client: TestClient):
        """OpenCode server status should be 'connected' or 'disconnected'."""
        response = client.get("/api/v1/health")
        data = response.json()

        assert data["opencode_server"]["status"] in ["connected", "disconnected"]

    def test_opencode_server_url_present(self, client: TestClient):
        """OpenCode server URL should be present."""
        response = client.get("/api/v1/health")
        data = response.json()

        assert "url" in data["opencode_server"]
        assert isinstance(data["opencode_server"]["url"], str)
