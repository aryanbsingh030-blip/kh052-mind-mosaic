"""
Skill Intelligence Engine — Main Facade

Coordinates the AI provider abstraction layer, the 6-stage Skill Normalization Pipeline,
and semantic embeddings.
"""

from typing import List, Dict, Optional, Any

from ai.providers.base import AIProvider, EmbeddingProvider, ExtractedSkillItem
from ai.providers.rule_based import RuleBasedFallbackProvider
from ai.providers.local_ai import LocalAIProvider
from ai.providers.online_ai import OnlineAIProvider
from ai.embeddings import HybridSemanticEmbeddingProvider
from ai.pipeline import SkillNormalizationPipeline
from ai.matcher import SkillMatcher
from ai.project_analyzer import ProjectIntelligenceEngine


class SkillIntelligenceEngine:
    """
    Main facade for campus skill intelligence.

    Swappable provider hierarchy:
    1. OnlineAIProvider (when configured with cloud API keys)
    2. LocalAIProvider (when Ollama or local LLM daemon is running)
    3. RuleBasedFallbackProvider (100% offline, deterministic NLP)
    """

    def __init__(
        self,
        primary_provider: Optional[AIProvider] = None,
        embedding_provider: Optional[EmbeddingProvider] = None,
    ):
        self.fallback = RuleBasedFallbackProvider()
        self.local = LocalAIProvider()
        self.online = OnlineAIProvider()

        # Configured primary provider or default to fallback
        self.primary = primary_provider or self.fallback
        self.embeddings = embedding_provider or HybridSemanticEmbeddingProvider()
        self.pipeline = SkillNormalizationPipeline(fallback_provider=self.fallback)
        self.matcher = SkillMatcher(self.embeddings)
        self.project_engine = ProjectIntelligenceEngine(skill_graph=self.matcher.skill_graph)

    async def get_active_provider(self) -> AIProvider:
        """Resolve the best available provider in priority order."""
        if self.primary != self.fallback and await self.primary.is_available():
            return self.primary
        if await self.online.is_available():
            return self.online
        if await self.local.is_available():
            return self.local
        return self.fallback

    async def analyze_skills(
        self,
        text: str,
        canonical_taxonomy: Optional[List[Dict[str, Any]]] = None,
        force_provider: Optional[AIProvider] = None,
    ) -> Dict[str, Any]:
        """
        Transform unstructured text into structured skill intelligence.

        Args:
            text: Unstructured experience narrative or project brief.
            canonical_taxonomy: Optional list of canonical skills from DB.
            force_provider: Optional explicit provider override.

        Returns:
            Dictionary with provider_used, normalized skills list, raw_text, and duration.
        """
        provider = force_provider or await self.get_active_provider()
        return await self.pipeline.process(text, provider=provider, canonical_taxonomy=canonical_taxonomy)

    async def extract_skills(self, text: str) -> List[Dict[str, Any]]:
        """Backward-compatible extraction method."""
        result = await self.analyze_skills(text)
        return [
            {
                "skill_id": s.skill_id,
                "name": s.skill_name,
                "category": s.skill_category,
                "proficiency": s.proficiency,
                "proficiency_level": s.proficiency_level,
                "confidence": s.confidence,
                "evidence": s.evidence,
                "source": s.source,
            }
            for s in result["skills"]
        ]

    async def match_skills(
        self,
        user_skills: List[Dict[str, Any]],
        candidate_skills: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """Find skill-complementary matches between users."""
        return await self.matcher.find_matches(user_skills, candidate_skills)

    async def compute_similarity(self, text_a: str, text_b: str) -> float:
        """Compute semantic similarity between two descriptions."""
        return await self.embeddings.similarity(text_a, text_b)

    def analyze_project(
        self,
        text: str,
        title: Optional[str] = None,
        canonical_taxonomy: Optional[List[Dict[str, Any]]] = None,
        owner_skills: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """Transform natural language project descriptions into structured project intelligence."""
        return self.project_engine.analyze_project(
            text=text,
            title=title,
            canonical_taxonomy=canonical_taxonomy,
            owner_skills=owner_skills,
        )
