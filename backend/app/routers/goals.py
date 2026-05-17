from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone
from typing import Optional

from app.config import supabase
from app.middleware.auth import get_current_user, manager_or_above, admin_only
from app.models.goal import (
    GoalCreate, GoalUpdate, GoalResponse, GoalSheetCreate, GoalSheetResponse,
    ReturnSheetRequest, SharedGoalCreate, ManagerGoalEdit,
)
from app.services.audit_service import log_audit

router = APIRouter()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_active_cycle() -> dict:
    result = supabase.table("cycles").select("*").eq("is_active", True).maybe_single().execute()
    if not result.data:
        raise HTTPException(400, "No active cycle found")
    return result.data


def _get_or_create_sheet(employee_id: str, cycle_id: str) -> dict:
    existing = supabase.table("goal_sheets").select("*")\
        .eq("employee_id", employee_id).eq("cycle_id", cycle_id)\
        .maybe_single().execute()
    if existing.data:
        return existing.data
    new_sheet = supabase.table("goal_sheets").insert({
        "employee_id": employee_id,
        "cycle_id": cycle_id,
        "status": "draft",
    }).execute()
    return new_sheet.data[0]


# ── Thrust Areas ─────────────────────────────────────────────────────────────

@router.get("/thrust-areas")
async def list_thrust_areas(current_user: dict = Depends(get_current_user)):
    result = supabase.table("thrust_areas").select("*").eq("is_active", True).execute()
    return result.data


# ── Employee: Goal Sheet CRUD ─────────────────────────────────────────────────

@router.get("/sheets/me")
async def get_my_sheet(
    cycle_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    if not cycle_id:
        cycle = _get_active_cycle()
        cycle_id = cycle["id"]

    sheet = supabase.table("goal_sheets").select("*")\
        .eq("employee_id", current_user["id"]).eq("cycle_id", cycle_id)\
        .maybe_single().execute()

    if not sheet.data:
        return None

    goals = supabase.table("goals").select("*")\
        .eq("goal_sheet_id", sheet.data["id"])\
        .order("sort_order").execute()

    return {**sheet.data, "goals": goals.data}


@router.post("/sheets", status_code=201)
async def create_sheet(
    body: GoalSheetCreate,
    current_user: dict = Depends(get_current_user),
):
    existing = supabase.table("goal_sheets").select("id")\
        .eq("employee_id", current_user["id"]).eq("cycle_id", body.cycle_id)\
        .maybe_single().execute()
    if existing.data:
        raise HTTPException(409, "Goal sheet already exists for this cycle")

    result = supabase.table("goal_sheets").insert({
        "employee_id": current_user["id"],
        "cycle_id": body.cycle_id,
        "status": "draft",
    }).execute()
    return result.data[0]


@router.post("/sheets/{sheet_id}/goals", status_code=201)
async def add_goal(
    sheet_id: str,
    body: GoalCreate,
    current_user: dict = Depends(get_current_user),
):
    sheet = supabase.table("goal_sheets").select("*")\
        .eq("id", sheet_id).eq("employee_id", current_user["id"])\
        .maybe_single().execute()
    if not sheet.data:
        raise HTTPException(404, "Goal sheet not found")
    if sheet.data["status"] not in ("draft", "returned"):
        raise HTTPException(400, "Cannot add goals to a sheet in its current state")

    current_goals = supabase.table("goals").select("id")\
        .eq("goal_sheet_id", sheet_id).execute()
    if len(current_goals.data) >= 8:
        raise HTTPException(400, "Maximum 8 goals allowed per sheet")

    result = supabase.table("goals").insert({
        "goal_sheet_id": sheet_id,
        "title": body.title,
        "description": body.description,
        "thrust_area_id": body.thrust_area_id,
        "uom_type": body.uom_type,
        "target_value": body.target_value,
        "target_date": body.target_date.isoformat() if body.target_date else None,
        "weightage": body.weightage,
        "sort_order": len(current_goals.data),
    }).execute()
    return result.data[0]


@router.put("/{goal_id}")
async def update_goal(
    goal_id: str,
    body: GoalUpdate,
    current_user: dict = Depends(get_current_user),
):
    goal = supabase.table("goals").select("*, goal_sheets(*)")\
        .eq("id", goal_id).maybe_single().execute()
    if not goal.data:
        raise HTTPException(404, "Goal not found")

    sheet = goal.data.get("goal_sheets") or {}
    if sheet.get("employee_id") != current_user["id"]:
        raise HTTPException(403, "You do not own this goal")
    if sheet.get("status") not in ("draft", "returned"):
        raise HTTPException(400, "Cannot edit goals on a sheet in its current state")

    if goal.data.get("shared_goal_group_id"):
        # Shared goal: only weightage can be changed
        if any(v is not None for k, v in body.model_dump().items() if k != "weightage"):
            raise HTTPException(400, "Only weightage can be modified on shared goals")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if "target_date" in updates and updates["target_date"]:
        updates["target_date"] = updates["target_date"].isoformat()
    updates["updated_at"] = _now_iso()

    result = supabase.table("goals").update(updates).eq("id", goal_id).execute()
    return result.data[0]


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: str,
    current_user: dict = Depends(get_current_user),
):
    goal = supabase.table("goals").select("*, goal_sheets(*)")\
        .eq("id", goal_id).maybe_single().execute()
    if not goal.data:
        raise HTTPException(404, "Goal not found")

    sheet = goal.data.get("goal_sheets") or {}
    if sheet.get("employee_id") != current_user["id"]:
        raise HTTPException(403, "You do not own this goal")
    if sheet.get("status") not in ("draft", "returned"):
        raise HTTPException(400, "Cannot delete goals from a submitted or approved sheet")

    if goal.data.get("shared_goal_group_id"):
        raise HTTPException(400, "Shared goals cannot be deleted by employees")

    log_audit("goal", goal_id, "delete", current_user["id"],
              old_values={"title": goal.data["title"], "weightage": goal.data["weightage"]})
    supabase.table("goals").delete().eq("id", goal_id).execute()


