"""Web Push delivery to partner devices (lock-screen when app is closed)."""
import json
import logging
import threading
from dataclasses import dataclass

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

_vapid_lock = threading.Lock()
_vapid_instance = None

_STALE_HTTP = frozenset({400, 401, 403, 404, 410})

# Apple rejects VAPID sub claims with @localhost, .local, etc. (FCM still accepts them).
_INVALID_VAPID_SUB_MARKERS = ("@localhost", "@127.0.0.1", ".local", "@local")


@dataclass(frozen=True)
class PushSendResult:
    status: str  # ok | stale | error
    detail: str = ""


def _format_push(kind: str, title: str, author: str) -> tuple[str, str]:
    template = _PUSH_COPY.get(kind, ("Partner activity", "{author} — {title}"))
    head, body_tpl = template
    body = body_tpl.format(title=title, author=author or "Your partner")
    if kind == "ping":
        body = title
    return head, body


def vapid_sub_claim() -> str:
    """JWT `sub` for VAPID — must be mailto: or https:// with a domain Apple accepts."""
    fallback = (settings.public_app_url or "https://forever-somewhere-web.onrender.com").strip()
    sub = (settings.vapid_claims_email or "").strip()
    if not sub:
        return fallback

    if not sub.startswith(("mailto:", "https://", "http://")):
        sub = f"mailto:{sub}" if "@" in sub else fallback

    lower = sub.lower()
    if any(marker in lower for marker in _INVALID_VAPID_SUB_MARKERS):
        logger.info("VAPID sub %r rejected by Apple rules — using %s", sub, fallback)
        return fallback

    return sub


def _get_vapid():
    """Load VAPID signer once (PEM must use from_pem — from_string breaks PEM keys)."""
    global _vapid_instance
    if not settings.vapid_private_key:
        return None
    with _vapid_lock:
        if _vapid_instance is None:
            from py_vapid import Vapid02

            _vapid_instance = Vapid02.from_pem(settings.vapid_private_key.encode("utf-8"))
        return _vapid_instance


def send_web_push(sub: PushSubscription, payload: dict) -> str:
    """Returns 'ok', 'stale' (subscription expired), or 'error'."""
    return send_web_push_detailed(sub, payload).status


def send_web_push_detailed(sub: PushSubscription, payload: dict) -> PushSendResult:
    if not settings.vapid_private_key or not settings.vapid_public_key:
        logger.warning("Web Push skipped: VAPID keys not configured")
        return PushSendResult("error", "VAPID not configured")

    vapid = _get_vapid()
    if vapid is None:
        return PushSendResult("error", "VAPID signer unavailable")

    try:
        from pywebpush import WebPushException, webpush

        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            data=json.dumps(payload),
            vapid_private_key=vapid,
            vapid_claims={"sub": vapid_sub_claim()},
            content_encoding="aes128gcm",
            ttl=86400,
        )
        return PushSendResult("ok")
    except WebPushException as exc:
        status = getattr(exc.response, "status_code", None)
        body = ""
        if exc.response is not None:
            try:
                body = (exc.response.text or "")[:180]
            except Exception:
                body = str(exc)[:180]
        detail = f"HTTP {status}" if status else str(exc)[:180]
        if body and body not in detail:
            detail = f"{detail}: {body}"

        if status in _STALE_HTTP:
            logger.info(
                "Stale push subscription %s (%s): %s",
                sub.id,
                (sub.owner_name or "Unknown"),
                detail,
            )
            return PushSendResult("stale", detail)

        logger.warning(
            "Web Push failed for subscription %s (%s): %s",
            sub.id,
            (sub.owner_name or "Unknown"),
            detail,
        )
        return PushSendResult("error", detail)
    except Exception as exc:
        detail = str(exc)[:180]
        logger.warning("Web Push failed for subscription %s: %s", sub.id, detail)
        return PushSendResult("error", detail)


def _delete_stale(db: Session, stale: list[PushSubscription]) -> None:
    for sub in stale:
        try:
            db.delete(sub)
        except Exception:
            pass
    if stale:
        db.flush()


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
        result = send_web_push_detailed(sub, payload)
        if result.status == "ok":
            sent += 1
        elif result.status == "stale":
            stale.append(sub)

    _delete_stale(db, stale)
    return sent
