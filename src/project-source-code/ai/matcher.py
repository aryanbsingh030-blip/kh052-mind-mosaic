"""
Intelligent Skill Matcher — Multi-Factor Hybrid Peer Matching Engine.

Builds on:
1. Semantic similarity (Hybrid embeddings)
2. Skill hierarchy & taxonomy graph (SkillGraph)
3. Proficiency compatibility & experience
4. Teaching capability & learning goals
5. Reciprocity (bi-directional learning)
6. Interest & project compatibility
7. Availability schedule intersection
8. Previous collaboration bonus
"""

import re
from typing import Any, Dict, List, Optional, Set, Tuple

from ai.embeddings import HybridSemanticEmbeddingProvider
from ai.providers.base import EmbeddingProvider
from ai.skill_graph import SkillGraph


def _time_to_minutes(t_str: str) -> int:
    """Convert HH:MM string to minutes since midnight."""
    try:
        parts = t_str.strip().split(":")
        return int(parts[0]) * 60 + int(parts[1])
    except Exception:
        return 0


def _minutes_to_time(m: int) -> str:
    """Convert minutes since midnight to HH:MM string."""
    hours = m // 60
    mins = m % 60
    return f"{hours:02d}:{mins:02d}"


def _clean_tokens(text: Optional[str]) -> Set[str]:
    """Tokenize and clean text into lowercase words."""
    if not text:
        return set()
    words = re.findall(r"\b[a-zA-Z0-9_\-\.\+#]{2,}\b", text.lower())
    stopwords = {"and", "the", "for", "with", "this", "that", "from", "using", "built", "project", "interested", "want"}
    return {w for w in words if w not in stopwords}


