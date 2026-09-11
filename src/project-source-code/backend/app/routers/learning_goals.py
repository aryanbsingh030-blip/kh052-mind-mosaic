"""
Learning Goals Endpoints
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_db
from app.models.activity import ActivityEvent
from app.models.enums import ActivityEventType
from app.models.learning_goal import LearningGoal
from app.models.profile import StudentProfile
from app.models.skill import Skill
from app.schemas.learning_goal import (
    LearningGoalCreate,
    LearningGoalUpdate,
    LearningGoalResponse,
)

router = APIRouter(prefix="/v1/learning-goals", tags=["Learning Goals"])


@router.post("", response_model=LearningGoalResponse, status_code=status.HTTP_201_CREATED)
async def create_learning_goal(
    student_id: str,
    data: LearningGoalCreate,
    db: AsyncSession = Depends(get_db),
):
    """Set an active learning goal for a student towards a specific skill."""
    student = await db.get(StudentProfile, student_id)
    if not student:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found")

    skill = await db.get(Skill, data.skill_id)
    if not skill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")

    goal = LearningGoal(
        student_id=student_id,
        skill_id=data.skill_id,
        target_proficiency=data.target_proficiency,
        target_date=data.target_date,
        description=data.description,
    )
    db.add(goal)

    event = ActivityEvent(
        student_id=student_id,
        event_type=ActivityEventType.LEARNING_GOAL_SET,
        title=f"New Goal: Master {skill.name}",
        description=f"Targeting {data.target_proficiency.value} proficiency level",
    )
    db.add(event)
    await db.commit()
    await db.refresh(goal)

    return LearningGoalResponse(
        id=goal.id,
        student_id=goal.student_id,
        skill_id=goal.skill_id,
        skill_name=skill.name,
        skill_category=skill.category,
        target_proficiency=goal.target_proficiency,
        target_date=goal.target_date,
        description=goal.description,
        status=goal.status,
        created_at=goal.created_at,
        updated_at=goal.updated_at,
    )


@router.get("/student/{student_id}", response_model=List[LearningGoalResponse])
async def list_student_learning_goals(student_id: str, db: AsyncSession = Depends(get_db)):
    """List all learning goals set by a student."""
    result = await db.execute(
        select(LearningGoal)
        .where(LearningGoal.student_id == student_id)
        .options(joinedload(LearningGoal.skill))
        .order_by(LearningGoal.created_at.desc())
    )
    goals = result.scalars().all()

    return [
        LearningGoalResponse(
            id=g.id,
            student_id=g.student_id,
            skill_id=g.skill_id,
            skill_name=g.skill.name if g.skill else None,
            skill_category=g.skill.category if g.skill else None,
            target_proficiency=g.target_proficiency,
            target_date=g.target_date,
            description=g.description,
            status=g.status,
            created_at=g.created_at,
            updated_at=g.updated_at,
        )
        for g in goals
    ]


@router.put("/{goal_id}", response_model=LearningGoalResponse)
async def update_learning_goal(
    goal_id: str,
    data: LearningGoalUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update target date, proficiency, status, or description of a learning goal."""
    result = await db.execute(
        select(LearningGoal)
        .where(LearningGoal.id == goal_id)
        .options(joinedload(LearningGoal.skill))
    )
    goal = result.scalar_one_or_none()
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learning goal not found")

    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(goal, field, val)

    await db.commit()
    await db.refresh(goal)

    return LearningGoalResponse(
        id=goal.id,
        student_id=goal.student_id,
        skill_id=goal.skill_id,
        skill_name=goal.skill.name if goal.skill else None,
        skill_category=goal.skill.category if goal.skill else None,
        target_proficiency=goal.target_proficiency,
        target_date=goal.target_date,
        description=goal.description,
        status=goal.status,
        created_at=goal.created_at,
        updated_at=goal.updated_at,
    )


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_learning_goal(goal_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a student learning goal."""
    goal = await db.get(LearningGoal, goal_id)
    if not goal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Learning goal not found")

    await db.delete(goal)
    await db.commit()
    return None
