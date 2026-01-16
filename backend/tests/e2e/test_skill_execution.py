"""End-to-end tests for skill execution requiring a running OpenCode server."""

import asyncio
import os

import pytest

from src.utils.opencode import close_opencode_client, get_opencode_client

pytestmark = pytest.mark.e2e


def is_opencode_server_available() -> bool:
    import httpx

    try:
        response = httpx.get("http://localhost:4096/global/health", timeout=2.0)
        return response.status_code == 200
    except Exception:
        return False


requires_opencode_server = pytest.mark.skipif(
    not is_opencode_server_available(),
    reason="OpenCode server not available at localhost:4096",
)


@pytest.fixture
async def opencode_client():
    client = get_opencode_client()
    yield client
    await close_opencode_client()


class TestOpencodeServerIntegration:
    @requires_opencode_server
    async def test_health_check(self, opencode_client):
        response = await opencode_client.global_.retrieve_health()
        assert response is not None

    @requires_opencode_server
    async def test_create_session(self, opencode_client):
        session = await opencode_client.session.create(
            directory=os.getcwd(),
            title="E2E Test Session",
        )
        assert session.id is not None
        assert session.title == "E2E Test Session"

    @requires_opencode_server
    async def test_session_list(self, opencode_client):
        sessions = await opencode_client.session.list(directory=os.getcwd())
        assert sessions is not None
