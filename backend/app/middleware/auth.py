import asyncio
import time
import jwt
from fastapi import Depends, HTTPException, Request
from app.config import settings, supabase

# Simple in-process profile cache: { user_id: (profile_dict, expiry_ts) }
_profile_cache: dict = {}
_CACHE_TTL = 300  # 5 minutes


def _fetch_profile_sync(user_id: str) -> dict | None:
    """Blocking DB fetch — always run via run_in_executor to avoid blocking the event loop."""
    result = supabase.table("profiles").select("*").eq("id", user_id).maybe_single().execute()
    return result.data


async def _get_profile(user_id: str) -> dict:
    now = time.time()
    cached = _profile_cache.get(user_id)
    if cached and cached[1] > now:
        return cached[0]

    loop = asyncio.get_event_loop()
    data = await loop.run_in_executor(None, _fetch_profile_sync, user_id)
    if not data:
        raise HTTPException(status_code=403, detail="Profile not found")

    _profile_cache[user_id] = (data, now + _CACHE_TTL)
    return data


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    token = auth.split(" ", 1)[1]

    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256", "ES256"],
            options={"verify_aud": False},
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing user id")

    return await _get_profile(user_id)


def require_role(*roles: str):
    async def _dep(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return _dep


employee_or_above = require_role("employee", "manager", "admin")
manager_or_above  = require_role("manager", "admin")
admin_only        = require_role("admin")
