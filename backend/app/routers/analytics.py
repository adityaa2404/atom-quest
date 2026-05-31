from fastapi import APIRouter, Depends
from typing import Optional
from datetime import date

from app.config import supabase
from app.middleware.auth import manager_or_above
from app.utils import get_active_cycle

router = APIRouter()


def _get_active_cycle_id() -> str:
    return get_active_cycle(supabase)["id"]


# ── QoQ Achievement Trends ────────────────────────────────────────────────────

@router.get("/qoq-trends")
async def qoq_trends(
    cycle_id: Optional[str] = None,
    level: str = "org",            # org | dept | employee
    department: Optional[str] = None,
    employee_id: Optional[str] = None,
    current_user: dict = Depends(manager_or_above),
):
    if not cycle_id:
        cycle_id = _get_active_cycle_id()

    sheets_r = supabase.table("goal_sheets").select("id, employee_id")\
        .eq("cycle_id", cycle_id).in_("status", ["locked", "approved"]).execute()
    if not sheets_r.data:
        return []

    sheet_ids = [s["id"] for s in sheets_r.data]
    emp_to_sheet = {s["employee_id"]: s["id"] for s in sheets_r.data}

    profiles_r = supabase.table("profiles").select("id, department")\
        .in_("id", list(emp_to_sheet.keys())).execute()
    emp_dept = {p["id"]: p.get("department", "Unknown") for p in profiles_r.data}

    goals_r = supabase.table("goals").select("id, goal_sheet_id, weightage")\
        .in_("goal_sheet_id", sheet_ids).execute()
    goal_map = {g["id"]: g for g in goals_r.data}
    sheet_goals = {}
    for g in goals_r.data:
        sheet_goals.setdefault(g["goal_sheet_id"], []).append(g)

    goal_ids = list(goal_map.keys())
    if not goal_ids:
        return []

    ach_r = supabase.table("achievements").select("goal_id, quarter, computed_score")\
        .in_("goal_id", goal_ids).execute()

    def _compute_weighted(emp_id: str, qtr: str) -> Optional[float]:
        sheet_id = emp_to_sheet.get(emp_id)
        if not sheet_id:
            return None
        goals = sheet_goals.get(sheet_id, [])
        if not goals:
            return None
        scores = {a["goal_id"]: a["computed_score"] for a in ach_r.data
                  if a["quarter"] == qtr and a["goal_id"] in {g["id"] for g in goals}
                  and a["computed_score"] is not None}
        if not scores:
            return None
        total_w = sum(float(g["weightage"]) for g in goals if g["id"] in scores)
        if total_w == 0:
            return None
        return sum(float(g["weightage"]) * float(scores[g["id"]])
                   for g in goals if g["id"] in scores) / total_w

    emp_ids = list(emp_to_sheet.keys())
    if level == "employee" and employee_id:
        emp_ids = [e for e in emp_ids if e == employee_id]
    elif level == "dept" and department:
        emp_ids = [e for e in emp_ids if emp_dept.get(e) == department]

    if level in ("org", "employee"):
        result = []
        for q in ["Q1", "Q2", "Q3", "Q4"]:
            emp_scores = [s for e in emp_ids if (s := _compute_weighted(e, q)) is not None]
            result.append({
                "quarter": q,
                "avg_score": round(sum(emp_scores) / len(emp_scores), 1) if emp_scores else None,
                "count": len(emp_scores),
            })
        return result
    else:  # dept
        depts = list({emp_dept[e] for e in emp_ids})
        result = []
        for q in ["Q1", "Q2", "Q3", "Q4"]:
            for dept in depts:
                dept_emps = [e for e in emp_ids if emp_dept.get(e) == dept]
                scores = [s for e in dept_emps if (s := _compute_weighted(e, q)) is not None]
                result.append({
                    "quarter": q,
                    "department": dept,
                    "avg_score": round(sum(scores) / len(scores), 1) if scores else None,
                    "count": len(scores),
                })
        return result


# ── Goal Distribution ─────────────────────────────────────────────────────────

