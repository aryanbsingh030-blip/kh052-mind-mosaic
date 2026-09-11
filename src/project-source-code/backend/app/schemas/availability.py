"""
Availability Schemas
"""

from typing import Optional

from pydantic import BaseModel, Field

from app.models.enums import DayOfWeek


class AvailabilityCreate(BaseModel):
    day_of_week: DayOfWeek
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="HH:MM format, e.g. 09:00")
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$", description="HH:MM format, e.g. 11:00")
    timezone: str = Field(default="UTC", max_length=50)
    is_active: bool = True


class AvailabilityResponse(BaseModel):
    id: str
    student_id: str
    day_of_week: DayOfWeek
    start_time: str
    end_time: str
    timezone: str
    is_active: bool

    model_config = {"from_attributes": True}
