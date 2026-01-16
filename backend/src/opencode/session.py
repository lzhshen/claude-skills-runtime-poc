"""Session API wrapper for opencode."""

from typing import Any, Optional

import httpx

from .models import OpencodeSession


class SessionAPI:
    """API wrapper for opencode session operations."""

    def __init__(self, base_url: str, client: httpx.AsyncClient):
        self.base_url = base_url.rstrip("/")
        self.client = client

    async def create(self, path: Optional[str] = None, **kwargs: Any) -> OpencodeSession:
        """Create a new session."""
        payload: dict[str, Any] = kwargs.copy()
        if path:
            payload["path"] = path

        response = await self.client.post(f"{self.base_url}/session", json=payload)
        response.raise_for_status()
        data = response.json()
        return OpencodeSession(id=data.get("id", data.get("sessionID", "")))

    async def delete(self, session_id: str) -> None:
        """Delete a session."""
        response = await self.client.delete(f"{self.base_url}/session/{session_id}")
        response.raise_for_status()

    async def prompt(
        self,
        session_id: str,
        content: str,
        no_reply: bool = False,
    ) -> dict[str, Any]:
        """Send a prompt to a session."""
        # Updated to match OpenCode API which expects 'parts' array
        payload = {
            "parts": [{"type": "text", "text": content}],
        }
        if no_reply:
            payload["noReply"] = True

        response = await self.client.post(
            f"{self.base_url}/session/{session_id}/prompt_async",
            json=payload,
        )
        if response.status_code >= 400:
            print(f"ERROR: prompt_async failed: {response.status_code} {response.text}")
        response.raise_for_status()
        if response.status_code == 204 or not response.content:
            return {}
        return response.json()

    async def abort(self, session_id: str) -> None:
        """Abort a running session."""
        response = await self.client.post(f"{self.base_url}/session/{session_id}/abort")
        response.raise_for_status()

    async def get(self, session_id: str) -> dict[str, Any]:
        """Get session details."""
        response = await self.client.get(f"{self.base_url}/session/{session_id}")
        response.raise_for_status()
        return response.json()

    async def list(self) -> list[dict[str, Any]]:
        """List all sessions."""
        response = await self.client.get(f"{self.base_url}/session")
        response.raise_for_status()
        return response.json()
