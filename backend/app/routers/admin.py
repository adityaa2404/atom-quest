from fastapi import APIRouter, Depends, HTTPException
from typing import Optional

from app.config import supabase
from app.middleware.auth import get_current_user, admin_only, manager_or_above
from app.models.admin import (
    CycleCreate, CycleUpdate, ThrustAreaCreate,
    UnlockRequest, AuditLogResponse,
)
from app.models.user import ProfileCreate, ProfileUpdate
from app.services.audit_service import log_audit
from app.utils import now_iso, invalidate_cycle_cache, get_active_cycle, get_open_quarter

router = APIRouter()


# ── Cycles ────────────────────────────────────────────────────────────────────

@router.get("/cycles")
async def list_cycles(current_user: dict = Depends(get_current_user)):
    result = supabase.table("cycles").select("*").order("created_at", desc=True).execute()
    return result.data


@router.post("/cycles", status_code=201)
async def create_cycle(
    body: CycleCreate,
    current_user: dict = Depends(admin_only),
):
    data = body.model_dump()
    for k, v in data.items():
        if v is not None and hasattr(v, "isoformat"):
            data[k] = v.isoformat()
    result = supabase.table("cycles").insert(data).execute()
    return result.data[0]


@router.put("/cycles/{cycle_id}")
async def update_cycle(
    cycle_id: str,
    body: CycleUpdate,
    current_user: dict = Depends(admin_only),
):
    existing = supabase.table("cycles").select("id").eq("id", cycle_id).maybe_single().execute()
    if not existing.data:
        raise HTTPException(404, "Cycle not found")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    for k, v in updates.items():
        if hasattr(v, "isoformat"):
            updates[k] = v.isoformat()

    result = supabase.table("cycles").update(updates).eq("id", cycle_id).execute()
    return result.data[0]


@router.post("/cycles/{cycle_id}/activate")
async def activate_cycle(
    cycle_id: str,
    current_user: dict = Depends(admin_only),
):
    existing = supabase.table("cycles").select("id").eq("id", cycle_id).maybe_single().execute()
    if not existing.data:
        raise HTTPException(404, "Cycle not found")

    # Deactivate all cycles first
    supabase.table("cycles").update({"is_active": False}).neq("id", "00000000-0000-0000-0000-000000000000").execute()
    # Activate the selected one
    result = supabase.table("cycles").update({"is_active": True}).eq("id", cycle_id).execute()

    invalidate_cycle_cache()
    log_audit("cycle", cycle_id, "activate", current_user["id"],
              new_values={"is_active": True})
    return result.data[0]


# ── Thrust Areas ──────────────────────────────────────────────────────────────

@router.get("/thrust-areas")
async def list_thrust_areas(current_user: dict = Depends(get_current_user)):
    result = supabase.table("thrust_areas").select("*").execute()
    return result.data


@router.post("/thrust-areas", status_code=201)
async def create_thrust_area(
    body: ThrustAreaCreate,
    current_user: dict = Depends(admin_only),
):
    result = supabase.table("thrust_areas").insert({
        "name": body.name,
        "description": body.description,
    }).execute()
    return result.data[0]


@router.put("/thrust-areas/{area_id}")
async def update_thrust_area(
    area_id: str,
    body: ThrustAreaCreate,
    current_user: dict = Depends(admin_only),
):
    existing = supabase.table("thrust_areas").select("id").eq("id", area_id).maybe_single().execute()
    if not existing.data:
        raise HTTPException(404, "Thrust area not found")
    result = supabase.table("thrust_areas").update({
        "name": body.name,
        "description": body.description,
    }).eq("id", area_id).execute()
    return result.data[0]


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users")
async def list_users(
    role: Optional[str] = None,
    department: Optional[str] = None,
    current_user: dict = Depends(admin_only),
):
    query = supabase.table("profiles").select("*")
    if role:
        query = query.eq("role", role)
    if department:
        query = query.eq("department", department)
    result = query.order("full_name").execute()
    return result.data


@router.post("/users", status_code=201)
async def create_user_profile(
    body: ProfileCreate,
    current_user: dict = Depends(admin_only),
):
    existing = supabase.table("profiles").select("id").eq("id", body.id).maybe_single().execute()
    if existing.data:
        raise HTTPException(409, "Profile already exists for this user ID")

    result = supabase.table("profiles").insert(body.model_dump()).execute()
    return result.data[0]


@router.put("/users/{user_id}")
async def update_user_profile(
    user_id: str,
    body: ProfileUpdate,
    current_user: dict = Depends(admin_only),
):
    existing = supabase.table("profiles").select("id").eq("id", user_id).maybe_single().execute()
    if not existing.data:
        raise HTTPException(404, "User not found")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    result = supabase.table("profiles").update(updates).eq("id", user_id).execute()
    return result.data[0]


# ── Goal Sheets: Admin View + Unlock ─────────────────────────────────────────