@router.post("/sheets/{sheet_id}/submit")
async def submit_sheet(
    sheet_id: str,
    current_user: dict = Depends(get_current_user),
):
    sheet = supabase.table("goal_sheets").select("*")\
        .eq("id", sheet_id).eq("employee_id", current_user["id"])\
        .maybe_single().execute()
    if not sheet.data:
        raise HTTPException(404, "Goal sheet not found")
    if sheet.data["status"] not in ("draft", "returned"):
        raise HTTPException(400, f"Cannot submit a sheet with status '{sheet.data['status']}'")

    goals = supabase.table("goals").select("*").eq("goal_sheet_id", sheet_id).execute()

    if not goals.data:
        raise HTTPException(400, "Cannot submit an empty goal sheet")
    if len(goals.data) > 8:
        raise HTTPException(400, "Maximum 8 goals allowed per sheet")

    total_weightage = sum(g["weightage"] for g in goals.data)
    if total_weightage != 100:
        raise HTTPException(400, f"Total weightage must equal 100%, currently {total_weightage}%")

    for g in goals.data:
        if g["weightage"] < 10:
            raise HTTPException(400, f"Goal '{g['title']}' has weightage below minimum 10%")
        if g["uom_type"] in ("min_numeric", "min_percent", "max_numeric", "max_percent"):
            if g["target_value"] is None:
                raise HTTPException(400, f"Goal '{g['title']}' requires a target value")
        if g["uom_type"] == "timeline" and not g["target_date"]:
            raise HTTPException(400, f"Goal '{g['title']}' requires a target date")

    old_status = sheet.data["status"]
    supabase.table("goal_sheets").update({
        "status": "submitted",
        "submitted_at": _now_iso(),
        "return_comment": None,
    }).eq("id", sheet_id).execute()

    log_audit("goal_sheet", sheet_id, "submit", current_user["id"],
              old_values={"status": old_status}, new_values={"status": "submitted"})

    return {"message": "Goal sheet submitted successfully"}


