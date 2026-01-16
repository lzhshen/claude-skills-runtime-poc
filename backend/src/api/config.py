"""Configuration API endpoints."""

from fastapi import APIRouter

router = APIRouter(prefix="/config", tags=["config"])


@router.get("/providers")
async def get_providers() -> dict:
    """Get available AI providers and their models."""
    # Fixed model list with GLM-4.7 as default
    providers = [{"id": "local", "name": "Local", "models": [{"id": "GLM-4.7", "name": "GLM-4.7"}]}]

    return {"providers": providers}


@router.get("/agents")
async def get_agents() -> dict:
    """Get available agent configurations."""
    # Return available agent types
    agents = [
        {
            "id": "default",
            "name": "Default Agent",
            "description": "Standard agent with all capabilities",
        },
        {
            "id": "code",
            "name": "Code Agent",
            "description": "Optimized for code generation and editing",
        },
        {
            "id": "research",
            "name": "Research Agent",
            "description": "Optimized for information gathering and analysis",
        },
    ]

    return {"agents": agents}
