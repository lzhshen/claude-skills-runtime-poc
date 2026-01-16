"""Contract tests for GET /config/providers endpoint."""

import pytest
from fastapi.testclient import TestClient


class TestProvidersEndpoint:
    """Tests for GET /config/providers endpoint."""

    def test_get_providers_returns_200(self, client: TestClient):
        """Get providers should return 200 and list of providers."""
        response = client.get("/api/v1/config/providers")
        assert response.status_code == 200

        data = response.json()
        assert "providers" in data
        assert len(data["providers"]) > 0

        # Verify structure
        provider = data["providers"][0]
        assert "id" in provider
        assert "name" in provider
        assert "models" in provider

        # Verify default provider (as per current implementation)
        assert provider["id"] == "local"
        assert len(provider["models"]) > 0
        assert provider["models"][0]["id"] == "GLM-4.7"

    def test_get_agents_returns_200(self, client: TestClient):
        """Get agents should return 200 and list of agents."""
        response = client.get("/api/v1/config/agents")
        assert response.status_code == 200

        data = response.json()
        assert "agents" in data
        assert len(data["agents"]) > 0

        # Verify structure
        agent = data["agents"][0]
        assert "id" in agent
        assert "name" in agent
        assert "description" in agent