# ── Manager: Review, Approve, Return ─────────────────────────────────────────

@router.get("/team")
async def get_team_sheets(
    cycle_id: Optional[str] = None,
    current_user: dict = Depends(manager_or_above),
):
    if not cycle_id:
        cycle = _get_active_cycle()
        cycle_id = cycle["id"]

    team = supabase.table("profiles").select("id, full_name, email, department")\
        .eq("manager_id", current_user["id"]).execute()
    if not team.data:
        return []

    employee_ids = [e["id"] for e in team.data]
    sheets = supabase.table("goal_sheets").select("*")\
        .eq("cycle_id", cycle_id).in_("employee_id", employee_ids).execute()

    sheets_by_employee = {s["employee_id"]: s for s in sheets.data}

    result = []
    for emp in team.data:
        sheet = sheets_by_employee.get(emp["id"])
        result.append({
            **emp,
            "sheet": sheet,
            "sheet_status": sheet["status"] if sheet else "not_started",
        })
    return result


@router.get("/sheets/{sheet_id}/review")
async def review_sheet(
    sheet_id: str,
    current_user: dict = Depends(manager_or_above),
):
    sheet = supabase.table("goal_sheets").select("*")\
        .eq("id", sheet_id).maybe_single().execute()
    if not sheet.data:
        raise HTTPException(404, "Goal sheet not found")

    employee = supabase.table("profiles").select("*")\
        .eq("id", sheet.data["employee_id"]).maybe_single().execute()
    if not employee.data:
        raise HTTPException(404, "Employee not found")

    if (current_user["role"] == "manager"
            and employee.data.get("manager_id") != current_user["id"]):
        raise HTTPException(403, "This employee does not report to you")

    goals = supabase.table("goals").select("*")\
        .eq("goal_sheet_id", sheet_id).order("sort_order").execute()

    return {
        **sheet.data,
        "employee": employee.data,
        "goals": goals.data,
    }


@router.put("/sheets/{sheet_id}/approve")
async def approve_sheet(
    sheet_id: str,
    current_user: dict = Depends(manager_or_above),
):
    sheet = supabase.table("goal_sheets").select("*")\
        .eq("id", sheet_id).maybe_single().execute()
    if not sheet.data:
        raise HTTPException(404, "Goal sheet not found")
    if sheet.data["status"] != "submitted":
        raise HTTPException(400, "Only submitted sheets can be approved")

    employee = supabase.table("profiles").select("manager_id")\
        .eq("id", sheet.data["employee_id"]).maybe_single().execute()
    if (current_user["role"] == "manager"
            and employee.data.get("manager_id") != current_user["id"]):
        raise HTTPException(403, "This employee does not report to you")

    old_status = sheet.data["status"]
    supabase.table("goal_sheets").update({
        "status": "locked",
        "approved_at": _now_iso(),
        "approved_by": current_user["id"],
    }).eq("id", sheet_id).execute()

    log_audit("goal_sheet", sheet_id, "approve", current_user["id"],
              old_values={"status": old_status}, new_values={"status": "locked"})

    return {"message": "Goal sheet approved and locked"}


@router.put("/sheets/{sheet_id}/return")
async def return_sheet(
    sheet_id: str,
    body: ReturnSheetRequest,
    current_user: dict = Depends(manager_or_above),
):
    sheet = supabase.table("goal_sheets").select("*")\
        .eq("id", sheet_id).maybe_single().execute()
    if not sheet.data:
        raise HTTPException(404, "Goal sheet not found")
    if sheet.data["status"] != "submitted":
        raise HTTPException(400, "Only submitted sheets can be returned")

    employee = supabase.table("profiles").select("manager_id")\
        .eq("id", sheet.data["employee_id"]).maybe_single().execute()
    if (current_user["role"] == "manager"
            and employee.data.get("manager_id") != current_user["id"]):
        raise HTTPException(403, "This employee does not report to you")

    old_status = sheet.data["status"]
    supabase.table("goal_sheets").update({
        "status": "returned",
        "return_comment": body.comment,
    }).eq("id", sheet_id).execute()

    log_audit("goal_sheet", sheet_id, "return", current_user["id"],
              old_values={"status": old_status},
              new_values={"status": "returned", "return_comment": body.comment})

    return {"message": "Goal sheet returned for rework"}


