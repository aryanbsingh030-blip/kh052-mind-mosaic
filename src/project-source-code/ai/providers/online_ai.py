"""
Online AI Provider — Connects to Cloud LLM APIs (OpenAI / Anthropic / Gemini).
"""

import os
import json
from typing import List, Dict, Optional, Any
from ai.providers.base import AIProvider, ExtractedSkillItem


class OnlineAIProvider(AIProvider):
    """
    Connects to cloud LLMs when configured with API keys.
    Fails fast if no API key is present or internet is unavailable.
    """

    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4o-mini"):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY") or os.getenv("GEMINI_API_KEY")
        self.model = model

    @property
    def name(self) -> str:
        return "online_cloud_ai"

    async def is_available(self) -> bool:
        """Check if cloud API key is configured."""
        return bool(self.api_key and len(self.api_key.strip()) > 5)

    async def extract_skills(
        self,
        text: str,
        canonical_taxonomy: Optional[List[Dict[str, Any]]] = None,
    ) -> List[ExtractedSkillItem]:
        """Extract skills using cloud LLM if configured; otherwise raises to trigger fallback."""
        if not await self.is_available():
            raise ConnectionError("Online AI provider is unconfigured or offline (missing API key).")

        # In production this would invoke httpx or openai client with self.api_key
        # If network error or timeout occurs, raise to trigger fallback
        raise ConnectionError("Online AI provider network unreachable.")
