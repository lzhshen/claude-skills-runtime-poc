"""Config API wrapper for opencode."""

from typing import Any

import httpx

from .models import OpencodeAgent, OpencodeModel, OpencodeProvider


class ConfigAPI:
    """API wrapper for opencode configuration operations."""

    def __init__(self, base_url: str, client: httpx.AsyncClient):
        self.base_url = base_url.rstrip("/")
        self.client = client

    async def providers(self) -> tuple[list[OpencodeProvider], list[OpencodeModel]]:
        """Get available providers and models."""
        response = await self.client.get(f"{self.base_url}/config/providers")
        response.raise_for_status()
        data = response.json()

        providers = [
            OpencodeProvider(id=p.get("id", ""), name=p.get("name", ""))
            for p in data.get("providers", [])
        ]

        models = [
            OpencodeModel(
                id=m.get("id", ""),
                name=m.get("name", ""),
                provider=m.get("provider", ""),
            )
            for m in data.get("models", [])
        ]

        return providers, models

    async def agents(self) -> list[OpencodeAgent]:
        """Get available agents."""
        response = await self.client.get(f"{self.base_url}/app/agents")
        response.raise_for_status()
        data = response.json()

        return [
            OpencodeAgent(
                id=a.get("id", ""),
                name=a.get("name", ""),
                description=a.get("description"),
            )
            for a in data.get("agents", [])
        ]

    async def get_config(self) -> dict[str, Any]:
        """Get full configuration."""
        response = await self.client.get(f"{self.base_url}/config")
        response.raise_for_status()
        return response.json()
