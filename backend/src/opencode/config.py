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

        providers = []
        models = []

        for p_data in data.get("providers", []):
            p_id = p_data.get("id", "")
            p_name = p_data.get("name", "")
            providers.append(OpencodeProvider(id=p_id, name=p_name))

            # Extract models. The 'local' provider (and possibly others) 
            # seems to return models in a 'providers' dict key.
            # We also check 'models' key if it exists.
            
            # Check 'models' key which was observed in logs
            provider_models = p_data.get("models")
            if not provider_models:
                 # Fallback to 'providers' key just in case
                 provider_models = p_data.get("providers")
            
            if isinstance(provider_models, dict):
                for m_id, m_data in provider_models.items():
                    models.append(OpencodeModel(
                        id=m_data.get("id", m_id),
                        name=m_data.get("name", m_id),
                        provider=p_id,
                    ))
            elif isinstance(provider_models, list):
                for m_data in provider_models:
                    if isinstance(m_data, dict):
                         models.append(OpencodeModel(
                            id=m_data.get("id", ""),
                            name=m_data.get("name", ""),
                            provider=p_id,
                         ))

        # Also check global models list if present
        for m in data.get("models", []):
            models.append(
                OpencodeModel(
                    id=m.get("id", ""),
                    name=m.get("name", ""),
                    provider=m.get("provider", ""),
                )
            )

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
