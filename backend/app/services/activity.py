"""Log partner activity for the shared feed and notify partner devices."""
from sqlalchemy.orm import Session

from app.models.entities import ActivityEvent
from app.services.push_notify import notify_partner_devices


def build_activity_route(kind: str, entity_id: int | None, fallback: str = "/dashboard") -> str:
    """Deep link route for push / activity feed — opens the exact item in the PWA."""
    if not entity_id:
        return fallback
    routes = {
        "memory": f"/moments?memory={entity_id}",
        "album": f"/moments?album={entity_id}",
        "love_note": f"/forever?tab=notes&note={entity_id}",
        "capsule": f"/forever?capsule={entity_id}",
        "dream": f"/someday?dream={entity_id}",
        "trip_pin": f"/somewhere?pin={entity_id}",
        "ping": "/dashboard",
        "season": "/mood-board",
        "desire_jar": "/after-dark",
        "vault": "/after-dark",
        "note_reaction": "/forever?tab=notes",
        "check_in": "/after-dark?tab=checkin",
    }
    return routes.get(kind, fallback)


def log_activity(
    db: Session,
    *,
    couple_id: int,
    kind: str,
    title: str,
    author: str = "Us",
    entity_id: int | None = None,
    route: str = "/dashboard",
    notify: bool = True,
) -> ActivityEvent:
    deep_route = build_activity_route(kind, entity_id, route)
    row = ActivityEvent(
        couple_id=couple_id,
        kind=kind,
        title=title,
        author=author,
        entity_id=entity_id,
        route=deep_route,
    )
    db.add(row)
    db.flush()

    if notify:
        notify_partner_devices(
            db,
            couple_id,
            kind=kind,
            title=title,
            author=author,
            activity_id=row.id,
            route=deep_route,
        )

    return row
