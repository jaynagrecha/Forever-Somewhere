import json
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.uploads import couple_upload_dir
from app.deps.couple import get_current_couple
from app.models.entities import CoupleSpace, PushSubscription
from app.schemas.common import PushSubscribePayload
from app.services.push_notify import send_web_push

router = APIRouter(prefix="/api/push", tags=["push"])


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
        "devices": [{"owner_name": s.owner_name or "Unknown"} for s in subs],
    }


@router.post("/subscribe", status_code=201)
def subscribe(
    payload: PushSubscribePayload,
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    owner = (payload.owner_name or "").strip()[:64]
    existing = (
        db.query(PushSubscription)
        .filter(
            PushSubscription.couple_id == couple.id,
            PushSubscription.endpoint == payload.endpoint,
        )
        .first()
    )
    if existing:
        existing.p256dh = payload.keys.get("p256dh", "")
        existing.auth = payload.keys.get("auth", "")
        existing.owner_name = owner or existing.owner_name
    else:
        db.add(
            PushSubscription(
                couple_id=couple.id,
                endpoint=payload.endpoint,
                p256dh=payload.keys.get("p256dh", ""),
                auth=payload.keys.get("auth", ""),
                owner_name=owner,
            )
        )
    db.commit()
    return {"status": "subscribed", "owner_name": owner}


@router.post("/test", status_code=200)
def test_push(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    """Send a test notification to all devices registered for this couple."""
    subs = db.query(PushSubscription).filter(PushSubscription.couple_id == couple.id).all()
    payload = {
        "title": "Forever, Somewhere 💕",
        "body": "Push is working on this device!",
        "tag": "push-test",
        "route": "/dashboard",
    }
    sent = sum(1 for s in subs if send_web_push(s, payload) == "ok")
    return {"sent": sent, "subscribers": len(subs)}


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
    for item in items[:5]:
        payload = {
            "title": item.title,
            "body": item.body,
            "tag": item.tag,
            "route": item.route,
        }
        for sub in subs:
            if send_web_push(sub, payload):
                sent += 1
    return {"sent": sent, "subscribers": len(subs)}
