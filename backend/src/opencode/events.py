"""SSE event stream handler for opencode."""

import json
from typing import Any, AsyncIterator, Optional

import aiohttp


class SSEEvent:
    """Represents a Server-Sent Event."""

    def __init__(
        self,
        event: str = "message",
        data: str = "",
        id: Optional[str] = None,
        retry: Optional[int] = None,
    ):
        self.event = event
        self.data = data
        self.id = id
        self.retry = retry

    def json(self) -> Any:
        """Parse data as JSON."""
        return json.loads(self.data) if self.data else None


async def parse_sse_stream(response: aiohttp.ClientResponse) -> AsyncIterator[SSEEvent]:
    """Parse SSE stream from aiohttp response."""
    event = "message"
    data_lines: list[str] = []
    event_id: Optional[str] = None
    retry: Optional[int] = None

    async for line_bytes in response.content:
        line = line_bytes.decode("utf-8").rstrip("\r\n")

        if not line:
            # Empty line means end of event
            if data_lines:
                yield SSEEvent(
                    event=event,
                    data="\n".join(data_lines),
                    id=event_id,
                    retry=retry,
                )
            # Reset for next event
            event = "message"
            data_lines = []
            event_id = None
            retry = None
            continue

        if line.startswith(":"):
            # Comment, ignore
            continue

        if ":" in line:
            field, _, value = line.partition(":")
            value = value.lstrip(" ")
        else:
            field = line
            value = ""

        if field == "event":
            event = value
        elif field == "data":
            data_lines.append(value)
        elif field == "id":
            event_id = value
        elif field == "retry":
            try:
                retry = int(value)
            except ValueError:
                pass

    # Handle any remaining data
    if data_lines:
        yield SSEEvent(
            event=event,
            data="\n".join(data_lines),
            id=event_id,
            retry=retry,
        )


class EventStreamHandler:
    """Handler for opencode SSE event streams."""

    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")

    async def subscribe(
        self,
        session_id: Optional[str] = None,
        timeout: Optional[float] = None,
    ) -> AsyncIterator[SSEEvent]:
        """Subscribe to event stream."""
        url = f"{self.base_url}/event"
        params = {}
        if session_id:
            params["sessionID"] = session_id

        timeout_config = aiohttp.ClientTimeout(total=timeout) if timeout else None

        async with aiohttp.ClientSession(timeout=timeout_config) as session:
            async with session.get(url, params=params) as response:
                response.raise_for_status()
                async for event in parse_sse_stream(response):
                    yield event

    async def subscribe_session(
        self,
        session_id: str,
        timeout: Optional[float] = None,
    ) -> AsyncIterator[SSEEvent]:
        """Subscribe to events for a specific session."""
        async for event in self.subscribe(session_id=session_id, timeout=timeout):
            yield event
