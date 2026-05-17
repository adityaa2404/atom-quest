from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, List
from datetime import datetime, date


UOM_TYPES = ("min_numeric", "min_percent", "max_numeric", "max_percent", "timeline", "zero")
SHEET_STATUSES = ("draft", "submitted", "returned", "approved", "locked")


class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    thrust_area_id: Optional[str] = None
    uom_type: str
    target_value: Optional[float] = None
    target_date: Optional[date] = None
    weightage: int

    @field_validator("title")
    @classmethod
    def title_min_length(cls, v: str) -> str:
        if len(v.strip()) < 5:
            raise ValueError("Title must be at least 5 characters")
        return v.strip()

    @field_validator("uom_type")
    @classmethod
    def valid_uom(cls, v: str) -> str:
        if v not in UOM_TYPES:
            raise ValueError(f"uom_type must be one of {UOM_TYPES}")
        return v

    @field_validator("weightage")
    @classmethod
    def min_weightage(cls, v: int) -> int:
        if v < 10:
            raise ValueError("Minimum weightage is 10%")
        return v


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    thrust_area_id: Optional[str] = None
    uom_type: Optional[str] = None
    target_value: Optional[float] = None
    target_date: Optional[date] = None
    weightage: Optional[int] = None

    @field_validator("title")
    @classmethod
    def title_min_length(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v.strip()) < 5:
            raise ValueError("Title must be at least 5 characters")
        return v.strip() if v else v

    @field_validator("weightage")
    @classmethod
    def min_weightage(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 10:
            raise ValueError("Minimum weightage is 10%")
        return v


class ManagerGoalEdit(BaseModel):
    target_value: Optional[float] = None
    target_date: Optional[date] = None
    weightage: Optional[int] = None

    @field_validator("weightage")
    @classmethod
    def min_weightage(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 10:
            raise ValueError("Minimum weightage is 10%")
        return v


class GoalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    goal_sheet_id: str
    shared_goal_group_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    thrust_area_id: Optional[str] = None
    uom_type: str
    target_value: Optional[float] = None
    target_date: Optional[date] = None
    weightage: int
    sort_order: int = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class GoalSheetCreate(BaseModel):
    cycle_id: str


class ReturnSheetRequest(BaseModel):
    comment: str

    @field_validator("comment")
    @classmethod
    def comment_required(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Return comment is required")
        return v.strip()


class GoalSheetResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    employee_id: str
    cycle_id: str
    status: str
    submitted_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    return_comment: Optional[str] = None
    created_at: Optional[datetime] = None
    goals: Optional[List[GoalResponse]] = None


class SharedGoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    thrust_area_id: Optional[str] = None
    uom_type: str
    target_value: Optional[float] = None
    target_date: Optional[date] = None
    employee_ids: List[str]
    cycle_id: str

    @field_validator("title")
    @classmethod
    def title_min_length(cls, v: str) -> str:
        if len(v.strip()) < 5:
            raise ValueError("Title must be at least 5 characters")
        return v.strip()

    @field_validator("uom_type")
    @classmethod
    def valid_uom(cls, v: str) -> str:
        if v not in UOM_TYPES:
            raise ValueError(f"uom_type must be one of {UOM_TYPES}")
        return v

    @field_validator("employee_ids")
    @classmethod
    def employees_required(cls, v: List[str]) -> List[str]:
        if not v:
            raise ValueError("At least one employee must be selected")
        return v
