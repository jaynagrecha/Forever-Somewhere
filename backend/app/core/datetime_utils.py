from datetime import datetime, timezone


def utc_iso(dt: datetime | None) -> str:
    """Serialize naive UTC datetimes from SQLite with a Z suffix for correct client parsing."""
    if dt is None:
        return ""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc).isoformat().replace("+00:00", "Z")
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
