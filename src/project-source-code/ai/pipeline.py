"""
Skill Normalization Pipeline

Executes the 6-stage transformation:
Raw text
  -> Skill Extraction
  -> Skill Normalization
  -> Alias Resolution
  -> Proficiency Estimation
  -> Skill Hierarchy Mapping
  -> Confidence Scoring
"""

import time
from typing import List, Dict, Optional, Any
from ai.providers.base import AIProvider, ExtractedSkillItem
from ai.providers.rule_based import RuleBasedFallbackProvider, CANONICAL_ALIASES, HIERARCHY_INFERENCES


class SkillNormalizationPipeline:
    """
    Standardized pipeline that ensures every extracted skill conforms to:
    - skill_id
    - skill_name
    - proficiency (BEGINNER | INTERMEDIATE | ADVANCED | EXPERT)
    - confidence (0.0 to 1.0)
    - evidence
    - source
    """

    def __init__(self, fallback_provider: Optional[AIProvider] = None):
        self.fallback = fallback_provider or RuleBasedFallbackProvider()

    async def process(
        self,
        raw_text: str,
        provider: AIProvider,
        canonical_taxonomy: Optional[List[Dict[str, Any]]] = None,
    ) -> Dict[str, Any]:
        """
        Execute the normalization pipeline on unstructured input text.

        Returns:
            Dictionary containing provider_used, list of normalized ExtractedSkillItems,
            raw_text, and execution metrics.
        """
        start_time = time.perf_counter()
        cleaned_text = raw_text.strip()
        if not cleaned_text:
            return {
                "provider_used": provider.name,
                "skills": [],
                "raw_text": raw_text,
                "processing_time_ms": 0.0,
            }

        provider_name = provider.name
        raw_extractions: List[ExtractedSkillItem] = []

        # 1. Extraction (with transparent fallback on error or offline)
        try:
            if await provider.is_available():
                raw_extractions = await provider.extract_skills(cleaned_text, canonical_taxonomy)
            else:
                raw_extractions = await self.fallback.extract_skills(cleaned_text, canonical_taxonomy)
                provider_name = f"{self.fallback.name} (fallback: {provider.name} unavailable)"
        except Exception as e:
            raw_extractions = await self.fallback.extract_skills(cleaned_text, canonical_taxonomy)
            provider_name = f"{self.fallback.name} (fallback after {type(e).__name__})"

        # 2. Skill Normalization & Alias Resolution
        # Standardize names and categories
        normalized_skills: Dict[str, ExtractedSkillItem] = {}
        for item in raw_extractions:
            canonical_name = item.skill_name
            canonical_category = item.skill_category or "General"
            lower_name = item.skill_name.lower().strip()

            if lower_name in CANONICAL_ALIASES:
                canonical_name, canonical_category = CANONICAL_ALIASES[lower_name]

            # Normalize proficiency into standard enum strings
            prof = str(item.proficiency).upper().strip()
            if prof not in ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]:
                prof = "INTERMEDIATE"

            # 3. Confidence score calibration
            conf = max(0.1, min(0.99, float(item.confidence)))

            normalized_skills[canonical_name] = ExtractedSkillItem(
                skill_id=item.skill_id,
                skill_name=canonical_name,
                skill_category=canonical_category,
                proficiency=prof,
                confidence=round(conf, 2),
                evidence=item.evidence,
                source=item.source or "direct_mention",
            )

        # 4. Skill Hierarchy Mapping
        # If specific child skills are present, ensure parent concepts are inferred
        current_names = list(normalized_skills.keys())
        for name in current_names:
            if name in HIERARCHY_INFERENCES:
                for inferred_name, inferred_cat, default_prof, conf in HIERARCHY_INFERENCES[name]:
                    if inferred_name not in normalized_skills:
                        normalized_skills[inferred_name] = ExtractedSkillItem(
                            skill_id=None,
                            skill_name=inferred_name,
                            skill_category=inferred_cat,
                            proficiency=default_prof,
                            confidence=round(conf, 2),
                            evidence=normalized_skills[name].evidence,
                            source="hierarchy_inferred",
                        )

        # 5. Map to canonical IDs from database taxonomy if provided
        if canonical_taxonomy:
            name_to_meta = {s["name"].lower(): (s["id"], s.get("category")) for s in canonical_taxonomy if "name" in s and "id" in s}
            for skill in normalized_skills.values():
                lower = skill.skill_name.lower()
                if lower in name_to_meta:
                    skill.skill_id = name_to_meta[lower][0]
                    if name_to_meta[lower][1]:
                        skill.skill_category = name_to_meta[lower][1]
                else:
                    # Fuzzy match against canonical names
                    for c_lower, (c_id, c_cat) in name_to_meta.items():
                        if lower in c_lower or c_lower in lower:
                            skill.skill_id = c_id
                            if c_cat:
                                skill.skill_category = c_cat
                            break

        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # Sort: Highest confidence & proficiency first
        sorted_skills = sorted(
            list(normalized_skills.values()),
            key=lambda s: (s.confidence, 1 if s.source == "direct_mention" else 0),
            reverse=True,
        )

        return {
            "provider_used": provider_name,
            "skills": sorted_skills,
            "raw_text": raw_text,
            "processing_time_ms": duration_ms,
        }