@router.get("/goal-sheets")
async def list_all_goal_sheets(
    cycle_id: Optional[str] = None,
    status: Optional[str] = None,
    department: Optional[str] = None,
    current_user: dict = Depends(admin_only),
):
    query = supabase.table("goal_sheets").select(
        "*, profiles!goal_sheets_employee_id_fkey(full_name, email, department, manager_id)"
    )
    if cycle_id:
        query = query.eq("cycle_id", cycle_id)
    if status:
        query = query.eq("status", status)

    result = query.order("created_at", desc=True).execute()
    sheets = result.data

    if department:
        sheets = [s for s in sheets if s.get("profiles", {}).get("department") == department]

    return sheets


@router.post("/goal-sheets/{sheet_id}/unlock")
async def unlock_goal_sheet(
    sheet_id: str,
    body: UnlockRequest,
    current_user: dict = Depends(admin_only),
):
    sheet = supabase.table("goal_sheets").select("*")\
        .eq("id", sheet_id).maybe_single().execute()
    if not sheet.data:
        raise HTTPException(404, "Goal sheet not found")
    if sheet.data["status"] not in ("locked", "approved"):
        raise HTTPException(400, "Only locked/approved sheets can be unlocked")

    old_status = sheet.data["status"]
    supabase.table("goal_sheets").update({
        "status": "draft",
        "approved_at": None,
        "approved_by": None,
    }).eq("id", sheet_id).execute()

    log_audit("goal_sheet", sheet_id, "unlock", current_user["id"],
              old_values={"status": old_status},
              new_values={"status": "draft"},
              reason=body.reason)

    return {"message": "Goal sheet unlocked and set to draft"}


# ── Audit Logs ────────────────────────────────────────────────────────────────

@router.get("/audit-logs")
async def get_audit_logs(
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    action: Optional[str] = None,
    changed_by: Optional[str] = None,
    current_user: dict = Depends(admin_only),
):
    query = supabase.table("audit_logs").select(
        "*, profiles!audit_logs_changed_by_fkey(full_name, email)"
    )
    if entity_type:
        query = query.eq("entity_type", entity_type)
    if entity_id:
        query = query.eq("entity_id", entity_id)
    if action:
        query = query.eq("action", action)
    if changed_by:
        query = query.eq("changed_by", changed_by)

    result = query.order("created_at", desc=True).limit(500).execute()
    return result.data


# ── Completion Dashboard ──────────────────────────────────────────────────────

@router.get("/completion-dashboard")
async def completion_dashboard(
    cycle_id: Optional[str] = None,
    current_user: dict = Depends(admin_only),
):
    if not cycle_id:
        cycle = get_active_cycle(supabase)
        cycle_id = cycle["id"]
    else:
        cycle_r = supabase.table("cycles").select("*").eq("id", cycle_id).maybe_single().execute()
        if not cycle_r.data:
            raise HTTPException(404, "Cycle not found")
        cycle = cycle_r.data

    employees = supabase.table("profiles").select("id, full_name, department, manager_id")\
        .eq("role", "employee").execute()
    total_employees = len(employees.data)

    sheets = supabase.table("goal_sheets").select("id, status")\
        .eq("cycle_id", cycle_id).execute()

    submitted = sum(1 for s in sheets.data if s["status"] in ("submitted", "locked", "approved"))
    approved = sum(1 for s in sheets.data if s["status"] in ("locked", "approved"))

    current_quarter = get_open_quarter(cycle)
    checkin_pct = 0.0

    if current_quarter and approved > 0:
        locked_sheets = [s for s in sheets.data if s["status"] in ("locked", "approved")]
        locked_sheet_ids = [s["id"] for s in locked_sheets]
        checkins = supabase.table("checkins").select("goal_sheet_id")\
            .in_("goal_sheet_id", locked_sheet_ids).eq("quarter", current_quarter).execute()
        checkin_pct = (len(checkins.data) / len(locked_sheets) * 100) if locked_sheets else 0.0

    submitted_pct = (submitted / total_employees * 100) if total_employees > 0 else 0.0
    approved_pct = (approved / total_employees * 100) if total_employees > 0 else 0.0

    # Quarterly check-in matrix per department
    dept_matrix = {}
    for emp in employees.data:
        dept = emp.get("department") or "Unassigned"
        if dept not in dept_matrix:
            dept_matrix[dept] = {
                "employees": 0,
                "Q1": None, "Q2": None, "Q3": None, "Q4": None,
            }
        dept_matrix[dept]["employees"] += 1

    return {
        "total_employees": total_employees,
        "submitted_count": submitted,
        "submitted_pct": round(submitted_pct, 1),
        "approved_count": approved,
        "approved_pct": round(approved_pct, 1),
        "current_quarter": current_quarter,
        "current_quarter_checkin_pct": round(checkin_pct, 1),
        "cycle_id": cycle_id,
    }
