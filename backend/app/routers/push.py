import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.uploads import couple_upload_dir
from app.deps.couple import get_current_couple
from app.models.entities import CoupleSpace, PushSubscription
from app.schemas.common import PushSubscribePayload, PushTestPayload
from app.services.push_notify import send_web_push_detailed

router = APIRouter(prefix="/api/push", tags=["push"])

_TEST_PAYLOAD = {
    "title": "Forever, Somewhere 💕",
    "body": "Push is working on this device!",
    "tag": "push-test",
    "route": "/dashboard",
}


@router.get("/vapid-public-key")
def vapid_public_key() -> dict[str, str]:
    return {"publicKey": settings.vapid_public_key}


@router.get("/status")
def push_status(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    subs = db.query(PushSubscription).filter(PushSubscription.couple_id == couple.id).all()
    return {
        "vapid_configured": bool(settings.vapid_public_key and settings.vapid_private_key),
        "subscriber_count": len(subs),
        "devices": [
            {
                "owner_name": s.owner_name or "Unknown",
                "endpoint_hint": s.endpoint[-24:] if s.endpoint else "",
            }
            for s in subs
        ],
    }


@router.post("/subscribe", status_code=201)
def subscribe(
    payload: PushSubscribePayload,
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    owner = (payload.owner_name or "").strip()[:64]
    p256dh = (payload.keys.get("p256dh") or "").strip()
    auth = (payload.keys.get("auth") or "").strip()
    if not payload.endpoint or not p256dh or not auth:
        raise HTTPException(status_code=400, detail="Invalid push subscription keys")

    existing = (
        db.query(PushSubscription)
        .filter(
            PushSubscription.couple_id == couple.id,
            PushSubscription.endpoint == payload.endpoint,
        )
        .first()
    )
    if existing:
        existing.p256dh = p256dh
        existing.auth = auth
        if owner:
            existing.owner_name = owner
    else:
        db.add(
            PushSubscription(
                couple_id=couple.id,
                endpoint=payload.endpoint,
                p256dh=p256dh,
                auth=auth,
                owner_name=owner,
            )
        )

    if owner:
        db.query(PushSubscription).filter(
            PushSubscription.couple_id == couple.id,
            PushSubscription.owner_name == "",
            PushSubscription.endpoint != payload.endpoint,
        ).delete(synchronize_session=False)

    db.commit()
    return {"status": "subscribed", "owner_name": owner}


@router.post("/test", status_code=200)
def test_push(
    payload: PushTestPayload | None = None,
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    """Send a test notification. Pass endpoint to target this device only."""
    body = payload or PushTestPayload()
    all_subs = db.query(PushSubscription).filter(PushSubscription.couple_id == couple.id).all()
    subs = all_subs

    if body.endpoint:
        subs = [s for s in all_subs if s.endpoint == body.endpoint]
        if body.this_device_only and not subs:
            return {
                "sent": 0,
                "failed": 0,
                "subscribers": len(all_subs),
                "this_device_missing": True,
                "failures": [],
            }

    sent = 0
    failed = 0
    failures: list[str] = []
    stale: list[PushSubscription] = []

    for sub in subs:
        result = send_web_push_detailed(sub, _TEST_PAYLOAD)
        if result.status == "ok":
            sent += 1
        else:
            failed += 1
            label = sub.owner_name or "Unknown"
            failures.append(f"{label}: {result.detail or result.status}")
            if result.status == "stale":
                stale.append(sub)

    for sub in stale:
        db.delete(sub)
    if stale:
        db.commit()

    return {
        "sent": sent,
        "failed": failed,
        "subscribers": len(all_subs),
        "targeted": len(subs),
        "this_device_missing": False,
        "failures": failures[:5],
    }


@router.delete("/subscriptions", status_code=200)
def clear_subscriptions(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    """Remove all push registrations for this couple (both partners re-enable after)."""
    removed = (
        db.query(PushSubscription)
        .filter(PushSubscription.couple_id == couple.id)
        .delete(synchronize_session=False)
    )
    db.commit()
    return {"removed": removed}


@router.post("/unsubscribe", status_code=204)
def unsubscribe(
    payload: PushSubscribePayload,
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> None:
    row = (
        db.query(PushSubscription)
        .filter(
            PushSubscription.couple_id == couple.id,
            PushSubscription.endpoint == payload.endpoint,
        )
        .first()
    )
    if row:
        db.delete(row)
        db.commit()


@router.post("/media", response_model=dict)
async def upload_capsule_media(
    file: UploadFile = File(...),
    couple: CoupleSpace = Depends(get_current_couple),
) -> dict:
    if not file.content_type:
        raise HTTPException(status_code=400, detail="Unknown file type")
    allowed = file.content_type.startswith("audio/") or file.content_type.startswith("video/")
    if not allowed:
        raise HTTPException(status_code=400, detail="Only audio or video allowed")

    ext = Path(file.filename or "media.bin").suffix or ".webm"
    name = f"{uuid.uuid4().hex}{ext}"
    dest = couple_upload_dir(couple.id) / name
    dest.write_bytes(await file.read())

    media_type = "audio" if file.content_type.startswith("audio/") else "video"
    return {"url": f"/uploads/{couple.id}/{name}", "media_type": media_type}


@router.post("/broadcast")
def broadcast_notifications(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    from app.routers.features import build_notification_feed

    items = build_notification_feed(db, couple.id)
    subs = db.query(PushSubscription).filter(PushSubscription.couple_id == couple.id).all()
    sent = 0
    stale: list[PushSubscription] = []
    for item in items[:5]:
        payload = {
            "title": item.title,
            "body": item.body,
            "tag": item.tag,
            "route": item.route,
        }
        for sub in subs:
            result = send_web_push_detailed(sub, payload)
            if result.status == "ok":
                sent += 1
            elif result.status == "stale":
                stale.append(sub)

    for sub in stale:
        db.delete(sub)
    if stale:
        db.commit()

    return {"sent": sent, "subscribers": len(subs)}
