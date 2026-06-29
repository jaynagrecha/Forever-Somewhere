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

router = APIRouter(prefix="/api/push", tags=["push"])


@router.get("/vapid-public-key")
def vapid_public_key() -> dict[str, str]:
    return {"publicKey": settings.vapid_public_key}


@router.post("/subscribe", status_code=201)
def subscribe(
    payload: PushSubscribePayload,
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict[str, str]:
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
    else:
        db.add(
            PushSubscription(
                couple_id=couple.id,
                endpoint=payload.endpoint,
                p256dh=payload.keys.get("p256dh", ""),
                auth=payload.keys.get("auth", ""),
            )
        )
    db.commit()
    return {"status": "subscribed"}


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


def _send_web_push(sub: PushSubscription, payload: dict) -> bool:
    if not settings.vapid_private_key or not settings.vapid_public_key:
        return False
    try:
        from pywebpush import webpush

        webpush(
            subscription_info={
                "endpoint": sub.endpoint,
                "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
            },
            data=json.dumps(payload),
            vapid_private_key=settings.vapid_private_key,
            vapid_claims={"sub": settings.vapid_claims_email},
        )
        return True
    except Exception:
        return False


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
            if _send_web_push(sub, payload):
                sent += 1
    return {"sent": sent, "subscribers": len(subs)}
