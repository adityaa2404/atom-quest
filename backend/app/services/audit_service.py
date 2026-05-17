from typing import Optional
from app.config import supabase


def log_audit(
    entity_type: str,
    entity_id: str,
    action: str,
    changed_by: str,
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
    reason: Optional[str] = None,
) -> None:
    """
    Write an audit log entry. Call before committing any tracked change.
    entity_type: 'goal' | 'goal_sheet' | 'achievement' | 'cycle' | 'escalation'
    action: 'create' | 'edit' | 'approve' | 'return' | 'unlock' | 'delete' | 'push_shared'
    """
    supabase.table("audit_logs").insert({
        "entity_type": entity_type,
        "entity_id": entity_id,
        "action": action,
        "changed_by": changed_by,
        "old_values": old_values,
        "new_values": new_values,
        "reason": reason,
    }).execute()
