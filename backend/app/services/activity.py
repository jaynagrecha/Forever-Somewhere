"""Log partner activity for the shared feed and notify partner devices."""
from sqlalchemy.orm import Session

from app.models.entities import ActivityEvent
from app.services.push_notify import notify_partner_devices


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
    row = ActivityEvent(
        couple_id=couple_id,
        kind=kind,
        title=title,
        author=author,
        entity_id=entity_id,
        route=route,
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
            route=route,
        )

    return row
