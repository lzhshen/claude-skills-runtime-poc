"""Unit tests for OpenCode SDK adapter using respx mocking."""

import pytest
import respx
from httpx import Response

from src.utils.opencode import close_opencode_client, get_opencode_client


class TestOpencodeClientFactory:
    @pytest.fixture(autouse=True)
    async def reset_client(self):
        await close_opencode_client()
        yield
        await close_opencode_client()

    def test_get_client_returns_same_instance(self):
        client1 = get_opencode_client()
        client2 = get_opencode_client()
        assert client1 is client2

    @respx.mock
    async def test_client_health_check_success(self):
        respx.get("http://localhost:4096/global/health").mock(
            return_value=Response(200, json={"status": "ok", "version": "1.0.0"})
        )

        client = get_opencode_client()
        response = await client.global_.retrieve_health()

        assert response.status == "ok"
        assert response.version == "1.0.0"

    @respx.mock
    async def test_client_session_create(self):
        respx.post("http://localhost:4096/session").mock(
            return_value=Response(
                200,
                json={
                    "id": "test-session-id",
                    "title": "Test Session",
                    "time": {"start": 0, "end": 0},
                },
            )
        )

        client = get_opencode_client()
        session = await client.session.create(
            directory="/tmp/test",
            title="Test Session",
        )

        assert session.id == "test-session-id"
        assert session.title == "Test Session"

    async def test_close_client_resets_instance(self):
        client1 = get_opencode_client()
        await close_opencode_client()
        client2 = get_opencode_client()
        assert client1 is not client2
