"""
AI Skill Exchange — Application Configuration

Uses pydantic-settings to load configuration from environment variables.
Supports both SQLite (local) and PostgreSQL (production).
"""

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


from pathlib import Path

DEFAULT_DB_PATH = (Path(__file__).resolve().parents[1] / "skill_exchange.db").as_posix()


class Settings(BaseSettings):
    """Application settings loaded from environment variables or .env file."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- App ---
    app_name: str = "AI Skill Exchange"
    app_version: str = "0.1.0"
    debug: bool = True

    # --- Database ---
    database_url: str = f"sqlite+aiosqlite:///{DEFAULT_DB_PATH}"

    # --- AI ---
    ai_provider: Literal["mock", "local", "ollama", "cloud"] = "mock"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3"
    llm_api_key: str = ""
    llm_api_url: str = ""

    # --- Credit Economy (Stage 7) ---
    allow_negative_balance: bool = False
    default_session_credit_cost: int = 10
    max_daily_sessions_per_pair: int = 3
    high_demand_threshold: float = 1.5

    # --- Server ---
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    backend_reload: bool = True
    cors_origins: list[str] = ["http://localhost:3000"]

    @property
    def is_sqlite(self) -> bool:
        """Check if using SQLite database."""
        return self.database_url.startswith("sqlite")

    @property
    def is_postgres(self) -> bool:
        """Check if using PostgreSQL database."""
        return "postgresql" in self.database_url


@lru_cache
def get_settings() -> Settings:
    """Get cached application settings."""
    return Settings()
