"""OpenCode SDK client factory and utilities."""


from opencode_sdk_new import AsyncOpencodeSDKNew

from .config import get_settings

# Global client instance
_opencode_client: AsyncOpencodeSDKNew | None = None


def get_opencode_client() -> AsyncOpencodeSDKNew:
    """Get or create the global OpenCode SDK client.

    Returns:
        AsyncOpencodeSDKNew: The async OpenCode client instance.
    """
    global _opencode_client
    if _opencode_client is None:
        settings = get_settings()
        _opencode_client = AsyncOpencodeSDKNew(
            base_url=settings.opencode_server_url,
            api_key="dummy",  # Local server doesn't require authentication
            timeout=30.0,
        )
    return _opencode_client


async def close_opencode_client() -> None:
    """Close the global OpenCode client and release resources."""
    global _opencode_client
    if _opencode_client is not None:
        await _opencode_client.close()
        _opencode_client = None
