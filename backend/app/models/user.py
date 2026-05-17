from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime


class ProfileResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    email: str
    full_name: str
    role: str
    department: Optional[str] = None
    manager_id: Optional[str] = None
    created_at: Optional[datetime] = None


class ProfileCreate(BaseModel):
    id: str  # must match auth.users UUID
    email: str
    full_name: str
    role: str
    department: Optional[str] = None
    manager_id: Optional[str] = None


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    manager_id: Optional[str] = None
    role: Optional[str] = None
