"""Health check endpoint."""

from fastapi import APIRouter, Request
from pydantic import BaseModel

router = APIRouter()


class OpencodeServerStatus(BaseModel):
    """OpenCode server status."""

    status: str
    url: str
    error: str | None = None


class HealthResponse(BaseModel):
    """Health check response."""

    status: str
    version: str
    opencode_server: OpencodeServerStatus


@router.get("/health", response_model=HealthResponse)
async def health_check(request: Request) -> HealthResponse:
    """Check application health."""
    from ..utils.config import get_settings

    settings = get_settings()
    opencode_client = request.app.state.opencode_client

    try:
        health_response = await opencode_client.global_.retrieve_health()
        is_healthy = health_response.status == "ok" if hasattr(health_response, "status") else True
        opencode_status = OpencodeServerStatus(
            status="connected" if is_healthy else "disconnected",
            url=settings.opencode_server_url,
            error=None if is_healthy else "Health check failed",
        )
    except Exception as e:
        opencode_status = OpencodeServerStatus(
            status="disconnected",
            url=settings.opencode_server_url,
            error=str(e),
        )

    overall_status = "healthy" if opencode_status.status == "connected" else "unhealthy"

    return HealthResponse(
        status=overall_status,
        version="0.1.0",
        opencode_server=opencode_status,
    )
