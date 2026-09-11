"""
Project, ProjectSkillRequirement, Team, and TeamMember Models
"""

import uuid
from datetime import datetime, timezone
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ProficiencyLevel, ProjectStatus, RequirementImportance, TeamRole, TeamStatus

if TYPE_CHECKING:
    from app.models.profile import StudentProfile
    from app.models.skill import Skill


class Project(Base):
    """A campus project created by a student seeking collaborators and balanced teams."""

    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    owner_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(100), default="General", nullable=False)
    status: Mapped[ProjectStatus] = mapped_column(
        SAEnum(ProjectStatus, native_enum=False, length=20),
        default=ProjectStatus.PLANNING,
        nullable=False,
    )
    max_members: Mapped[int] = mapped_column(Integer, default=4, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    owner: Mapped["StudentProfile"] = relationship("StudentProfile", back_populates="projects")
    
    skill_requirements: Mapped[List["ProjectSkillRequirement"]] = relationship(
        "ProjectSkillRequirement",
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    
    teams: Mapped[List["Team"]] = relationship(
        "Team",
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Project(id={self.id}, title={self.title}, status={self.status})>"


class ProjectSkillRequirement(Base):
    """Required or preferred skill for joining or staffing a project."""

    __tablename__ = "project_skill_requirements"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    skill_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("skills.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    required_proficiency: Mapped[ProficiencyLevel] = mapped_column(
        SAEnum(ProficiencyLevel, native_enum=False, length=20),
        default=ProficiencyLevel.INTERMEDIATE,
        nullable=False,
    )
    importance: Mapped[RequirementImportance] = mapped_column(
        SAEnum(RequirementImportance, native_enum=False, length=20),
        default=RequirementImportance.MANDATORY,
        nullable=False,
    )
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="skill_requirements")
    skill: Mapped["Skill"] = relationship("Skill", back_populates="project_requirements", lazy="joined")

    def __repr__(self) -> str:
        return f"<ProjectSkillRequirement(project={self.project_id}, skill={self.skill_id}, importance={self.importance})>"


class Team(Base):
    """A formed or forming team executing a project."""

    __tablename__ = "teams"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    project_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("projects.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[TeamStatus] = mapped_column(
        SAEnum(TeamStatus, native_enum=False, length=20),
        default=TeamStatus.FORMING,
        nullable=False,
    )
    formed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="teams")
    members: Mapped[List["TeamMember"]] = relationship(
        "TeamMember",
        back_populates="team",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<Team(id={self.id}, name={self.name}, status={self.status})>"


class TeamMember(Base):
    """Junction linking a student to a project team with a specific role."""

    __tablename__ = "team_members"

    id: Mapped[str] = mapped_column(
        String(36),
        primary_key=True,
        default=lambda: str(uuid.uuid4()),
    )
    team_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("teams.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    student_id: Mapped[str] = mapped_column(
        String(36),
        ForeignKey("student_profiles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    role: Mapped[TeamRole] = mapped_column(
        SAEnum(TeamRole, native_enum=False, length=20),
        default=TeamRole.CONTRIBUTOR,
        nullable=False,
    )
    joined_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    team: Mapped["Team"] = relationship("Team", back_populates="members")
    student: Mapped["StudentProfile"] = relationship("StudentProfile", back_populates="team_memberships", lazy="joined")

    def __repr__(self) -> str:
        return f"<TeamMember(team={self.team_id}, student={self.student_id}, role={self.role})>"
