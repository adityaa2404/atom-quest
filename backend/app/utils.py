import time
from datetime import datetime, timezone, date
from typing import Optional

from fastapi import HTTPException


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Active cycle cache ────────────────────────────────────────────────────────
# Short TTL so activating a cycle is reflected quickly, but repeated calls
# within the same burst of requests share the result.
_cycle_cache: dict = {}   # {"active": (cycle_dict, expiry_ts)}
_CYCLE_TTL = 60           # 1 minute


def get_active_cycle(supabase) -> dict:
    now = time.time()
    cached = _cycle_cache.get("active")
    if cached and cached[1] > now:
        return cached[0]

    result = supabase.table("cycles").select("*").eq("is_active", True).maybe_single().execute()
    if not result.data:
        raise HTTPException(400, "No active cycle found")

    _cycle_cache["active"] = (result.data, now + _CYCLE_TTL)
    return result.data


def invalidate_cycle_cache() -> None:
    _cycle_cache.clear()


def get_open_quarter(cycle: dict) -> Optional[str]:
    today = date.today()
    for q in ["Q1", "Q2", "Q3", "Q4"]:
        qs = cycle.get(f"{q.lower()}_start")
        qe = cycle.get(f"{q.lower()}_end")
        if qs and qe:
            if date.fromisoformat(str(qs)) <= today <= date.fromisoformat(str(qe)):
                return q
    return None


def is_quarter_open(cycle: dict, quarter: str) -> bool:
    today = date.today()
    qs = cycle.get(f"{quarter.lower()}_start")
    qe = cycle.get(f"{quarter.lower()}_end")
    if not qs or not qe:
        return False
    return date.fromisoformat(str(qs)) <= today <= date.fromisoformat(str(qe))
