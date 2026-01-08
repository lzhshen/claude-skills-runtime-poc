"""Main OpenCode client class."""

from typing import Optional

import httpx

from .config import ConfigAPI
from .events import EventStreamHandler
from .models import OpencodeHealthResponse
from .session import SessionAPI


class OpencodeClient:
    """Client for interacting with opencode server."""

    def __init__(self, base_url: str = "http://localhost:3000"):
        self.base_url = base_url.rstrip("/")
        self._client: Optional[httpx.AsyncClient] = None
        self._session: Optional[SessionAPI] = None
        self._config: Optional[ConfigAPI] = None
        self._events: Optional[EventStreamHandler] = None

    @property
    def client(self) -> httpx.AsyncClient:
        """Get or create HTTP client."""
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(30.0, connect=10.0),
            )
        return self._client

    @property
    def session(self) -> SessionAPI:
        """Get session API wrapper."""
        if self._session is None:
            self._session = SessionAPI(self.base_url, self.client)
        return self._session

    @property
    def config(self) -> ConfigAPI:
        """Get config API wrapper."""
        if self._config is None:
            self._config = ConfigAPI(self.base_url, self.client)
        return self._config

    @property
    def events(self) -> EventStreamHandler:
        """Get event stream handler."""
        if self._events is None:
            self._events = EventStreamHandler(self.base_url)
        return self._events

    async def health(self) -> OpencodeHealthResponse:
        """Check server health."""
        try:
            response = await self.client.get(f"{self.base_url}/global/health")
            response.raise_for_status()
            data = response.json()
            return OpencodeHealthResponse(
                status=data.get("status", "healthy"),
                version=data.get("version"),
            )
        except Exception as e:
            return OpencodeHealthResponse(status="unhealthy", version=None)

    async def is_healthy(self) -> bool:
        """Check if server is healthy."""
        health = await self.health()
        return health.status == "healthy"

    async def close(self) -> None:
        """Close the client."""
        if self._client:
            await self._client.aclose()
            self._client = None

    async def __aenter__(self) -> "OpencodeClient":
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Async context manager exit."""
        await self.close()
