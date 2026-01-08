"""Configuration API endpoints."""

from fastapi import APIRouter

from ..utils.config import get_settings


router = APIRouter(prefix="/config", tags=["config"])


@router.get("/providers")
async def get_providers() -> dict:
    """Get available AI providers and their models."""
    settings = get_settings()

    # Return configured providers
    # In a real implementation, this would query the opencode server
    providers = [
        {
            "id": "anthropic",
            "name": "Anthropic",
            "models": [
                {"id": "claude-sonnet-4-20250514", "name": "Claude Sonnet 4"},
                {"id": "claude-3-5-sonnet-20241022", "name": "Claude 3.5 Sonnet"},
                {"id": "claude-3-5-haiku-20241022", "name": "Claude 3.5 Haiku"},
            ],
        },
        {
            "id": "openai",
            "name": "OpenAI",
            "models": [
                {"id": "gpt-4o", "name": "GPT-4o"},
                {"id": "gpt-4o-mini", "name": "GPT-4o Mini"},
            ],
        },
    ]

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
