from datetime import date, datetime, timezone, timedelta
from typing import Optional

from app.config import supabase


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_open_quarter(cycle: dict) -> Optional[str]:
    today = date.today()
    for q in ["Q1", "Q2", "Q3", "Q4"]:
        qs = cycle.get(f"{q.lower()}_start")
        qe = cycle.get(f"{q.lower()}_end")
        if qs and qe:
            if date.fromisoformat(str(qs)) <= today <= date.fromisoformat(str(qe)):
                return q
    return None


def _create_or_escalate(rule: dict, employee_id: str) -> str:
    existing = supabase.table("escalation_logs").select("*")\
        .eq("rule_id", rule["id"]).eq("employee_id", employee_id)\
        .eq("status", "open").maybe_single().execute()

    if not existing.data:
        supabase.table("escalation_logs").insert({
            "rule_id": rule["id"],
            "employee_id": employee_id,
            "current_level": 1,
            "status": "open",
        }).execute()
        return "new_escalations"

    esc = existing.data
    triggered = date.fromisoformat(str(esc["triggered_at"])[:10])
    days_since = (date.today() - triggered).days

    if esc["current_level"] == 1 and days_since >= rule["level_2_after_days"]:
        supabase.table("escalation_logs").update({
            "current_level": 2,
            "escalated_to_l2_at": _now_iso(),
        }).eq("id", esc["id"]).execute()
        return "level_ups"

    if esc["current_level"] == 2 and days_since >= rule["level_3_after_days"]:
        supabase.table("escalation_logs").update({
            "current_level": 3,
            "escalated_to_l3_at": _now_iso(),
        }).eq("id", esc["id"]).execute()
        return "level_ups"

    return "no_change"


def _auto_resolve(rule_id: str, employee_id: str) -> bool:
    existing = supabase.table("escalation_logs").select("id")\
        .eq("rule_id", rule_id).eq("employee_id", employee_id)\
        .eq("status", "open").maybe_single().execute()
    if existing.data:
        supabase.table("escalation_logs").update({
            "status": "resolved",
            "resolved_at": _now_iso(),
            "notes": "Auto-resolved — employee completed the required action",
        }).eq("id", existing.data["id"]).execute()
        return True
    return False


def run_escalation_check(cycle_id: str) -> dict:
    results = {"new_escalations": 0, "level_ups": 0, "auto_resolved": 0, "no_change": 0}

    rules_r = supabase.table("escalation_rules").select("*")\
        .eq("cycle_id", cycle_id).eq("is_active", True).execute()
    if not rules_r.data:
        return results

    cycle_r = supabase.table("cycles").select("*").eq("id", cycle_id).maybe_single().execute()
    if not cycle_r.data:
        return results
    cycle = cycle_r.data

    all_employees = supabase.table("profiles").select("id")\
        .eq("role", "employee").execute()
    all_employee_ids = [e["id"] for e in all_employees.data]

    sheets_r = supabase.table("goal_sheets").select("id, employee_id, status, submitted_at")\
        .eq("cycle_id", cycle_id).execute()
    sheets_by_emp = {s["employee_id"]: s for s in sheets_r.data}

    for rule in rules_r.data:
        today = date.today()

        if rule["condition_type"] == "goal_not_submitted":
            goal_start = date.fromisoformat(str(cycle["goal_setting_start"]))
            threshold_date = goal_start + timedelta(days=rule["threshold_days"])
            if today < threshold_date:
                continue

            for emp_id in all_employee_ids:
                sheet = sheets_by_emp.get(emp_id)
                if not sheet or sheet["status"] in ("draft",):
                    result = _create_or_escalate(rule, emp_id)
                    results[result] = results.get(result, 0) + 1
                else:
                    if _auto_resolve(rule["id"], emp_id):
                        results["auto_resolved"] += 1

        elif rule["condition_type"] == "goal_not_approved":
            threshold_delta = timedelta(days=rule["threshold_days"])
            for emp_id in all_employee_ids:
                sheet = sheets_by_emp.get(emp_id)
                if sheet and sheet["status"] == "submitted" and sheet.get("submitted_at"):
                    submitted_date = date.fromisoformat(str(sheet["submitted_at"])[:10])
                    if (today - submitted_date) >= threshold_delta:
                        result = _create_or_escalate(rule, emp_id)
                        results[result] = results.get(result, 0) + 1
                elif sheet and sheet["status"] in ("locked", "approved"):
                    if _auto_resolve(rule["id"], emp_id):
                        results["auto_resolved"] += 1

        elif rule["condition_type"] == "checkin_not_completed":
            current_quarter = _get_open_quarter(cycle)
            if not current_quarter:
                continue

            q_start_key = f"{current_quarter.lower()}_start"
            q_start = cycle.get(q_start_key)
            if not q_start:
                continue
            q_start_date = date.fromisoformat(str(q_start))
            if (today - q_start_date).days < rule["threshold_days"]:
                continue

            locked_sheets = [s for s in sheets_r.data if s["status"] in ("locked", "approved")]
            if not locked_sheets:
                continue

            locked_sheet_ids = [s["id"] for s in locked_sheets]
            checkins_r = supabase.table("checkins").select("goal_sheet_id")\
                .in_("goal_sheet_id", locked_sheet_ids).eq("quarter", current_quarter).execute()
            checked_sheet_ids = {c["goal_sheet_id"] for c in checkins_r.data}

            for sheet in locked_sheets:
                emp_id = sheet["employee_id"]
                if sheet["id"] not in checked_sheet_ids:
                    result = _create_or_escalate(rule, emp_id)
                    results[result] = results.get(result, 0) + 1
                else:
                    if _auto_resolve(rule["id"], emp_id):
                        results["auto_resolved"] += 1

    return results