class IntelligentSkillMatcher:
    """
    Intelligent Hybrid Skill Matching Engine.
    Evaluates peer compatibility on a 0-100 calibrated score with transparent explainability.
    """

    PROFICIENCY_SCORES = {
        "BEGINNER": 1,
        "INTERMEDIATE": 2,
        "ADVANCED": 3,
        "EXPERT": 4,
    }

    def __init__(
        self,
        embedding_provider: Optional[EmbeddingProvider] = None,
        skill_graph: Optional[SkillGraph] = None,
    ):
        self.embeddings = embedding_provider or HybridSemanticEmbeddingProvider()
        self.skill_graph = skill_graph or SkillGraph(preload_taxonomy=True)

    async def compute_match(
        self,
        student_a: Dict[str, Any],
        student_b: Dict[str, Any],
        previous_partners: Optional[Set[str]] = None,
    ) -> Dict[str, Any]:
        """
        Compute comprehensive match score and structured explainability between student_a (user) and student_b (candidate).
        """
        # 1. Evaluate Direct & Hierarchical Skill Exchanges
        a_wants = student_a.get("learning_goals") or []
        b_teaches = [s for s in student_b.get("skills", []) if s.get("direction") == "TEACH" or s.get("can_teach", True)]
        
        b_wants = student_b.get("learning_goals") or []
        a_teaches = [s for s in student_a.get("skills", []) if s.get("direction") == "TEACH" or s.get("can_teach", True)]

        # Forward match: B teaches what A wants to learn
        forward_matches = await self._match_skill_lists(a_wants, b_teaches)
        # Backward match: A teaches what B wants to learn
        backward_matches = await self._match_skill_lists(b_wants, a_teaches)

        # 2. Reciprocity Evaluation (0-100)
        has_forward = bool(forward_matches.get("matched_pairs"))
        has_backward = bool(backward_matches.get("matched_pairs"))
        is_reciprocal = has_forward and has_backward

        # Compute Skill Compatibility (0-100)
        skill_compat_raw = 0.0
        if is_reciprocal:
            skill_compat_raw = (forward_matches["avg_score"] * 0.5) + (backward_matches["avg_score"] * 0.5)
        elif has_forward:
            skill_compat_raw = forward_matches["avg_score"] * 0.85
        elif has_backward:
            skill_compat_raw = backward_matches["avg_score"] * 0.70
        else:
            skill_compat_raw = 0.0
        skill_compatibility = round(skill_compat_raw * 100, 1)

        if is_reciprocal:
            min_score = min(forward_matches["avg_score"], backward_matches["avg_score"])
            reciprocity = round(85.0 + (min_score * 15.0), 1)
        elif has_forward or has_backward:
            reciprocity = 40.0
        else:
            reciprocity = 0.0

        # 3. Semantic Similarity (0-100)
        text_a = f"{student_a.get('bio', '')} {student_a.get('raw_project_experience', '')} {student_a.get('interests', '')}".strip()
        text_b = f"{student_b.get('bio', '')} {student_b.get('raw_project_experience', '')} {student_b.get('interests', '')}".strip()
        
        if text_a and text_b:
            try:
                sem_sim = await self.embeddings.similarity(text_a, text_b)
                sem_sim = max(0.2, min(1.0, sem_sim))
            except Exception:
                sem_sim = 0.5
        else:
            # Neutral baseline when students have not written bios yet
            sem_sim = 0.55
        semantic_similarity = round(sem_sim * 100, 1)

        # 4. Experience & Proficiency Compatibility (0-100)
        experience_compatibility = round(self._evaluate_experience_compat(forward_matches, backward_matches), 1)

        # 5. Interest & Project Compatibility (0-100)
        interest_compatibility = round(self._evaluate_interests(student_a, student_b), 1)

        # 6. Availability Compatibility (0-100) & Common Slots
        avail_compat, common_slots = self._evaluate_availability(
            student_a.get("availabilities", []),
            student_b.get("availabilities", []),
        )
        availability_compatibility = round(avail_compat, 1)

        # 7. Previous Collaboration Bonus
        collab_bonus = 0.0
        if previous_partners and student_b.get("id") in previous_partners:
            collab_bonus = 5.0

        # 8. Composite Weighted Match Score (0-100)
        # Weights: Skill 25%, Reciprocity 25%, Semantic 15%, Experience 15%, Interest 10%, Availability 10%
        if not has_forward and not has_backward:
            # No skill overlap at all: strict penalty
            composite = (semantic_similarity * 0.15) + (interest_compatibility * 0.15) + (availability_compatibility * 0.05)
            final_score = round(min(32.0, composite))
        else:
            weighted_score = (
                (skill_compatibility * 0.25)
                + (reciprocity * 0.25)
                + (semantic_similarity * 0.15)
                + (experience_compatibility * 0.15)
                + (interest_compatibility * 0.10)
                + (availability_compatibility * 0.10)
                + collab_bonus
            )
            final_score = round(max(10.0, min(99.0, weighted_score)))

        # 9. Formulate Transparent Explainability
        explanations = []
        you_learn = []
        they_learn = []

        # Teaching / Learning explanations
        for pair in forward_matches.get("matched_pairs", []):
            teach_skill = pair["teacher_skill"]
            learn_goal = pair["learner_skill"]
            prof = pair.get("teacher_proficiency", "INTERMEDIATE")
            you_learn.append(f"{teach_skill} (Teacher: {prof})")
            explanations.append(f"✓ They can teach {teach_skill}")
            explanations.append(f"✓ You want to learn {learn_goal}")

        for pair in backward_matches.get("matched_pairs", []):
            teach_skill = pair["teacher_skill"]
            learn_goal = pair["learner_skill"]
            prof = pair.get("teacher_proficiency", "INTERMEDIATE")
            they_learn.append(f"{teach_skill} (You: {prof})")
            explanations.append(f"✓ You can teach {teach_skill}")
            explanations.append(f"✓ They want to learn {learn_goal}")

        if is_reciprocal:
            explanations.insert(0, "✓ Strong reciprocal skill exchange match")

        # Interest overlap explanations
        common_interests = self._get_shared_interest_names(student_a, student_b)
        if common_interests:
            explanations.append(f"✓ Shared interests: {', '.join(common_interests[:3])}")

        # Availability explanations
        if common_slots:
            days_summary = ", ".join(list({s["day"] for s in common_slots})[:3])
            explanations.append(f"✓ Overlapping availability on {days_summary} ({len(common_slots)} shared slots)")
        else:
            explanations.append("⚠ Conflicting availability: No overlapping time slots found")

        if collab_bonus > 0:
            explanations.append("✓ Previous successful peer collaboration")

        if not has_forward and not has_backward:
            explanations.append("⚠ Missing direct skill match (general campus peer)")

        # Unique explanations while preserving order
        deduped_explanations = []
        seen = set()
        for exp in explanations:
            if exp not in seen:
                seen.add(exp)
                deduped_explanations.append(exp)

        matching_factors = {
            "skill_compatibility": skill_compatibility,
            "reciprocity": reciprocity,
            "semantic_similarity": semantic_similarity,
            "experience_compatibility": experience_compatibility,
            "interest_compatibility": interest_compatibility,
            "availability_compatibility": availability_compatibility,
        }

        learning_opportunity = {
            "you_learn": you_learn,
            "they_learn": they_learn,
        }

        return {
            "candidate_id": student_b.get("id"),
            "candidate_name": student_b.get("full_name"),
            "candidate_department": student_b.get("department"),
            "candidate_year": student_b.get("year_of_study"),
            "candidate_avatar_url": student_b.get("avatar_url"),
            "candidate_bio": student_b.get("bio"),
            "match_score": final_score,
            "is_reciprocal": is_reciprocal,
            "matching_factors": matching_factors,
            "learning_opportunity": learning_opportunity,
            "explanation": deduped_explanations,
            "common_availability": common_slots,
            "skills_offered": [s.get("skill_name") for s in b_teaches if s.get("skill_name")],
            "skills_sought": [g.get("skill_name") for g in b_wants if g.get("skill_name")],
        }

    async def _match_skill_lists(
        self,
        wants: List[Dict[str, Any]],
        teaches: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        """
        Match student learning desires against candidate offerings using hierarchy + semantic similarity.
        """
        matched_pairs = []
        scores = []

        for w in wants:
            w_name = w.get("skill_name") or w.get("name") or ""
            if not w_name:
                continue

            best_score = 0.0
            best_t = None

            for t in teaches:
                t_name = t.get("skill_name") or t.get("name") or ""
                if not t_name:
                    continue

                # 1. Exact or Alias match
                if w_name.lower().strip() == t_name.lower().strip():
                    score = 1.0
                else:
                    # 2. Skill Graph proximity
                    graph_prox = self.skill_graph.get_proximity(w_name, t_name)
                    # 3. Semantic similarity
                    sem = await self._skill_similarity(w_name, t_name)
                    score = max(graph_prox, sem)

                if score > best_score:
                    best_score = score
                    best_t = t

            if best_score >= 0.45 and best_t is not None:
                matched_pairs.append({
                    "learner_skill": w_name,
                    "teacher_skill": best_t.get("skill_name") or best_t.get("name"),
                    "teacher_proficiency": best_t.get("proficiency_level") or "INTERMEDIATE",
                    "similarity": round(best_score, 3),
                })
                scores.append(best_score)

        avg_score = (sum(scores) / len(scores)) if scores else 0.0
        return {
            "matched_pairs": matched_pairs,
            "avg_score": avg_score,
        }

    def _evaluate_experience_compat(
        self,
        forward_matches: Dict[str, Any],
        backward_matches: Dict[str, Any],
    ) -> float:
        """
        Score proficiency gap between teachers and learners.
        Ideal: Teacher is ADVANCED/EXPERT, Learner is BEGINNER/INTERMEDIATE.
        """
        all_pairs = forward_matches.get("matched_pairs", []) + backward_matches.get("matched_pairs", [])
        if not all_pairs:
            return 50.0

        scores = []
        for pair in all_pairs:
            t_prof = pair.get("teacher_proficiency", "INTERMEDIATE")
            t_num = self.PROFICIENCY_SCORES.get(t_prof, 2)
            if t_num == 4:  # EXPERT
                scores.append(100.0)
            elif t_num == 3:  # ADVANCED
                scores.append(90.0)
            elif t_num == 2:  # INTERMEDIATE
                scores.append(75.0)
            else:  # BEGINNER
                scores.append(45.0)

        return sum(scores) / len(scores)

    def _evaluate_interests(self, student_a: Dict[str, Any], student_b: Dict[str, Any]) -> float:
        """
        Evaluate overlap of interests and project interests.
        """
        tokens_a = _clean_tokens(f"{student_a.get('interests', '')} {student_a.get('project_interests', '')}")
        tokens_b = _clean_tokens(f"{student_b.get('interests', '')} {student_b.get('project_interests', '')}")

        if not tokens_a or not tokens_b:
            return 45.0

        intersection = tokens_a.intersection(tokens_b)
        union = tokens_a.union(tokens_b)
        jaccard = len(intersection) / len(union) if union else 0.0

        # Score in range 30 - 100
        if len(intersection) >= 3:
            return 95.0
        elif len(intersection) == 2:
            return 85.0
        elif len(intersection) == 1:
            return 70.0
        else:
            return max(30.0, jaccard * 100)

    def _get_shared_interest_names(self, student_a: Dict[str, Any], student_b: Dict[str, Any]) -> List[str]:
        """Extract clean shared interest keywords."""
        tokens_a = _clean_tokens(f"{student_a.get('interests', '')} {student_a.get('project_interests', '')}")
        tokens_b = _clean_tokens(f"{student_b.get('interests', '')} {student_b.get('project_interests', '')}")
        return [w.capitalize() for w in sorted(list(tokens_a.intersection(tokens_b)))]

    def _evaluate_availability(
        self,
        avail_a: List[Dict[str, Any]],
        avail_b: List[Dict[str, Any]],
    ) -> Tuple[float, List[Dict[str, Any]]]:
        """
        Calculate overlapping availability slots across weekly recurring schedules.
        """
        if not avail_a or not avail_b:
            # If neither has declared availability, treat as neutral/flexible
            return 60.0, []

        common_slots = []
        total_overlap_mins = 0

        for slot_a in avail_a:
            day_a = slot_a.get("day_of_week") or slot_a.get("day")
            start_a = _time_to_minutes(slot_a.get("start_time", "00:00"))
            end_a = _time_to_minutes(slot_a.get("end_time", "00:00"))

            for slot_b in avail_b:
                day_b = slot_b.get("day_of_week") or slot_b.get("day")
                if str(day_a).upper() != str(day_b).upper():
                    continue

                start_b = _time_to_minutes(slot_b.get("start_time", "00:00"))
                end_b = _time_to_minutes(slot_b.get("end_time", "00:00"))

                overlap_start = max(start_a, start_b)
                overlap_end = min(end_a, end_b)

                if overlap_end > overlap_start:
                    dur = overlap_end - overlap_start
                    total_overlap_mins += dur
                    common_slots.append({
                        "day": str(day_a).upper(),
                        "start_time": _minutes_to_time(overlap_start),
                        "end_time": _minutes_to_time(overlap_end),
                        "duration_minutes": dur,
                    })

        if not common_slots:
            # Conflicting availability: declared schedules don't overlap
            return 0.0, []

        overlap_hours = total_overlap_mins / 60.0
        if overlap_hours >= 3.0:
            score = 100.0
        elif overlap_hours >= 2.0:
            score = 90.0
        elif overlap_hours >= 1.0:
            score = 80.0
        else:
            score = 65.0

        return score, common_slots

    async def _skill_similarity(self, skill_a: str, skill_b: str) -> float:
        """Compute semantic similarity between two skill names."""
        a_lower = skill_a.lower().strip()
        b_lower = skill_b.lower().strip()

        if a_lower == b_lower:
            return 1.0
        if a_lower in b_lower or b_lower in a_lower:
            return 0.85

        try:
            return await self.embeddings.similarity(skill_a, skill_b)
        except Exception:
            return 0.0

    # Backward compatibility method for earlier tests
    async def find_matches(
        self,
        user_skills: list[dict],
        candidate_skills: list[dict],
    ) -> list[dict]:
        """
        Backward-compatible method for legacy test cases.
        """
        matches: list[dict] = []

        for us in user_skills:
            target_direction = "teach" if us["direction"].lower() == "learn" else "learn"

            for cs in candidate_skills:
                if cs["direction"].lower() != target_direction:
                    continue

                similarity = await self._skill_similarity(us["skill_name"], cs["skill_name"])
                if similarity < 0.3:
                    continue

                prof_score = cs.get("proficiency_level", 2) / 5.0
                match_score = (similarity * 0.7) + (prof_score * 0.3)

                if us["direction"].lower() == "learn":
                    reason = (
                        f"You want to learn {us['skill_name']} — "
                        f"{cs['user_name']} can teach {cs['skill_name']} "
                        f"(proficiency {cs.get('proficiency_level', 2)}/5)"
                    )
                else:
                    reason = (
                        f"You can teach {us['skill_name']} — "
                        f"{cs['user_name']} wants to learn {cs['skill_name']}"
                    )

                matches.append({
                    "user_id": cs.get("user_id"),
                    "user_name": cs.get("user_name"),
                    "skill_name": cs.get("skill_name"),
                    "direction": cs.get("direction"),
                    "proficiency_level": cs.get("proficiency_level"),
                    "match_score": round(match_score, 3),
                    "reason": reason,
                })

        matches.sort(key=lambda m: m["match_score"], reverse=True)
        seen_users = set()
        unique_matches = []
        for m in matches:
            uid = m.get("user_id")
            if uid not in seen_users:
                seen_users.add(uid)
                unique_matches.append(m)

        return unique_matches[:20]


# Alias for compatibility
SkillMatcher = IntelligentSkillMatcher