@router.get("/goal-distribution")
async def goal_distribution(
    cycle_id: Optional[str] = None,
    current_user: dict = Depends(manager_or_above),
):
    if not cycle_id:
        cycle_id = _get_active_cycle_id()

    sheets_r = supabase.table("goal_sheets").select("id").eq("cycle_id", cycle_id).execute()
    if not sheets_r.data:
        return {"by_thrust_area": [], "by_uom_type": [], "by_status_per_quarter": []}

    sheet_ids = [s["id"] for s in sheets_r.data]
    goals_r = supabase.table("goals").select("id, thrust_area_id, uom_type")\
        .in_("goal_sheet_id", sheet_ids).execute()

    thrust_areas_r = supabase.table("thrust_areas").select("id, name").execute()
    ta_names = {t["id"]: t["name"] for t in thrust_areas_r.data}

    # By thrust area
    ta_counts = {}
    for g in goals_r.data:
        ta = ta_names.get(g.get("thrust_area_id"), "Unassigned")
        ta_counts[ta] = ta_counts.get(ta, 0) + 1
    by_thrust = [{"name": k, "count": v} for k, v in sorted(ta_counts.items(), key=lambda x: -x[1])]

    # By UoM type
    uom_counts = {}
    for g in goals_r.data:
        uom = g["uom_type"]
        uom_counts[uom] = uom_counts.get(uom, 0) + 1
    by_uom = [{"name": k, "count": v} for k, v in sorted(uom_counts.items(), key=lambda x: -x[1])]

    # Status per quarter
    goal_ids = [g["id"] for g in goals_r.data]
    ach_r = supabase.table("achievements").select("quarter, status")\
        .in_("goal_id", goal_ids).execute() if goal_ids else type("R", (), {"data": []})()

    by_status_q = []
    for q in ["Q1", "Q2", "Q3", "Q4"]:
        q_data = [a for a in ach_r.data if a["quarter"] == q]
        by_status_q.append({
            "quarter": q,
            "not_started": sum(1 for a in q_data if a["status"] == "not_started"),
            "on_track": sum(1 for a in q_data if a["status"] == "on_track"),
            "completed": sum(1 for a in q_data if a["status"] == "completed"),
        })

    return {
        "by_thrust_area": by_thrust,
        "by_uom_type": by_uom,
        "by_status_per_quarter": by_status_q,
    }


# ── Manager Effectiveness ─────────────────────────────────────────────────────

@router.get("/manager-effectiveness")
async def manager_effectiveness(
    cycle_id: Optional[str] = None,
    current_user: dict = Depends(manager_or_above),
):
    if not cycle_id:
        cycle_id = _get_active_cycle_id()

    managers_r = supabase.table("profiles").select("id, full_name").eq("role", "manager").execute()
    if not managers_r.data:
        return []

    # Batch-fetch all employees, sheets, goals, achievements, and checkins up front
    all_employees_r = supabase.table("profiles").select("id, manager_id").eq("role", "employee").execute()
    emp_to_mgr = {e["id"]: e["manager_id"] for e in all_employees_r.data}

    # Build manager → [employee_ids] map
    mgr_team: dict = {}
    for emp_id, mgr_id in emp_to_mgr.items():
        if mgr_id:
            mgr_team.setdefault(mgr_id, []).append(emp_id)

    all_emp_ids = list(emp_to_mgr.keys())
    sheets_r = supabase.table("goal_sheets").select("id, employee_id, status")\
        .eq("cycle_id", cycle_id).in_("employee_id", all_emp_ids).execute()
    # sheet indexed by employee_id
    emp_sheet_map = {s["employee_id"]: s for s in sheets_r.data}

    all_locked_sheets = [s for s in sheets_r.data if s["status"] in ("locked", "approved")]
    all_locked_sheet_ids = [s["id"] for s in all_locked_sheets]
    locked_sheet_emp = {s["id"]: s["employee_id"] for s in all_locked_sheets}

    # Fetch all checkins for locked sheets at once
    checkins_by_sheet_q: dict = {}  # {(sheet_id, quarter): True}
    if all_locked_sheet_ids:
        checkins_r = supabase.table("checkins").select("goal_sheet_id, quarter")\
            .in_("goal_sheet_id", all_locked_sheet_ids).execute()
        for c in checkins_r.data:
            checkins_by_sheet_q[(c["goal_sheet_id"], c["quarter"])] = True

    # Fetch all goals and achievements for locked sheets at once
    goals_by_sheet: dict = {}
    ach_by_goal: dict = {}
    if all_locked_sheet_ids:
        all_goals_r = supabase.table("goals").select("id, goal_sheet_id, weightage")\
            .in_("goal_sheet_id", all_locked_sheet_ids).execute()
        for g in all_goals_r.data:
            goals_by_sheet.setdefault(g["goal_sheet_id"], []).append(g)
        all_goal_ids = [g["id"] for g in all_goals_r.data]
        if all_goal_ids:
            ach_r = supabase.table("achievements").select("goal_id, computed_score")\
                .in_("goal_id", all_goal_ids).execute()
            ach_by_goal = {a["goal_id"]: a["computed_score"] for a in ach_r.data
                           if a["computed_score"] is not None}

    result = []
    for mgr in managers_r.data:
        team_ids = mgr_team.get(mgr["id"], [])
        team_size = len(team_ids)
        if team_size == 0:
            continue

        team_sheets = [emp_sheet_map[e] for e in team_ids if e in emp_sheet_map]
        approved = sum(1 for s in team_sheets if s["status"] in ("locked", "approved"))
        mgr_locked = [s for s in team_sheets if s["status"] in ("locked", "approved")]
        mgr_locked_ids = [s["id"] for s in mgr_locked]

        checkin_pcts = {}
        for q in ["Q1", "Q2", "Q3", "Q4"]:
            if mgr_locked_ids:
                done = sum(1 for sid in mgr_locked_ids if (sid, q) in checkins_by_sheet_q)
                checkin_pcts[q] = round(done / len(mgr_locked_ids) * 100, 1)
            else:
                checkin_pcts[q] = 0.0

        avg_score = None
        scored = []
        for sid in mgr_locked_ids:
            for g in goals_by_sheet.get(sid, []):
                score = ach_by_goal.get(g["id"])
                if score is not None:
                    scored.append((float(g["weightage"]), float(score)))
        if scored:
            total_w = sum(w for w, _ in scored)
            avg_score = round(sum(w * s for w, s in scored) / total_w, 1) if total_w > 0 else None

        result.append({
            "manager_id": mgr["id"],
            "manager_name": mgr["full_name"],
            "team_size": team_size,
            "goals_approved_pct": round(approved / team_size * 100, 1),
            "q1_checkin_pct": checkin_pcts["Q1"],
            "q2_checkin_pct": checkin_pcts["Q2"],
            "q3_checkin_pct": checkin_pcts["Q3"],
            "q4_checkin_pct": checkin_pcts["Q4"],
            "avg_team_score": avg_score,
        })

    return sorted(result, key=lambda x: x["manager_name"])


