"""Web Push delivery to partner devices (lock-screen when app is closed)."""
import json
import logging

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.entities import PushSubscription

logger = logging.getLogger(__name__)

_PUSH_COPY: dict[str, tuple[str, str]] = {
    "ping": ("Thinking of you 💕", "{title}"),
    "memory": ("New memory 📸", "{author} added “{title}”"),
    "love_note": ("Love note 💌", "{author} wrote you a note"),
    "capsule": ("Time capsule 🔒", "{author} sealed “{title}”"),
    "dream": ("New dream ✨", "{author} added “{title}”"),
    "trip_pin": ("New map pin 📍", "{author} pinned “{title}”"),
    "album": ("Trip album 📁", "{author} created “{title}”"),
}


def _format_push(kind: str, title: str, author: str) -> tuple[str, str]:
    template = _PUSH_COPY.get(kind, ("Partner activity", "{author} — {title}"))
    head, body_tpl = template
    body = body_tpl.format(title=title, author=author or "Your partner")
    if kind == "ping":
        body = title
    return head, body


def send_web_push(sub: PushSubscription, payload: dict) -> str:
    """Returns 'ok', 'stale' (subscription expired), or 'error'."""
    if not settings.vapid_private_key or not settings.vapid_public_key:
        logger.warning("Web Push skipped: VAPID keys not configured")
        return "error"
    try:
        from pywebpush import WebPushException, webpush

        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            data=json.dumps(payload),
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": settings.vapid_claims_email},
            ttl=86400,
        )
        return "ok"
    except WebPushException as exc:
        status = getattr(exc.response, "status_code", None)
        if status in (404, 410):
            logger.info("Removing stale push subscription %s (HTTP %s)", sub.id, status)
            return "stale"
        logger.warning("Web Push failed for subscription %s: %s", sub.id, exc)
        return "error"
    except Exception as exc:
        logger.warning("Web Push failed for subscription %s: %s", sub.id, exc)
        return "error"


def notify_partner_devices(
    db: Session,
    couple_id: int,
    *,
    kind: str,
    title: str,
    author: str,
    activity_id: int,
    route: str = "/dashboard",
) -> int:
    """Push to partner device(s). Skips subscriptions tagged with the same owner as author."""
    push_title, push_body = _format_push(kind, title, author)
    payload = {
        "title": push_title,
        "body": push_body,
        "tag": f"activity-{activity_id}",
        "route": route,
    }

    subs = db.query(PushSubscription).filter(PushSubscription.couple_id == couple_id).all()
    if not subs:
        logger.info("No push subscribers for couple %s", couple_id)
        return 0

    author_key = (author or "").strip().lower()
    sent = 0
    stale: list[PushSubscription] = []

    for sub in subs:
        owner = (sub.owner_name or "").strip().lower()
        if author_key and owner and owner == author_key:
            continue
        result = send_web_push(sub, payload)
        if result == "ok":
            sent += 1
        elif result == "stale":
            stale.append(sub)

    for sub in stale:
        try:
            db.delete(sub)
        except Exception:
            pass

    if stale:
        db.flush()

    return sent
