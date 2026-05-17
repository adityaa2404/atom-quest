from fastapi import APIRouter, Depends, HTTPException
from typing import Optional

from app.config import supabase
from app.middleware.auth import admin_only
from app.models.admin import (
    EscalationRuleCreate, EscalationRuleUpdate, ResolveEscalationRequest,
)
from app.services.escalation_service import run_escalation_check

router = APIRouter()


# ── Rules ─────────────────────────────────────────────────────────────────────

@router.get("/rules")
async def list_rules(
    cycle_id: Optional[str] = None,
    current_user: dict = Depends(admin_only),
):
    query = supabase.table("escalation_rules").select("*")
    if cycle_id:
        query = query.eq("cycle_id", cycle_id)
    result = query.order("created_at").execute()
    return result.data


@router.post("/rules", status_code=201)
async def create_rule(
    body: EscalationRuleCreate,
    current_user: dict = Depends(admin_only),
):
    result = supabase.table("escalation_rules").insert(body.model_dump()).execute()
    return result.data[0]


@router.put("/rules/{rule_id}")
async def update_rule(
    rule_id: str,
    body: EscalationRuleUpdate,
    current_user: dict = Depends(admin_only),
):
    existing = supabase.table("escalation_rules").select("id")\
        .eq("id", rule_id).maybe_single().execute()
    if not existing.data:
        raise HTTPException(404, "Escalation rule not found")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    result = supabase.table("escalation_rules").update(updates).eq("id", rule_id).execute()
    return result.data[0]


# ── Run Check ─────────────────────────────────────────────────────────────────

@router.post("/run-check")
async def run_check(
    cycle_id: Optional[str] = None,
    current_user: dict = Depends(admin_only),
):
    if not cycle_id:
        cycle_r = supabase.table("cycles").select("id").eq("is_active", True).maybe_single().execute()
        if not cycle_r.data:
            raise HTTPException(400, "No active cycle found")
        cycle_id = cycle_r.data["id"]

    import asyncio
    loop = asyncio.get_event_loop()
    results = await loop.run_in_executor(None, run_escalation_check, cycle_id)

    return {
        "message": f"Escalation check completed. {results['new_escalations']} new, {results['level_ups']} level-ups, {results['auto_resolved']} auto-resolved.",
        **results,
    }


# ── Logs ─────────────────────────────────────────────────────────────────────

@router.get("/logs")
async def list_logs(
    status: Optional[str] = None,
    level: Optional[int] = None,
    rule_id: Optional[str] = None,
    current_user: dict = Depends(admin_only),
):
    query = supabase.table("escalation_logs").select(
        "*, profiles!escalation_logs_employee_id_fkey(full_name, email, department), escalation_rules(name, condition_type)"
    )
    if status:
        query = query.eq("status", status)
    if level:
        query = query.eq("current_level", level)
    if rule_id:
        query = query.eq("rule_id", rule_id)

    result = query.order("triggered_at", desc=True).execute()
    return result.data


@router.put("/logs/{log_id}/resolve")
async def resolve_log(
    log_id: str,
    body: ResolveEscalationRequest,
    current_user: dict = Depends(admin_only),
):
    from datetime import datetime, timezone
    existing = supabase.table("escalation_logs").select("id, status")\
        .eq("id", log_id).maybe_single().execute()
    if not existing.data:
        raise HTTPException(404, "Escalation log not found")
    if existing.data["status"] != "open":
        raise HTTPException(400, "Only open escalations can be resolved")

    result = supabase.table("escalation_logs").update({
        "status": "resolved",
        "resolved_at": datetime.now(timezone.utc).isoformat(),
        "resolved_by": current_user["id"],
        "notes": body.notes,
    }).eq("id", log_id).execute()
    return result.data[0]


@router.put("/logs/{log_id}/dismiss")
async def dismiss_log(
    log_id: str,
    current_user: dict = Depends(admin_only),
):
    existing = supabase.table("escalation_logs").select("id, status")\
        .eq("id", log_id).maybe_single().execute()
    if not existing.data:
        raise HTTPException(404, "Escalation log not found")
    if existing.data["status"] != "open":
        raise HTTPException(400, "Only open escalations can be dismissed")

    result = supabase.table("escalation_logs").update({
        "status": "dismissed",
        "resolved_by": current_user["id"],
    }).eq("id", log_id).execute()
    return result.data[0]


# ── Summary ───────────────────────────────────────────────────────────────────

@router.get("/summary")
async def get_summary(current_user: dict = Depends(admin_only)):
    from datetime import datetime, timezone, timedelta
    all_logs = supabase.table("escalation_logs").select("status, current_level, resolved_at").execute()

    open_logs = [l for l in all_logs.data if l["status"] == "open"]
    level3_logs = [l for l in open_logs if l["current_level"] == 3]

    one_week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    resolved_this_week = [
        l for l in all_logs.data
        if l["status"] == "resolved" and l.get("resolved_at") and l["resolved_at"] >= one_week_ago
    ]

    return {
        "open": len(open_logs),
        "level_3_critical": len(level3_logs),
        "resolved_this_week": len(resolved_this_week),
    }
