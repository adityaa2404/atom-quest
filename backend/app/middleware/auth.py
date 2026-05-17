import httpx
from fastapi import Depends, HTTPException, Request
from app.config import settings, supabase


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    token = auth.split(" ", 1)[1]

    # Verify token via Supabase REST API (works with ES256 and HS256)
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{settings.SUPABASE_URL}/auth/v1/user",
            headers={
                "Authorization": f"Bearer {token}",
                "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            },
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user_id = resp.json().get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing user id")

    profile = supabase.table("profiles").select("*").eq("id", user_id).maybe_single().execute()
    if not profile.data:
        raise HTTPException(status_code=403, detail="Profile not found")
    return profile.data


def require_role(*roles: str):
    async def _dep(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return _dep


employee_or_above = require_role("employee", "manager", "admin")
manager_or_above  = require_role("manager", "admin")
admin_only        = require_role("admin")
