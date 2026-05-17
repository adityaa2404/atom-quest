from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional, Any
from datetime import datetime, date


class CycleCreate(BaseModel):
    name: str
    goal_setting_start: date
    goal_setting_end: date
    q1_start: Optional[date] = None
    q1_end: Optional[date] = None
    q2_start: Optional[date] = None
    q2_end: Optional[date] = None
    q3_start: Optional[date] = None
    q3_end: Optional[date] = None
    q4_start: Optional[date] = None
    q4_end: Optional[date] = None


class CycleUpdate(BaseModel):
    name: Optional[str] = None
    goal_setting_start: Optional[date] = None
    goal_setting_end: Optional[date] = None
    q1_start: Optional[date] = None
    q1_end: Optional[date] = None
    q2_start: Optional[date] = None
    q2_end: Optional[date] = None
    q3_start: Optional[date] = None
    q3_end: Optional[date] = None
    q4_start: Optional[date] = None
    q4_end: Optional[date] = None


class CycleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    goal_setting_start: date
    goal_setting_end: date
    q1_start: Optional[date] = None
    q1_end: Optional[date] = None
    q2_start: Optional[date] = None
    q2_end: Optional[date] = None
    q3_start: Optional[date] = None
    q3_end: Optional[date] = None
    q4_start: Optional[date] = None
    q4_end: Optional[date] = None
    is_active: bool = False
    created_at: Optional[datetime] = None


class ThrustAreaCreate(BaseModel):
    name: str
    description: Optional[str] = None

    @field_validator("name")
    @classmethod
    def name_required(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Thrust area name is required")
        return v.strip()


class ThrustAreaResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: Optional[str] = None
    is_active: bool = True


class AuditLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    entity_type: str
    entity_id: str
    action: str
    changed_by: str
    old_values: Optional[Any] = None
    new_values: Optional[Any] = None
    reason: Optional[str] = None
    created_at: Optional[datetime] = None


class UnlockRequest(BaseModel):
    reason: str

    @field_validator("reason")
    @classmethod
    def reason_required(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Unlock reason is required")
        return v.strip()


class EscalationRuleCreate(BaseModel):
    name: str
    condition_type: str
    threshold_days: int
    level_2_after_days: int = 3
    level_3_after_days: int = 5
    cycle_id: str

    @field_validator("condition_type")
    @classmethod
    def valid_condition(cls, v: str) -> str:
        valid = ("goal_not_submitted", "goal_not_approved", "checkin_not_completed")
        if v not in valid:
            raise ValueError(f"condition_type must be one of {valid}")
        return v


class EscalationRuleUpdate(BaseModel):
    name: Optional[str] = None
    threshold_days: Optional[int] = None
    level_2_after_days: Optional[int] = None
    level_3_after_days: Optional[int] = None
    is_active: Optional[bool] = None


class EscalationRuleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    condition_type: str
    threshold_days: int
    level_2_after_days: int
    level_3_after_days: int
    is_active: bool
    cycle_id: Optional[str] = None
    created_at: Optional[datetime] = None


class EscalationLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    rule_id: Optional[str] = None
    employee_id: Optional[str] = None
    current_level: int
    status: str
    triggered_at: Optional[datetime] = None
    escalated_to_l2_at: Optional[datetime] = None
    escalated_to_l3_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    notes: Optional[str] = None


class ResolveEscalationRequest(BaseModel):
    notes: str

    @field_validator("notes")
    @classmethod
    def notes_required(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Resolution notes are required")
        return v.strip()
