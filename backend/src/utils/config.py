"""Configuration management for the backend."""

import os
from functools import lru_cache
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Server settings
    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8000)
    debug: bool = Field(default=False)

    # OpenCode Server configuration
    opencode_server_url: str = Field(default="http://localhost:3000")

    # Temporary file storage
    temp_dir: str = Field(default="/tmp/claude-skills-runtime")

    # Limits
    max_upload_size_mb: int = Field(default=10)
    execution_timeout_seconds: int = Field(default=300)

    # CORS settings
    cors_origins: list[str] = Field(default=["http://localhost:5173", "http://127.0.0.1:5173"])

    @property
    def max_upload_size_bytes(self) -> int:
        """Get maximum upload size in bytes."""
        return self.max_upload_size_mb * 1024 * 1024


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
