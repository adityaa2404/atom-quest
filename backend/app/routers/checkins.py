from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime, timezone, date
from typing import Optional

from app.config import supabase
from app.middleware.auth import get_current_user, manager_or_above
from app.models.checkin import AchievementSave, CheckinSubmit
from app.services.score_engine import compute_score

router = APIRouter()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_active_cycle() -> dict:
    result = supabase.table("cycles").select("*").eq("is_active", True).maybe_single().execute()
    if not result.data:
        raise HTTPException(400, "No active cycle found")
    return result.data


def _get_open_quarter(cycle: dict) -> Optional[str]:
    today = date.today()
    quarters = [
        ("Q1", cycle.get("q1_start"), cycle.get("q1_end")),
        ("Q2", cycle.get("q2_start"), cycle.get("q2_end")),
        ("Q3", cycle.get("q3_start"), cycle.get("q3_end")),
        ("Q4", cycle.get("q4_start"), cycle.get("q4_end")),
    ]
    for q_name, q_start, q_end in quarters:
        if q_start and q_end:
            if date.fromisoformat(str(q_start)) <= today <= date.fromisoformat(str(q_end)):
                return q_name
    return None


def _is_quarter_open(cycle: dict, quarter: str) -> bool:
    today = date.today()
    start_key = f"{quarter.lower()}_start"
    end_key = f"{quarter.lower()}_end"
    q_start = cycle.get(start_key)
    q_end = cycle.get(end_key)
    if not q_start or not q_end:
        return False
    return date.fromisoformat(str(q_start)) <= today <= date.fromisoformat(str(q_end))


# ── Active Quarter ────────────────────────────────────────────────────────────

@router.get("/active-quarter")
async def get_active_quarter(current_user: dict = Depends(get_current_user)):
    cycle = _get_active_cycle()
    quarter = _get_open_quarter(cycle)
    return {
        "quarter": quarter,
        "cycle_id": cycle["id"],
        "cycle_name": cycle["name"],
        "cycle": cycle,
    }


# ── Employee: Achievement Entry ───────────────────────────────────────────────

