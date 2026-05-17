from datetime import date
from typing import Optional


def compute_score(
    uom_type: str,
    target_value: Optional[float] = None,
    actual_value: Optional[float] = None,
    target_date: Optional[date] = None,
    actual_date: Optional[date] = None,
) -> float:
    """
    Compute achievement score as a percentage (0-100).
    Always called server-side; result stored in achievements.computed_score.
    """
    if uom_type in ("min_numeric", "min_percent"):
        # Higher actual is better (e.g. sales revenue, completion %)
        if not target_value or float(target_value) == 0:
            return 0.0
        if actual_value is None:
            return 0.0
        score = (float(actual_value) / float(target_value)) * 100
        return min(score, 100.0)

    elif uom_type in ("max_numeric", "max_percent"):
        # Lower actual is better (e.g. cost, defects, TAT)
        if actual_value is None:
            return 0.0
        if float(actual_value) == 0:
            return 100.0  # Zero cost/defects = perfect
        if not target_value:
            return 0.0
        score = (float(target_value) / float(actual_value)) * 100
        return min(score, 100.0)

    elif uom_type == "timeline":
        # Completed on or before target date = 100%, late = 0%
        if not target_date or not actual_date:
            return 0.0
        return 100.0 if actual_date <= target_date else 0.0

    elif uom_type == "zero":
        # Zero-based: actual == 0 means success (safety incidents, defects)
        if actual_value is None:
            return 0.0
        return 100.0 if float(actual_value) == 0.0 else 0.0

    return 0.0


def compute_weighted_score(goals_with_scores: list[dict]) -> float:
    """
    Compute overall goal sheet score as weighted average.
    Each dict must have 'weightage' (int) and 'computed_score' (float | None).
    Goals with None score are excluded from denominator.
    Returns percentage 0-100.
    """
    total_weight = 0.0
    weighted_sum = 0.0
    for g in goals_with_scores:
        score = g.get("computed_score")
        if score is not None:
            w = float(g.get("weightage", 0))
            weighted_sum += w * score
            total_weight += w
    if total_weight == 0:
        return 0.0
    return weighted_sum / total_weight
