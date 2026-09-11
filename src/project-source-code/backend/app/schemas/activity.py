"""
Activity and Audit Event Schemas
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models.enums import ActivityEventType


class ActivityEventResponse(BaseModel):
    id: str
    student_id: str
    student_name: Optional[str] = None
    event_type: ActivityEventType
    title: str
    description: Optional[str] = None
    metadata_json: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}
