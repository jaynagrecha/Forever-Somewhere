from datetime import date, datetime, timezone


def utc_iso(dt: datetime | None) -> str:
    """Serialize naive UTC datetimes from SQLite with a Z suffix for correct client parsing."""
    if dt is None:
        return ""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def days_until(target: date, recurring: bool = False) -> int:
    today = date.today()
    if recurring:
        candidate = target.replace(year=today.year)
        if candidate < today:
            candidate = candidate.replace(year=today.year + 1)
        return (candidate - today).days
    return (target - today).days
