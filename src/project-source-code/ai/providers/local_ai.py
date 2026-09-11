"""
Local AI Provider — Connects to local LLMs (Ollama / vLLM / llama.cpp).
"""

import json
from typing import List, Dict, Optional, Any
import urllib.request
import urllib.error

from ai.providers.base import AIProvider, ExtractedSkillItem


class LocalAIProvider(AIProvider):
    """
    Connects to a local Ollama server (default http://localhost:11434).
    Fails fast (500ms timeout) if the daemon is offline so the engine can fall back.
    """

    def __init__(self, endpoint: str = "http://localhost:11434", model: str = "llama3:latest"):
        self.endpoint = endpoint
        self.model = model

    @property
    def name(self) -> str:
        return "local_ollama"

    async def is_available(self) -> bool:
        """Check if local Ollama daemon is reachable."""
        try:
            req = urllib.request.Request(f"{self.endpoint}/api/tags", headers={"User-Agent": "AI-Skill-Exchange"})
            with urllib.request.urlopen(req, timeout=0.5) as res:
                return res.getcode() == 200
        except Exception:
            return False

    async def extract_skills(
        self,
        text: str,
        canonical_taxonomy: Optional[List[Dict[str, Any]]] = None,
    ) -> List[ExtractedSkillItem]:
        """Extract skills using local Ollama if available, otherwise raise to trigger fallback."""
        if not await self.is_available():
            raise ConnectionError(f"Local AI provider '{self.endpoint}' is offline.")

        prompt = f"""You are an expert technical skill extractor.
Analyze the following student experience description and extract structured technical skills.
For each skill, determine:
- skill_name
- skill_category
- proficiency (BEGINNER, INTERMEDIATE, ADVANCED, EXPERT)
- confidence (0.0 to 1.0)
- evidence (short quote from text)

Respond ONLY with a valid JSON array of objects with keys: "skill_name", "skill_category", "proficiency", "confidence", "evidence".

Text to analyze:
\"\"\"{text}\"\"\"
"""
        payload = json.dumps({
            "model": self.model,
            "prompt": prompt,
            "stream": False,
            "format": "json"
        }).encode("utf-8")

        req = urllib.request.Request(
            f"{self.endpoint}/api/generate",
            data=payload,
            headers={"Content-Type": "application/json"}
        )
        try:
            with urllib.request.urlopen(req, timeout=8.0) as res:
                resp_json = json.loads(res.read().decode("utf-8"))
                output_text = resp_json.get("response", "")
                parsed = json.loads(output_text)
                items = []
                for entry in parsed:
                    items.append(ExtractedSkillItem(
                        skill_id=None,
                        skill_name=entry.get("skill_name", "Unknown"),
                        skill_category=entry.get("skill_category", "General"),
                        proficiency=entry.get("proficiency", "INTERMEDIATE"),
                        confidence=float(entry.get("confidence", 0.9)),
                        evidence=entry.get("evidence", text[:60]),
                        source="local_llm",
                    ))
                return items
        except Exception as e:
            raise RuntimeError(f"Local AI extraction error: {e}") from e