@router.put("/sheets/{sheet_id}/goals/{goal_id}/manager-edit")
async def manager_edit_goal(
    sheet_id: str,
    goal_id: str,
    body: ManagerGoalEdit,
    current_user: dict = Depends(manager_or_above),
):
    sheet = supabase.table("goal_sheets").select("*")\
        .eq("id", sheet_id).maybe_single().execute()
    if not sheet.data:
        raise HTTPException(404, "Goal sheet not found")
    if sheet.data["status"] not in ("submitted", "returned"):
        raise HTTPException(400, "Can only edit goals on submitted or returned sheets")

    employee = supabase.table("profiles").select("manager_id")\
        .eq("id", sheet.data["employee_id"]).maybe_single().execute()
    if (current_user["role"] == "manager"
            and employee.data.get("manager_id") != current_user["id"]):
        raise HTTPException(403, "This employee does not report to you")

    goal = supabase.table("goals").select("*")\
        .eq("id", goal_id).eq("goal_sheet_id", sheet_id).maybe_single().execute()
    if not goal.data:
        raise HTTPException(404, "Goal not found in this sheet")

    old_values = {
        "target_value": goal.data.get("target_value"),
        "target_date": str(goal.data.get("target_date")) if goal.data.get("target_date") else None,
        "weightage": goal.data.get("weightage"),
    }

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if "target_date" in updates and updates["target_date"]:
        updates["target_date"] = updates["target_date"].isoformat()
    updates["updated_at"] = _now_iso()

    result = supabase.table("goals").update(updates).eq("id", goal_id).execute()

    log_audit("goal", goal_id, "manager_edit", current_user["id"],
              old_values=old_values, new_values=updates)

    return result.data[0]


# ── Shared Goals ──────────────────────────────────────────────────────────────

@router.get("/shared")
async def list_shared_goals(
    cycle_id: Optional[str] = None,
    current_user: dict = Depends(manager_or_above),
):
    query = supabase.table("shared_goal_groups").select("*")
    if cycle_id:
        query = query.eq("cycle_id", cycle_id)
    result = query.order("created_at", desc=True).execute()
    return result.data


@router.post("/shared", status_code=201)
async def create_shared_goal(
    body: SharedGoalCreate,
    current_user: dict = Depends(manager_or_above),
):
    group_result = supabase.table("shared_goal_groups").insert({
        "title": body.title,
        "description": body.description,
        "thrust_area_id": body.thrust_area_id,
        "uom_type": body.uom_type,
        "target_value": body.target_value,
        "target_date": body.target_date.isoformat() if body.target_date else None,
        "created_by": current_user["id"],
        "cycle_id": body.cycle_id,
    }).execute()
    group_id = group_result.data[0]["id"]

    pushed = 0
    skipped = []

    for emp_id in body.employee_ids:
        sheet = _get_or_create_sheet(emp_id, body.cycle_id)
        if sheet["status"] in ("draft", "returned"):
            supabase.table("goals").insert({
                "goal_sheet_id": sheet["id"],
                "shared_goal_group_id": group_id,
                "title": body.title,
                "description": body.description,
                "thrust_area_id": body.thrust_area_id,
                "uom_type": body.uom_type,
                "target_value": body.target_value,
                "target_date": body.target_date.isoformat() if body.target_date else None,
                "weightage": 10,
            }).execute()
            pushed += 1
        else:
            skipped.append(emp_id)

    log_audit("shared_goal_group", group_id, "push_shared", current_user["id"],
              new_values={"pushed": pushed, "skipped": len(skipped)})

    return {
        "group_id": group_id,
        "pushed": pushed,
        "skipped": len(skipped),
        "skipped_employee_ids": skipped,
        "message": f"Shared goal pushed to {pushed} employee(s). {len(skipped)} skipped (sheet already locked)."
    }