@router.get("/my-goals")
async def get_my_goals_for_quarter(
    quarter: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    cycle = _get_active_cycle()
    if not quarter:
        quarter = _get_open_quarter(cycle)

    sheet = supabase.table("goal_sheets").select("*")\
        .eq("employee_id", current_user["id"]).eq("cycle_id", cycle["id"])\
        .maybe_single().execute()

    if not sheet.data or sheet.data["status"] not in ("locked", "approved"):
        return {"quarter": quarter, "goals": [], "message": "No approved goal sheet found"}

    goals = supabase.table("goals").select("*")\
        .eq("goal_sheet_id", sheet.data["id"]).order("sort_order").execute()

    if not goals.data:
        return {"quarter": quarter, "goals": [], "sheet_id": sheet.data["id"]}

    goal_ids = [g["id"] for g in goals.data]
    achievements = {}
    if quarter:
        ach_result = supabase.table("achievements").select("*")\
            .in_("goal_id", goal_ids).eq("quarter", quarter).execute()
        achievements = {a["goal_id"]: a for a in ach_result.data}

    goals_with_ach = []
    for g in goals.data:
        goals_with_ach.append({
            **g,
            "achievement": achievements.get(g["id"]),
        })

    is_open = _is_quarter_open(cycle, quarter) if quarter else False

    return {
        "quarter": quarter,
        "is_quarter_open": is_open,
        "sheet_id": sheet.data["id"],
        "goals": goals_with_ach,
        "cycle": cycle,
    }


@router.post("/achievement")
async def save_achievement(
    body: AchievementSave,
    current_user: dict = Depends(get_current_user),
):
    goal = supabase.table("goals").select("*, goal_sheets(*)")\
        .eq("id", body.goal_id).maybe_single().execute()
    if not goal.data:
        raise HTTPException(404, "Goal not found")

    sheet = goal.data.get("goal_sheets") or {}
    if sheet.get("employee_id") != current_user["id"]:
        raise HTTPException(403, "This goal does not belong to you")
    if sheet.get("status") not in ("locked", "approved"):
        raise HTTPException(400, "Goal sheet must be approved before logging achievements")

    cycle = _get_active_cycle()
    if not _is_quarter_open(cycle, body.quarter):
        raise HTTPException(400, f"{body.quarter} check-in window is not currently open")

    score = compute_score(
        uom_type=goal.data["uom_type"],
        target_value=goal.data.get("target_value"),
        actual_value=body.actual_value,
        target_date=date.fromisoformat(str(goal.data["target_date"])) if goal.data.get("target_date") else None,
        actual_date=body.actual_date,
    )

    supabase.table("achievements").upsert({
        "goal_id": body.goal_id,
        "quarter": body.quarter,
        "actual_value": body.actual_value,
        "actual_date": body.actual_date.isoformat() if body.actual_date else None,
        "status": body.status,
        "computed_score": score,
        "employee_comment": body.comment,
        "updated_at": _now_iso(),
    }, on_conflict="goal_id,quarter").execute()

    return {"message": "Achievement saved", "computed_score": score}


# ── Manager: Team Check-ins ───────────────────────────────────────────────────

@router.get("/team")
async def get_team_checkin_status(
    quarter: Optional[str] = None,
    cycle_id: Optional[str] = None,
    current_user: dict = Depends(manager_or_above),
):
    if not cycle_id:
        cycle = _get_active_cycle()
        cycle_id = cycle["id"]
    if not quarter:
        cycle = supabase.table("cycles").select("*").eq("id", cycle_id).maybe_single().execute()
        quarter = _get_open_quarter(cycle.data) if cycle.data else None

    team = supabase.table("profiles").select("id, full_name, email, department")\
        .eq("manager_id", current_user["id"]).execute()
    if not team.data:
        return []

    employee_ids = [e["id"] for e in team.data]
    sheets = supabase.table("goal_sheets").select("id, employee_id, status")\
        .eq("cycle_id", cycle_id).in_("employee_id", employee_ids).execute()
    sheets_map = {s["employee_id"]: s for s in sheets.data}

    checkins_map = {}
    if quarter and sheets.data:
        sheet_ids = [s["id"] for s in sheets.data]
        checkins = supabase.table("checkins").select("*")\
            .in_("goal_sheet_id", sheet_ids).eq("quarter", quarter).execute()
        checkins_map = {c["goal_sheet_id"]: c for c in checkins.data}

    result = []
    for emp in team.data:
        sheet = sheets_map.get(emp["id"])
        checkin = checkins_map.get(sheet["id"]) if sheet else None

        weighted_score = None
        has_achievements = False
        if sheet and quarter:
            goals_r = supabase.table("goals").select("id, weightage")\
                .eq("goal_sheet_id", sheet["id"]).execute()
            if goals_r.data:
                goal_ids = [g["id"] for g in goals_r.data]
                ach_r = supabase.table("achievements").select("goal_id, computed_score")\
                    .in_("goal_id", goal_ids).eq("quarter", quarter).execute()
                if ach_r.data:
                    has_achievements = True
                    ach_map = {a["goal_id"]: a["computed_score"] for a in ach_r.data}
                    total_w = sum(float(g["weightage"]) for g in goals_r.data)
                    if total_w > 0:
                        weighted_score = sum(
                            float(g["weightage"]) * float(ach_map.get(g["id"]) or 0)
                            for g in goals_r.data
                        ) / total_w

        result.append({
            **emp,
            "sheet_status": sheet["status"] if sheet else "not_started",
            "sheet_id": sheet["id"] if sheet else None,
            "checkin_done": checkin is not None,
            "checkin": checkin,
            "has_achievements": has_achievements,
            "weighted_score": weighted_score,
        })
    return result


@router.get("/team/{employee_id}")
async def get_employee_checkin_detail(
    employee_id: str,
    quarter: Optional[str] = None,
    current_user: dict = Depends(manager_or_above),
):
    employee = supabase.table("profiles").select("*")\
        .eq("id", employee_id).maybe_single().execute()
    if not employee.data:
        raise HTTPException(404, "Employee not found")
    if (current_user["role"] == "manager"
            and employee.data.get("manager_id") != current_user["id"]):
        raise HTTPException(403, "This employee does not report to you")

    cycle = _get_active_cycle()
    if not quarter:
        quarter = _get_open_quarter(cycle)

    sheet = supabase.table("goal_sheets").select("*")\
        .eq("employee_id", employee_id).eq("cycle_id", cycle["id"])\
        .maybe_single().execute()
    if not sheet.data:
        return {"employee": employee.data, "quarter": quarter, "goals": [], "checkin": None}

    goals_r = supabase.table("goals").select("*")\
        .eq("goal_sheet_id", sheet.data["id"]).order("sort_order").execute()

    achievements = {}
    if quarter and goals_r.data:
        goal_ids = [g["id"] for g in goals_r.data]
        ach_r = supabase.table("achievements").select("*")\
            .in_("goal_id", goal_ids).eq("quarter", quarter).execute()
        achievements = {a["goal_id"]: a for a in ach_r.data}

    checkin = supabase.table("checkins").select("*")\
        .eq("goal_sheet_id", sheet.data["id"]).eq("quarter", quarter)\
        .maybe_single().execute() if quarter else None

    goals_with_ach = [{**g, "achievement": achievements.get(g["id"])} for g in goals_r.data]

    total_w = sum(float(g["weightage"]) for g in goals_r.data)
    weighted_score = None
    if total_w > 0 and achievements:
        weighted_score = sum(
            float(g["weightage"]) * float(achievements.get(g["id"], {}).get("computed_score") or 0)
            for g in goals_r.data
        ) / total_w

    return {
        "employee": employee.data,
        "sheet": sheet.data,
        "quarter": quarter,
        "goals": goals_with_ach,
        "checkin": checkin.data if checkin else None,
        "weighted_score": weighted_score,
    }


@router.post("/submit")
async def submit_checkin(
    body: CheckinSubmit,
    current_user: dict = Depends(manager_or_above),
):
    sheet = supabase.table("goal_sheets").select("*")\
        .eq("id", body.goal_sheet_id).maybe_single().execute()
    if not sheet.data:
        raise HTTPException(404, "Goal sheet not found")

    employee = supabase.table("profiles").select("manager_id")\
        .eq("id", sheet.data["employee_id"]).maybe_single().execute()
    if (current_user["role"] == "manager"
            and employee.data.get("manager_id") != current_user["id"]):
        raise HTTPException(403, "This employee does not report to you")

    existing = supabase.table("checkins").select("id")\
        .eq("goal_sheet_id", body.goal_sheet_id).eq("quarter", body.quarter)\
        .maybe_single().execute()
    if existing.data:
        raise HTTPException(409, f"Check-in for {body.quarter} already exists for this employee")

    result = supabase.table("checkins").insert({
        "goal_sheet_id": body.goal_sheet_id,
        "quarter": body.quarter,
        "manager_id": current_user["id"],
        "comment": body.comment,
    }).execute()

    return {"message": "Check-in submitted successfully", "checkin": result.data[0]}
