"""Log partner activity for the shared feed."""
from sqlalchemy.orm import Session

from app.models.entities import ActivityEvent


def log_activity(
    db: Session,
    *,
    couple_id: int,
    kind: str,
    title: str,
    author: str = "Us",
    entity_id: int | None = None,
    route: str = "/dashboard",
) -> None:
    db.add(
        ActivityEvent(
            couple_id=couple_id,
            kind=kind,
            title=title,
            author=author,
            entity_id=entity_id,
            route=route,
        )
    )
