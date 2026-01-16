"""Unit tests for Opencode Session API wrapper."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from src.opencode.session import SessionAPI
from src.opencode.models import OpencodeSession


class TestSessionAPI:
    """Tests for SessionAPI class."""

    @pytest.fixture
    def mock_client(self):
        """Create a mock httpx client."""
        client = AsyncMock()
        client.base_url = "http://test-server"
        return client

    @pytest.fixture
    def session_api(self, mock_client):
        """Create a SessionAPI instance."""
        return SessionAPI("http://test-server", mock_client)

    @pytest.mark.asyncio
    async def test_create_session(self, session_api, mock_client):
        """Test creating a session."""
        mock_response = MagicMock()
        mock_response.json.return_value = {"id": "session-123"}
        mock_response.raise_for_status = MagicMock()
        mock_client.post.return_value = mock_response

        session = await session_api.create(model="gpt-4")

        assert isinstance(session, OpencodeSession)
        assert session.id == "session-123"
        mock_client.post.assert_called_once()
        args, kwargs = mock_client.post.call_args
        assert kwargs["json"]["model"] == "gpt-4"

    @pytest.mark.asyncio
    async def test_create_session_with_path(self, session_api, mock_client):
        """Test creating a session with path."""
        mock_response = MagicMock()
        mock_response.json.return_value = {"id": "session-123"}
        mock_client.post.return_value = mock_response

        await session_api.create(path="/tmp/test")

        args, kwargs = mock_client.post.call_args
        assert kwargs["json"]["path"] == "/tmp/test"

    @pytest.mark.asyncio
    async def test_delete_session(self, session_api, mock_client):
        """Test deleting a session."""
        mock_response = MagicMock()
        mock_response.raise_for_status = MagicMock()
        mock_client.delete.return_value = mock_response

        await session_api.delete("session-123")

        mock_client.delete.assert_called_with("http://test-server/session/session-123")

    @pytest.mark.asyncio
    async def test_prompt_session(self, session_api, mock_client):
        """Test prompting a session."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"result": "ok"}
        mock_client.post.return_value = mock_response

        result = await session_api.prompt("session-123", "Hello")

        assert result == {"result": "ok"}
        mock_client.post.assert_called_with(
            "http://test-server/session/session-123/prompt_async",
            json={"parts": [{"type": "text", "text": "Hello"}]},
        )

    @pytest.mark.asyncio
    async def test_prompt_session_no_reply(self, session_api, mock_client):
        """Test prompting a session with no_reply."""
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {}
        mock_client.post.return_value = mock_response

        await session_api.prompt("session-123", "Hello", no_reply=True)

        args, kwargs = mock_client.post.call_args
        assert kwargs["json"]["noReply"] is True

    @pytest.mark.asyncio
    async def test_abort_session(self, session_api, mock_client):
        """Test aborting a session."""
        mock_response = MagicMock()
        mock_client.post.return_value = mock_response

        await session_api.abort("session-123")

        mock_client.post.assert_called_with("http://test-server/session/session-123/abort")

    @pytest.mark.asyncio
    async def test_get_session(self, session_api, mock_client):
        """Test getting session details."""
        mock_response = MagicMock()
        mock_response.json.return_value = {"id": "session-123", "status": "running"}
        mock_client.get.return_value = mock_response

        result = await session_api.get("session-123")

        assert result["id"] == "session-123"
        mock_client.get.assert_called_with("http://test-server/session/session-123")

    @pytest.mark.asyncio
    async def test_list_sessions(self, session_api, mock_client):
        """Test listing sessions."""
        mock_response = MagicMock()
        mock_response.json.return_value = [{"id": "session-123"}]
        mock_client.get.return_value = mock_response

        result = await session_api.list()

        assert len(result) == 1
        assert result[0]["id"] == "session-123"
        mock_client.get.assert_called_with("http://test-server/session")
