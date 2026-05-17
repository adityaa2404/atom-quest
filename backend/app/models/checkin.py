from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional
from datetime import datetime, date


QUARTERS = ("Q1", "Q2", "Q3", "Q4")
ACHIEVEMENT_STATUSES = ("not_started", "on_track", "completed")


class AchievementSave(BaseModel):
    goal_id: str
    quarter: str
    actual_value: Optional[float] = None
    actual_date: Optional[date] = None
    status: str = "not_started"
    comment: Optional[str] = None

    @field_validator("quarter")
    @classmethod
    def valid_quarter(cls, v: str) -> str:
        if v not in QUARTERS:
            raise ValueError(f"quarter must be one of {QUARTERS}")
        return v

    @field_validator("status")
    @classmethod
    def valid_status(cls, v: str) -> str:
        if v not in ACHIEVEMENT_STATUSES:
            raise ValueError(f"status must be one of {ACHIEVEMENT_STATUSES}")
        return v


class AchievementResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    goal_id: str
    quarter: str
    actual_value: Optional[float] = None
    actual_date: Optional[date] = None
    status: str
    computed_score: Optional[float] = None
    employee_comment: Optional[str] = None
    updated_at: Optional[datetime] = None


class CheckinSubmit(BaseModel):
    goal_sheet_id: str
    quarter: str
    comment: str

    @field_validator("quarter")
    @classmethod
    def valid_quarter(cls, v: str) -> str:
        if v not in QUARTERS:
            raise ValueError(f"quarter must be one of {QUARTERS}")
        return v

    @field_validator("comment")
    @classmethod
    def comment_required(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Check-in comment is required")
        return v.strip()


class CheckinResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    goal_sheet_id: str
    quarter: str
    manager_id: str
    comment: str
    checked_in_at: Optional[datetime] = None