# ── Completion Heatmap ────────────────────────────────────────────────────────

@router.get("/completion-heatmap")
async def completion_heatmap(
    cycle_id: Optional[str] = None,
    current_user: dict = Depends(manager_or_above),
):
    if not cycle_id:
        cycle_id = _get_active_cycle_id()

    cycle_r = supabase.table("cycles").select("*").eq("id", cycle_id).maybe_single().execute()
    cycle = cycle_r.data if cycle_r.data else {}

    today = date.today()
    open_quarters = set()
    for q in ["Q1", "Q2", "Q3", "Q4"]:
        qs = cycle.get(f"{q.lower()}_start")
        qe = cycle.get(f"{q.lower()}_end")
        if qs and qe and date.fromisoformat(str(qs)) <= today:
            open_quarters.add(q)

    employees_r = supabase.table("profiles").select("id, department").eq("role", "employee").execute()
    depts = list({e.get("department") or "Unassigned" for e in employees_r.data})
    dept_emp_map = {}
    for e in employees_r.data:
        d = e.get("department") or "Unassigned"
        dept_emp_map.setdefault(d, []).append(e["id"])

    sheets_r = supabase.table("goal_sheets").select("id, employee_id")\
        .eq("cycle_id", cycle_id).in_("status", ["locked", "approved"]).execute()
    sheet_map = {s["employee_id"]: s["id"] for s in sheets_r.data}

    checkins_r = supabase.table("checkins").select("goal_sheet_id, quarter")\
        .in_("goal_sheet_id", list(sheet_map.values())).execute() if sheet_map else type("R", (), {"data": []})()
    checked = set((c["goal_sheet_id"], c["quarter"]) for c in checkins_r.data)

    result = []
    for dept in sorted(depts):
        emp_ids = dept_emp_map.get(dept, [])
        row = {"department": dept}
        for q in ["Q1", "Q2", "Q3", "Q4"]:
            if q not in open_quarters:
                row[q] = {"rate": None, "is_open": False}
                continue
            locked_emps = [e for e in emp_ids if e in sheet_map]
            if not locked_emps:
                row[q] = {"rate": 0.0, "is_open": True}
                continue
            done = sum(1 for e in locked_emps if (sheet_map[e], q) in checked)
            row[q] = {"rate": round(done / len(locked_emps) * 100, 1), "is_open": True}
        result.append(row)

    return {"quarters": ["Q1", "Q2", "Q3", "Q4"], "rows": result}
