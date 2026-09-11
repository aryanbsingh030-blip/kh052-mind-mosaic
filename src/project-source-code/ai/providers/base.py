"""
Abstract base classes and data structures for AI providers.

All AI capabilities (local, online, fallback) adhere to these interfaces.
The application never directly couples to a single vendor or model.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Optional, Dict, Any


@dataclass
class ExtractedSkillItem:
    """A standardized skill item extracted from natural language text."""
    skill_name: str
    skill_id: Optional[str] = None
    skill_category: Optional[str] = None
    proficiency: str = "INTERMEDIATE"  # BEGINNER | INTERMEDIATE | ADVANCED | EXPERT
    confidence: float = 0.85  # 0.0 to 1.0
    evidence: str = ""  # Context snippet where skill was identified
    source: str = "direct_mention"  # direct_mention | alias_resolved | hierarchy_inferred | semantic_match

    # Legacy attribute compatibility
    @property
    def name(self) -> str:
        return self.skill_name

    @property
    def category(self) -> Optional[str]:
        return self.skill_category

    @property
    def proficiency_level(self) -> int:
        mapping = {"BEGINNER": 1, "INTERMEDIATE": 3, "ADVANCED": 4, "EXPERT": 5}
        return mapping.get(self.proficiency, 3)


# Backward compatibility aliases
ExtractedSkill = ExtractedSkillItem


class AIProvider(ABC):
    """Abstract interface for AI/LLM providers."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider identifier."""
        ...

    @abstractmethod
    async def is_available(self) -> bool:
        """Check if provider backend is reachable and ready."""
        ...

    @abstractmethod
    async def extract_skills(
        self,
        text: str,
        canonical_taxonomy: Optional[List[Dict[str, Any]]] = None,
    ) -> List[ExtractedSkillItem]:
        """Extract structured skills from natural language text."""
        ...


LLMProvider = AIProvider


class EmbeddingProvider(ABC):
    """Abstract interface for semantic vector embeddings."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Embedding provider identifier."""
        ...

    @abstractmethod
    async def is_available(self) -> bool:
        """Check if embedding model is ready."""
        ...

    @abstractmethod
    async def embed(self, texts: List[str]) -> List[List[float]]:
        """Generate semantic embeddings for a list of texts."""
        ...

    @abstractmethod
    async def similarity(self, text_a: str, text_b: str) -> float:
        """Compute cosine similarity score (0.0 to 1.0)."""
        ...
