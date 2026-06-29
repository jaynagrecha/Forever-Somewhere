import json
import random
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from app.core.author_guard import assert_can_modify

from app.core.database import get_db
from app.core.uploads import couple_upload_dir
from app.deps.couple import get_current_couple
from app.models.entities import CoupleSpace, Memory
from app.services.activity import log_activity
from app.schemas.common import (
    MemoryCreate,
    MemoryOut,
    MemoryUpdate,
    OnThisDayOut,
    parse_optional_date,
)

router = APIRouter(prefix="/api/memories", tags=["memories"])


def _row_to_out(row: Memory) -> MemoryOut:
    return MemoryOut.from_orm_row(row)


def _memories(db: Session, couple_id: int):
    return db.query(Memory).filter(Memory.couple_id == couple_id)


@router.get("", response_model=list[MemoryOut])
def list_memories(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> list[MemoryOut]:
    rows = _memories(db, couple.id).order_by(Memory.memory_date.desc().nullslast(), Memory.id.desc()).all()
    return [_row_to_out(r) for r in rows]


@router.get("/on-this-day", response_model=OnThisDayOut)
def on_this_day(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> OnThisDayOut:
    from datetime import date

    today = date.today()
    rows = _memories(db, couple.id).all()
    matched = [
        r
        for r in rows
        if r.memory_date and r.memory_date.month == today.month and r.memory_date.day == today.day
    ]
    return OnThisDayOut(memories=[_row_to_out(r) for r in matched])


@router.get("/random", response_model=MemoryOut)
def random_memory(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> MemoryOut:
    rows = _memories(db, couple.id).all()
    if not rows:
        raise HTTPException(status_code=404, detail="No memories yet")
    return _row_to_out(random.choice(rows))


@router.post("", response_model=MemoryOut, status_code=201)
def create_memory(
    payload: MemoryCreate,
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> MemoryOut:
    row = Memory(
        couple_id=couple.id,
        title=payload.title,
        memory_date=parse_optional_date(payload.date),
        location=payload.location,
        lat=payload.lat,
        lng=payload.lng,
        occasion=payload.occasion,
        mood=payload.mood,
        notes=payload.notes,
        photos_json=json.dumps([p.model_dump() for p in payload.photos]),
        is_milestone=payload.is_milestone,
        milestone_type=payload.milestone_type,
        playlist_url=payload.playlist_url,
        tags_json=json.dumps(payload.tags),
        album_id=payload.album_id,
        voice_url=payload.voice_url,
        before_photo_json=json.dumps(payload.before_photo) if payload.before_photo else "",
        after_photo_json=json.dumps(payload.after_photo) if payload.after_photo else "",
        added_by=payload.added_by or "Us",
    )
    db.add(row)
    db.flush()
    log_activity(
        db,
        couple_id=couple.id,
        kind="memory",
        title=payload.title,
        author=payload.added_by,
        entity_id=row.id,
        route="/moments",
    )
    db.commit()
    db.refresh(row)
    return _row_to_out(row)


@router.put("/{memory_id}", response_model=MemoryOut)
def update_memory(
    memory_id: int,
    payload: MemoryUpdate,
    author: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> MemoryOut:
    row = _memories(db, couple.id).filter(Memory.id == memory_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Memory not found")
    assert_can_modify(author, getattr(row, "added_by", None), couple)

    data = payload.model_dump(exclude_unset=True)
    if "date" in data:
        row.memory_date = parse_optional_date(data.pop("date") or "")
    if "photos" in data:
        photos = data.pop("photos") or []
        row.photos_json = json.dumps(photos)
    if "tags" in data:
        row.tags_json = json.dumps(data.pop("tags") or [])
    if "before_photo" in data:
        bp = data.pop("before_photo")
        row.before_photo_json = json.dumps(bp) if bp else ""
    if "after_photo" in data:
        ap = data.pop("after_photo")
        row.after_photo_json = json.dumps(ap) if ap else ""
    field_map = {
        "title": "title",
        "location": "location",
        "lat": "lat",
        "lng": "lng",
        "occasion": "occasion",
        "mood": "mood",
        "notes": "notes",
        "is_milestone": "is_milestone",
        "milestone_type": "milestone_type",
        "playlist_url": "playlist_url",
        "album_id": "album_id",
        "voice_url": "voice_url",
    }
    for key, attr in field_map.items():
        if key in data:
            setattr(row, attr, data[key])

    db.commit()
    db.refresh(row)
    return _row_to_out(row)


@router.delete("/{memory_id}", status_code=204)
def delete_memory(
    memory_id: int,
    author: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> None:
    row = _memories(db, couple.id).filter(Memory.id == memory_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Memory not found")
    assert_can_modify(author, getattr(row, "added_by", None), couple)
    db.delete(row)
    db.commit()


@router.post("/upload", response_model=dict)
async def upload_photo(
    file: UploadFile = File(...),
    couple: CoupleSpace = Depends(get_current_couple),
) -> dict:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only images allowed")

    ext = Path(file.filename or "photo.jpg").suffix or ".jpg"
    name = f"{uuid.uuid4().hex}{ext}"
    dest = couple_upload_dir(couple.id) / name

    content = await file.read()
    dest.write_bytes(content)

    return {
        "id": name,
        "name": file.filename or name,
        "url": f"/uploads/{couple.id}/{name}",
    }
