"""
Database Seeder Script for AI Skill Exchange
Populates 55+ skills, 32 students, skills declarations, learning goals,
projects, skill requirements, matches, sessions, and credit transactions.
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Fix Windows console UTF-8 encoding
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add project root and backend to sys.path
script_dir = Path(__file__).resolve().parent
project_root = script_dir.parent
backend_dir = project_root / "backend"

for p in [str(project_root), str(backend_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from sqlalchemy import select
from app.database import async_session, create_tables
from app.core.security import hash_password
from app.models.enums import (
    ActivityEventType,
    CreditTransactionType,
    DayOfWeek,
    GoalStatus,
    MatchStatus,
    ProficiencyLevel,
    ProjectStatus,
    RequirementImportance,
    SessionStatus,
    SkillDirection,
    UserRole,
)
from app.models.activity import ActivityEvent
from app.models.availability import Availability
from app.models.credit import SkillCreditTransaction
from app.models.learning_goal import LearningGoal
from app.models.match import SkillMatch
from app.models.profile import StudentProfile
from app.models.project import Project, ProjectSkillRequirement, Team, TeamMember
from app.models.session import TeachingSession, LearningSession
from app.models.skill import Skill, StudentSkill
from app.models.user import User

from database.seeds.sample_data import SKILLS_SEED, STUDENTS_SEED, PROJECTS_SEED


async def seed_database():
    print("=" * 60)
    print("AI SKILL EXCHANGE -- SEEDING DATABASE")
    print("=" * 60)

    await create_tables()

    async with async_session() as db:
        # Check if already seeded
        existing_skills = await db.execute(select(Skill))
        if existing_skills.scalars().first():
            print("Notice: Database already contains skills. Skipping re-seeding.")
            return

        # -------------------------------------------------------------
        # 1. Seed Skills (First pass: skills without parent)
        # -------------------------------------------------------------
        print("\n1. Seeding Skills taxonomy...")
        skill_map = {}  # name -> Skill object

        # Pass 1: Root skills
        for s_data in SKILLS_SEED:
            if s_data["parent_name"] is None:
                skill = Skill(
                    name=s_data["name"],
                    category=s_data["category"],
                    description=s_data["description"],
                    aliases=s_data["aliases"],
                    parent_skill_id=None,
                )
                db.add(skill)
                skill_map[s_data["name"]] = skill

        await db.flush()

        # Pass 2: Sub-skills linking parent_skill_id
        for s_data in SKILLS_SEED:
            if s_data["parent_name"] is not None:
                parent = skill_map.get(s_data["parent_name"])
                skill = Skill(
                    name=s_data["name"],
                    category=s_data["category"],
                    description=s_data["description"],
                    aliases=s_data["aliases"],
                    parent_skill_id=parent.id if parent else None,
                )
                db.add(skill)
                skill_map[s_data["name"]] = skill

        await db.flush()
        print(f"[OK] Seeded {len(skill_map)} unique skills across 13 categories.")

        # -------------------------------------------------------------
        # 2. Seed Students, Profiles, Skills, Goals, Availabilities
        # -------------------------------------------------------------
        print("\n2. Seeding Student profiles & skills...")
        profile_map = {}  # email -> StudentProfile
        default_pwd_hash = hash_password("Password123!")

        days = [
            DayOfWeek.MONDAY,
            DayOfWeek.TUESDAY,
            DayOfWeek.WEDNESDAY,
            DayOfWeek.THURSDAY,
            DayOfWeek.FRIDAY,
        ]

        for i, s_data in enumerate(STUDENTS_SEED):
            # User
            user = User(
                email=s_data["email"],
                password_hash=default_pwd_hash,
                role=UserRole.STUDENT,
                is_active=True,
            )
            db.add(user)
            await db.flush()

            # StudentProfile
            profile = StudentProfile(
                user_id=user.id,
                full_name=s_data["name"],
                department=s_data["dept"],
                year_of_study=s_data["year"],
                bio=s_data["bio"],
                github_url=s_data["github"],
                credit_balance=100,
            )
            db.add(profile)
            await db.flush()
            profile_map[s_data["email"]] = profile

            # Initial credit grant
            tx = SkillCreditTransaction(
                from_student_id=None,
                to_student_id=profile.id,
                amount=100,
                transaction_type=CreditTransactionType.INITIAL_GRANT,
                description="Welcome credit bonus upon registration",
            )
            db.add(tx)

            # Profile created activity
            event = ActivityEvent(
                student_id=profile.id,
                event_type=ActivityEventType.PROFILE_CREATED,
                title="Joined AI Skill Exchange",
                description=f"{s_data['name']} joined from {s_data['dept']}.",
            )
            db.add(event)

            # TEACH Skills
            for t_skill in s_data.get("teach", []):
                skill_obj = skill_map.get(t_skill["skill"])
                if skill_obj:
                    ss = StudentSkill(
                        student_id=profile.id,
                        skill_id=skill_obj.id,
                        direction=SkillDirection.TEACH,
                        proficiency_level=ProficiencyLevel(t_skill["level"]),
                        years_experience=t_skill["exp"],
                        description=t_skill["desc"],
                        verified=True if t_skill["level"] in ["ADVANCED", "EXPERT"] else False,
                    )
                    db.add(ss)

            # LEARN Skills
            for l_skill in s_data.get("learn", []):
                skill_obj = skill_map.get(l_skill["skill"])
                if skill_obj:
                    ss = StudentSkill(
                        student_id=profile.id,
                        skill_id=skill_obj.id,
                        direction=SkillDirection.LEARN,
                        proficiency_level=ProficiencyLevel(l_skill["level"]),
                        years_experience=0.0,
                        description=l_skill["desc"],
                        verified=False,
                    )
                    db.add(ss)

                    # Add as active Learning Goal
                    goal = LearningGoal(
                        student_id=profile.id,
                        skill_id=skill_obj.id,
                        target_proficiency=ProficiencyLevel.ADVANCED,
                        target_date=datetime.now(timezone.utc) + timedelta(days=90),
                        description=f"Become proficient in {skill_obj.name} within the semester.",
                        status=GoalStatus.IN_PROGRESS,
                    )
                    db.add(goal)

            # Availability slots (1-2 weekly slots)
            assigned_day = days[i % len(days)]
            slot = Availability(
                student_id=profile.id,
                day_of_week=assigned_day,
                start_time="14:00",
                end_time="16:00",
                timezone="UTC",
                is_active=True,
            )
            db.add(slot)

        await db.flush()
        print(f"[OK] Seeded {len(profile_map)} students with credentials, profiles, skills, and availability.")

        # -------------------------------------------------------------
        # 3. Seed Campus Projects & Skill Requirements
        # -------------------------------------------------------------
        print("\n3. Seeding Campus Projects & Requirements...")
        for p_data in PROJECTS_SEED:
            owner = profile_map.get(p_data["owner_email"])
            if not owner:
                continue

            project = Project(
                owner_id=owner.id,
                title=p_data["title"],
                description=p_data["description"],
                category=p_data["category"],
                status=ProjectStatus.PLANNING,
                max_members=p_data["max_members"],
            )
            db.add(project)
            await db.flush()

            for req in p_data["requirements"]:
                skill_obj = skill_map.get(req["skill"])
                if skill_obj:
                    r_record = ProjectSkillRequirement(
                        project_id=project.id,
                        skill_id=skill_obj.id,
                        required_proficiency=ProficiencyLevel(req["level"]),
                        importance=RequirementImportance(req["importance"]),
                        description=req["desc"],
                    )
                    db.add(r_record)

        await db.flush()
        print(f"[OK] Seeded {len(PROJECTS_SEED)} collaborative projects with detailed skill requirements.")

        # -------------------------------------------------------------
        # 4. Seed Demonstrative Matches, Sessions, and Transactions
        # -------------------------------------------------------------
        print("\n4. Seeding Skill Matches & Peer Teaching Sessions...")
        # Match 1: Elena (wants Python) <-> Aarav (teaches Python)
        elena = profile_map.get("elena.rostova@university.edu")
        aarav = profile_map.get("aarav.sharma@university.edu")
        python_skill = skill_map.get("Python")

        if elena and aarav and python_skill:
            match1 = SkillMatch(
                learner_student_id=elena.id,
                teacher_student_id=aarav.id,
                skill_id=python_skill.id,
                match_score=0.95,
                match_reason="Elena wants to learn backend Python for web apps; Aarav is an expert teacher with 3.5 years experience.",
                status=MatchStatus.ACCEPTED,
            )
            db.add(match1)
            await db.flush()

            # Completed teaching session
            sess1 = TeachingSession(
                teacher_student_id=aarav.id,
                learner_student_id=elena.id,
                skill_id=python_skill.id,
                scheduled_at=datetime.now(timezone.utc) - timedelta(days=2),
                duration_minutes=60,
                credit_amount=15,
                status=SessionStatus.COMPLETED,
                meeting_link="https://meet.university.edu/aarav-elena-py",
                notes="Covered Python async/await syntax, list comprehensions, and virtual environments.",
            )
            db.add(sess1)
            await db.flush()

            # Learner review log
            log1 = LearningSession(
                session_id=sess1.id,
                student_id=elena.id,
                rating=5,
                feedback="Aarav is an incredible tutor. Demystified async loops with crystal-clear practical examples.",
                learned_summary="Understood asyncio event loop, async def, and writing non-blocking helper functions.",
                completed_at=datetime.now(timezone.utc) - timedelta(days=2),
            )
            db.add(log1)

            # Credit transfer
            elena.credit_balance -= 15
            aarav.credit_balance += 15
            tx1 = SkillCreditTransaction(
                from_student_id=elena.id,
                to_student_id=aarav.id,
                amount=15,
                transaction_type=CreditTransactionType.SESSION_TRANSFER,
                session_id=sess1.id,
                description="Session fee for Python async architecture tutoring",
            )
            db.add(tx1)

        # Match 2: Marcus (wants React) <-> Elena (teaches React)
        marcus = profile_map.get("marcus.vance@university.edu")
        react_skill = skill_map.get("React.js")

        if marcus and elena and react_skill:
            match2 = SkillMatch(
                learner_student_id=marcus.id,
                teacher_student_id=elena.id,
                skill_id=react_skill.id,
                match_score=0.92,
                match_reason="Marcus wants to code his Figma designs in React; Elena is an advanced React builder with 10+ projects.",
                status=MatchStatus.PROPOSED,
            )
            db.add(match2)

        # Match 3: Ananya (wants Computer Vision) <-> Chen Wei (teaches Computer Vision)
        ananya = profile_map.get("ananya.iyer@university.edu")
        chen = profile_map.get("chen.wei@university.edu")
        cv_skill = skill_map.get("Computer Vision")

        if ananya and chen and cv_skill:
            match3 = SkillMatch(
                learner_student_id=ananya.id,
                teacher_student_id=chen.id,
                skill_id=cv_skill.id,
                match_score=0.98,
                match_reason="Ananya needs edge vision models for agricultural drone weed detection; Chen Wei is a PhD researcher in CV & PyTorch.",
                status=MatchStatus.ACCEPTED,
            )
            db.add(match3)

        await db.commit()
        print("[OK] Seeded realistic matches, teaching sessions, reviews, and credit transactions.")
        print("\n" + "=" * 60)
        print("SEEDING COMPLETED SUCCESSFULLY!")
        print("Default password for all student accounts: Password123!")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(seed_database())
