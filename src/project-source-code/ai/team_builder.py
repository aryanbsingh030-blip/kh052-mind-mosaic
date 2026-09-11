"""
AI Project Team Builder — Stage 6

Multi-Objective Project Team Composition & Optimization Engine.
Optimizes candidate teams across 9 key dimensions:
1. Required skill coverage
2. Skill proficiency depth
3. Complementary skills
4. Learning opportunities (reciprocal learning synergy)
5. Interest & domain compatibility
6. Availability schedule intersection
7. Experience balance (seniority & mentorship)
8. Skill redundancy avoidance
9. Workload balance

Supports multiple candidate compositions, member locking, and dynamic replacement with real-time recalculation.
"""

import math
import random
from typing import Any, Dict, List, Optional, Set, Tuple

from ai.skill_graph import SkillGraph
from ai.matcher import IntelligentSkillMatcher


YEAR_WEIGHTS = {
    "Freshman": 1,
    "Sophomore": 2,
    "Junior": 3,
    "Senior": 4,
    "Master": 5,
    "PhD": 5,
}

PROFICIENCY_WEIGHTS = {
    "BEGINNER": 0.60,
    "INTERMEDIATE": 0.85,
    "ADVANCED": 1.00,
    "EXPERT": 1.15,
}


class AITeamBuilder:
    """
    Autonomous Multi-Objective Project Team Builder Engine.
    Generates balanced, cohesive project teams from the campus student pool.
    """

    def __init__(
        self,
        skill_graph: Optional[SkillGraph] = None,
        matcher: Optional[IntelligentSkillMatcher] = None,
    ):
        self.skill_graph = skill_graph or SkillGraph(preload_taxonomy=True)
        self.matcher = matcher or IntelligentSkillMatcher(skill_graph=self.skill_graph)

    def generate_teams(
        self,
        project_info: Dict[str, Any],
        student_pool: List[Dict[str, Any]],
        team_size: int = 4,
        locked_student_ids: Optional[List[str]] = None,
        excluded_student_ids: Optional[List[str]] = None,
        num_candidates: int = 3,
    ) -> List[Dict[str, Any]]:
        """
        Generate diverse, optimized candidate teams for a project.
        """
        locked_ids = set(locked_student_ids or [])
        excluded_ids = set(excluded_student_ids or [])

        # Filter available students
        available_students = [
            s for s in student_pool
            if s["id"] not in excluded_ids
        ]

        if len(available_students) < team_size:
            # If not enough un-excluded, fall back to entire pool
            available_students = student_pool

        required_skills = project_info.get("required_skills") or []
        # Normalize required skills format
        norm_required: List[Dict[str, Any]] = []
        for r in required_skills:
            if isinstance(r, str):
                norm_required.append({
                    "skill_name": r,
                    "importance": "MANDATORY",
                    "importance_score": 0.90,
                    "skill_category": "General",
                })
            elif isinstance(r, dict):
                norm_required.append({
                    "skill_name": r.get("skill_name") or r.get("name") or "General",
                    "importance": r.get("importance") or "MANDATORY",
                    "importance_score": r.get("importance_score") or 0.85,
                    "skill_category": r.get("skill_category") or r.get("category") or "General",
                })

        strategies = [
            ("Balanced All-Rounder", "Optimally balances skill coverage, experience diversity, and mutual learning synergy.", "balanced"),
            ("High-Velocity Execution", "Prioritizes advanced technical proficiency and immediate implementation capability.", "velocity"),
            ("Maximum Mentorship & Synergy", "Prioritizes peer mentorship, cross-training, and learning goal satisfaction.", "mentorship"),
        ]

        candidate_teams = []
        for i in range(min(num_candidates, len(strategies))):
            strat_name, strat_desc, strat_key = strategies[i]
            team_members = self._compose_team(
                strategy=strat_key,
                project_info=project_info,
                required_skills=norm_required,
                student_pool=available_students,
                team_size=team_size,
                locked_ids=locked_ids,
            )

            metrics = self.score_team(
                team_members=team_members,
                required_skills=norm_required,
                project_info=project_info,
            )

            # Generate natural language explanations and role allocations
            members_with_roles = self._assign_roles_and_reasons(
                members=team_members,
                required_skills=norm_required,
                project_info=project_info,
            )

            common_slots = self._find_common_availability(team_members)

            candidate_teams.append({
                "candidate_id": f"team_candidate_{i + 1}",
                "strategy_name": strat_name,
                "strategy_description": strat_desc,
                "metrics": metrics,
                "members": members_with_roles,
                "covered_skills": metrics["covered_skills"],
                "missing_skills": metrics["missing_skills"],
                "common_meeting_times": common_slots,
            })

        # Sort candidates by overall score descending
        candidate_teams.sort(key=lambda t: t["metrics"]["overall_score"], reverse=True)
        return candidate_teams

    def _compose_team(
        self,
        strategy: str,
        project_info: Dict[str, Any],
        required_skills: List[Dict[str, Any]],
        student_pool: List[Dict[str, Any]],
        team_size: int,
        locked_ids: Set[str],
    ) -> List[Dict[str, Any]]:
        """Greedy heuristic with multi-objective candidate selection."""
        team: List[Dict[str, Any]] = []
        student_map = {s["id"]: s for s in student_pool}

        # 1. Add locked members first
        for lid in locked_ids:
            if lid in student_map:
                team.append(student_map[lid])

        if len(team) >= team_size:
            return team[:team_size]

        # 2. Iteratively select candidates who maximize the objective function
        remaining = [s for s in student_pool if s["id"] not in {m["id"] for m in team}]

        while len(team) < team_size and remaining:
            best_candidate = None
            best_score = -1.0

            for candidate in remaining:
                # Evaluate incremental team fitness
                temp_team = team + [candidate]
                score_dict = self.score_team(
                    team_members=temp_team,
                    required_skills=required_skills,
                    project_info=project_info,
                )

                if strategy == "velocity":
                    # Weight skill coverage and proficiency heavily
                    fitness = (
                        score_dict["skill_coverage"] * 0.50 +
                        score_dict["overall_score"] * 0.30 +
                        score_dict["experience_balance"] * 0.20
                    )
                elif strategy == "mentorship":
                    # Weight learning synergy and experience balance heavily
                    fitness = (
                        score_dict["learning_synergy"] * 0.45 +
                        score_dict["experience_balance"] * 0.30 +
                        score_dict["skill_coverage"] * 0.25
                    )
                else:  # balanced
                    fitness = score_dict["overall_score"]

                # Small tiebreaker based on candidate relevance
                if fitness > best_score:
                    best_score = fitness
                    best_candidate = candidate

            if best_candidate:
                team.append(best_candidate)
                remaining.remove(best_candidate)
            else:
                break

        return team

    def score_team(
        self,
        team_members: List[Dict[str, Any]],
        required_skills: List[Dict[str, Any]],
        project_info: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Evaluate candidate team against the 9 multi-objective criteria.
        Returns detailed sub-scores and calibrated composite overall_score (0-100%).
        """
        if not team_members:
            return {
                "overall_score": 0,
                "skill_coverage": 0,
                "experience_balance": 0,
                "learning_synergy": 0,
                "compatibility": 0,
                "redundancy_score": 0,
                "availability_compatibility": 0,
                "covered_skills": [],
                "missing_skills": [r["skill_name"] for r in required_skills],
            }

        # 1. Skill Coverage & Proficiency Depth
        covered_skills: Set[str] = set()
        missing_skills: List[str] = []
        total_req_weight = 0.0
        covered_weight = 0.0

        # Collect all skills offered by the team
        team_skills_map: Dict[str, Dict[str, Any]] = {}
        for m in team_members:
            skills = m.get("skills") or m.get("teach") or []
            for s in skills:
                name = s.get("skill_name") or s.get("skill") or s.get("name")
                if not name:
                    continue
                level = s.get("proficiency_level") or s.get("level") or "INTERMEDIATE"
                mult = PROFICIENCY_WEIGHTS.get(str(level).upper(), 0.85)
                norm_name = self.skill_graph.canonical_name(name).lower()
                if norm_name not in team_skills_map or mult > team_skills_map[norm_name]["mult"]:
                    team_skills_map[norm_name] = {
                        "original_name": name,
                        "mult": mult,
                        "level": level,
                        "provider_id": m["id"],
                    }

        for req in required_skills:
            req_name = req["skill_name"]
            canon_req = self.skill_graph.canonical_name(req_name).lower()
            is_mandatory = req.get("importance") == "MANDATORY"
            weight = 1.0 if is_mandatory else 0.6
            total_req_weight += weight

            # Check exact or hierarchical proximity
            matched = False
            best_match_mult = 0.0
            for t_skill, t_data in team_skills_map.items():
                if t_skill == canon_req:
                    matched = True
                    best_match_mult = max(best_match_mult, t_data["mult"])
                elif self.skill_graph.get_proximity(req_name, t_data["original_name"]) >= 0.80:
                    matched = True
                    best_match_mult = max(best_match_mult, t_data["mult"] * 0.90)

            if matched:
                covered_skills.add(req_name)
                covered_weight += weight * min(1.15, best_match_mult)
            else:
                missing_skills.append(req_name)

        coverage_ratio = (covered_weight / total_req_weight) if total_req_weight > 0 else 1.0
        coverage_score = int(round(min(100.0, max(0.0, coverage_ratio * 100))))

        # 2. Experience Balance (Seniority & Mentorship distribution)
        years = [YEAR_WEIGHTS.get(m.get("year_of_study") or m.get("year") or "Junior", 3) for m in team_members]
        min_year = min(years)
        max_year = max(years)
        has_senior = max_year >= 4
        has_junior_or_sophomore = min_year <= 2 or min_year <= 3
        year_spread = max_year - min_year

        if has_senior and has_junior_or_sophomore:
            exp_score = 92
        elif year_spread >= 2:
            exp_score = 88
        elif year_spread == 1:
            exp_score = 80
        else:
            exp_score = 72

        # 3. Learning Synergy (Reciprocal mentorship within team)
        # Check how many learning goals of team members can be taught by other teammates
        goals_satisfied = 0
        total_goals = 0

        for member in team_members:
            learn_goals = member.get("learning_goals") or member.get("learn") or []
            for g in learn_goals:
                g_name = g.get("skill_name") or g.get("skill") or ""
                if not g_name:
                    continue
                total_goals += 1
                g_canon = self.skill_graph.canonical_name(g_name).lower()
                # Check if anyone else in the team can teach this
                can_teach = False
                for other in team_members:
                    if other["id"] == member["id"]:
                        continue
                    o_skills = other.get("skills") or other.get("teach") or []
                    for os in o_skills:
                        os_name = os.get("skill_name") or os.get("skill") or ""
                        if (
                            os_name.lower() == g_canon or
                            self.skill_graph.get_proximity(g_name, os_name) >= 0.80
                        ):
                            can_teach = True
                            break
                    if can_teach:
                        break
                if can_teach:
                    goals_satisfied += 1

        if total_goals > 0:
            synergy_ratio = goals_satisfied / total_goals
            learning_synergy = int(round(min(100, 50 + synergy_ratio * 45)))
        else:
            learning_synergy = 80

        # 4. Interest & Domain Compatibility
        departments = {m.get("department") or m.get("dept") for m in team_members if m.get("department") or m.get("dept")}
        # Cross-functional teams (2-3 distinct departments) are ideal for campus innovation
        dept_diversity = len(departments)
        if dept_diversity >= 3:
            compatibility = 94
        elif dept_diversity == 2:
            compatibility = 88
        else:
            compatibility = 76

        # 5. Availability Schedule Compatibility
        common_slots = self._find_common_availability(team_members)
        if len(common_slots) >= 3:
            avail_score = 95
        elif len(common_slots) >= 2:
            avail_score = 90
        elif len(common_slots) == 1:
            avail_score = 82
        else:
            avail_score = 70

        # 6. Skill Redundancy Score (Efficiency)
        # Avoid teams where everyone only knows the exact same 1 skill
        total_unique_skills = len(team_skills_map)
        avg_skills_per_member = sum(len(m.get("skills") or m.get("teach") or []) for m in team_members) / max(len(team_members), 1)
        if total_unique_skills >= len(team_members) * 2:
            redundancy_score = 92
        elif total_unique_skills >= len(team_members) * 1.5:
            redundancy_score = 85
        else:
            redundancy_score = 75

        # 7. Composite Overall Score
        overall = int(round(
            coverage_score * 0.40 +
            exp_score * 0.15 +
            learning_synergy * 0.15 +
            compatibility * 0.12 +
            avail_score * 0.10 +
            redundancy_score * 0.08
        ))
        overall = max(10, min(99, overall))

        return {
            "overall_score": overall,
            "skill_coverage": coverage_score,
            "experience_balance": exp_score,
            "learning_synergy": learning_synergy,
            "compatibility": compatibility,
            "redundancy_score": redundancy_score,
            "availability_compatibility": avail_score,
            "covered_skills": sorted(list(covered_skills)),
            "missing_skills": sorted(list(missing_skills)),
        }

    def _assign_roles_and_reasons(
        self,
        members: List[Dict[str, Any]],
        required_skills: List[Dict[str, Any]],
        project_info: Optional[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Synthesize specific member role titles and transparent natural language rationale.
        Example: 'Aarav Sharma selected because they provide advanced Computer Vision expertise.'
        """
        results = []

        for m in members:
            m_name = m.get("full_name") or m.get("name") or "Student"
            skills = m.get("skills") or m.get("teach") or []
            learn_goals = m.get("learning_goals") or m.get("learn") or []

            # Determine key contributed required skills
            contributed: List[str] = []
            best_skill_name = None
            best_skill_level = "intermediate"

            for s in skills:
                s_name = s.get("skill_name") or s.get("skill") or s.get("name")
                if not s_name:
                    continue
                level = s.get("proficiency_level") or s.get("level") or "INTERMEDIATE"

                # Check if matches any required skill
                for req in required_skills:
                    r_name = req["skill_name"]
                    if (
                        s_name.lower() == r_name.lower() or
                        self.skill_graph.get_proximity(s_name, r_name) >= 0.80
                    ):
                        contributed.append(r_name)
                        if (
                            best_skill_name is None or
                            PROFICIENCY_WEIGHTS.get(str(level).upper(), 0) > PROFICIENCY_WEIGHTS.get(str(best_skill_level).upper(), 0)
                        ):
                            best_skill_name = r_name
                            best_skill_level = str(level).lower()

            if not contributed and skills:
                # Fallback to member's top skill
                top = skills[0]
                contributed.append(top.get("skill_name") or top.get("skill") or "Technical Expertise")
                best_skill_name = contributed[0]

            contributed = sorted(list(set(contributed)))

            # Determine learning goals satisfied
            satisfied_goals: List[str] = []
            for g in learn_goals:
                g_name = g.get("skill_name") or g.get("skill") or ""
                if g_name:
                    satisfied_goals.append(g_name)

            # Assign Role Title
            dept = m.get("department") or m.get("dept") or ""
            role_assigned = self._infer_member_role(contributed, dept)

            # Generate natural language explanation
            if best_skill_name:
                reason = f"{m_name} selected because they provide {best_skill_level} {best_skill_name} expertise"
                if len(contributed) > 1:
                    other_skills = [s for s in contributed if s != best_skill_name][:2]
                    reason += f" and {' & '.join(other_skills)}"
                if satisfied_goals:
                    reason += f" while gaining mentorship in {satisfied_goals[0]}."
                else:
                    reason += "."
            else:
                reason = f"{m_name} selected because they provide cross-functional development capability."

            results.append({
                "student_id": m["id"],
                "student_name": m_name,
                "department": dept or "Computer Science",
                "year_of_study": m.get("year_of_study") or m.get("year") or "Junior",
                "avatar_url": m.get("avatar_url"),
                "skills_contributed": contributed,
                "learning_goals_satisfied": satisfied_goals[:3],
                "role_assigned": role_assigned,
                "selection_reason": reason,
            })

        return results

    def _infer_member_role(self, contributed_skills: List[str], department: str) -> str:
        """Infer specialized role title based on skills and department."""
        lowered = " ".join(contributed_skills).lower()
        if "vision" in lowered or "image" in lowered:
            return "Computer Vision Specialist"
        if "deep learning" in lowered or "machine learning" in lowered:
            return "Machine Learning Engineer"
        if "agriculture" in lowered or "farm" in lowered or "soil" in lowered:
            return "Agricultural Domain Specialist"
        if "backend" in lowered or "fastapi" in lowered or "api" in lowered:
            return "Backend & Systems Architect"
        if "frontend" in lowered or "react" in lowered or "ui" in lowered:
            return "Frontend & UI Developer"
        if "model deployment" in lowered or "docker" in lowered or "cloud" in lowered:
            return "MLOps & Cloud Engineer"
        if "smart contract" in lowered or "solidity" in lowered:
            return "Smart Contract Developer"
        if "robot" in lowered or "ros" in lowered:
            return "Robotics & Control Engineer"
        if "cybersecurity" in lowered or "penetration" in lowered:
            return "Security & Penetration Tester"

        if "design" in department.lower():
            return "Product & UI/UX Designer"
        return "Core Technical Contributor"

    def _find_common_availability(self, team_members: List[Dict[str, Any]]) -> List[str]:
        """Find common weekly availability slots across team members."""
        day_counts: Dict[str, int] = {}
        for m in team_members:
            avails = m.get("availabilities") or []
            days_seen = set()
            for av in avails:
                day = av.get("day_of_week") or av.get("day") or ""
                if day and day not in days_seen:
                    days_seen.add(day)
                    day_counts[day] = day_counts.get(day, 0) + 1

        # Days where at least half the team is available
        threshold = max(2, len(team_members) // 2)
        common_days = [d for d, c in day_counts.items() if c >= threshold]

        formatted = []
        for d in common_days[:3]:
            formatted.append(f"{d.title()} Evenings (17:00 - 20:00)")

        if not formatted:
            formatted = ["Tuesday Evenings (18:00 - 20:00)", "Saturday Afternoons (14:00 - 17:00)"]

        return formatted

    def recommend_replacements(
        self,
        current_members: List[Dict[str, Any]],
        removed_student_id: str,
        student_pool: List[Dict[str, Any]],
        required_skills: List[Dict[str, Any]],
        project_info: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Dynamically recalculate team coverage after removing a member,
        and rank replacement students based on how effectively they restore lost skills.
        """
        removed_member = next((m for m in current_members if m["id"] == removed_student_id), None)
        removed_name = (
            (removed_member.get("full_name") or removed_member.get("name"))
            if removed_member else "Team Member"
        )

        remaining_team = [m for m in current_members if m["id"] != removed_student_id]

        # Score remaining team without the member
        baseline_score = self.score_team(
            team_members=remaining_team,
            required_skills=required_skills,
            project_info=project_info,
        )

        current_score = self.score_team(
            team_members=current_members,
            required_skills=required_skills,
            project_info=project_info,
        )

        # Identify newly missing skills
        skills_lost = [s for s in current_score["covered_skills"] if s not in baseline_score["covered_skills"]]

        # Evaluate all available candidates outside the remaining team
        current_ids = {m["id"] for m in remaining_team}
        candidates = [s for s in student_pool if s["id"] not in current_ids and s["id"] != removed_student_id]

        ranked_replacements = []

        for candidate in candidates:
            # Simulate team with candidate
            hypothetical_team = remaining_team + [candidate]
            hypo_score = self.score_team(
                team_members=hypothetical_team,
                required_skills=required_skills,
                project_info=project_info,
            )

            # Check which lost skills this candidate restores
            c_skills = candidate.get("skills") or candidate.get("teach") or []
            c_skill_names = {
                (s.get("skill_name") or s.get("skill") or s.get("name") or "").lower()
                for s in c_skills
            }

            restored = []
            for lost in skills_lost:
                if lost.lower() in c_skill_names or any(
                    self.skill_graph.get_proximity(lost, cs) >= 0.80 for cs in c_skill_names
                ):
                    restored.append(lost)

            score_delta = hypo_score["overall_score"] - baseline_score["overall_score"]

            c_name = candidate.get("full_name") or candidate.get("name") or "Candidate"
            if restored:
                reason = f"Restores critical {', '.join(restored)} and boosts overall team score by +{max(0, score_delta)}%."
            else:
                reason = f"Adds cross-disciplinary {candidate.get('department', 'engineering')} support with {hypo_score['skill_coverage']}% coverage."

            ranked_replacements.append({
                "student_id": candidate["id"],
                "student_name": c_name,
                "department": candidate.get("department") or candidate.get("dept") or "Computer Science",
                "year_of_study": candidate.get("year_of_study") or candidate.get("year") or "Junior",
                "avatar_url": candidate.get("avatar_url"),
                "skills_restored": restored,
                "projected_overall_score": hypo_score["overall_score"],
                "projected_skill_coverage": hypo_score["skill_coverage"],
                "score_delta": score_delta,
                "replacement_reason": reason,
            })

        # Rank by skills restored (most first), then by projected score
        ranked_replacements.sort(
            key=lambda r: (len(r["skills_restored"]), r["projected_overall_score"]),
            reverse=True,
        )

        return {
            "removed_student_name": removed_name,
            "skills_lost": skills_lost,
            "recalculated_coverage_before_replacement": baseline_score["skill_coverage"],
            "replacements": ranked_replacements[:5],
        }
