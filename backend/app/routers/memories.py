import json
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.models.entities import Memory
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


@router.get("", response_model=list[MemoryOut])
def list_memories(db: Session = Depends(get_db)) -> list[MemoryOut]:
    rows = db.query(Memory).order_by(Memory.memory_date.desc().nullslast(), Memory.id.desc()).all()
    return [_row_to_out(r) for r in rows]


@router.get("/on-this-day", response_model=OnThisDayOut)
def on_this_day(db: Session = Depends(get_db)) -> OnThisDayOut:
    from datetime import date

    today = date.today()
    rows = db.query(Memory).all()
    matched = [
        r
        for r in rows
        if r.memory_date and r.memory_date.month == today.month and r.memory_date.day == today.day
    ]
    return OnThisDayOut(memories=[_row_to_out(r) for r in matched])


@router.post("", response_model=MemoryOut, status_code=201)
def create_memory(payload: MemoryCreate, db: Session = Depends(get_db)) -> MemoryOut:
    row = Memory(
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
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _row_to_out(row)


@router.put("/{memory_id}", response_model=MemoryOut)
def update_memory(
    memory_id: int, payload: MemoryUpdate, db: Session = Depends(get_db)
) -> MemoryOut:
    row = db.query(Memory).filter(Memory.id == memory_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Memory not found")

    data = payload.model_dump(exclude_unset=True)
    if "date" in data:
        row.memory_date = parse_optional_date(data.pop("date") or "")
    if "photos" in data:
        photos = data.pop("photos") or []
        row.photos_json = json.dumps(photos)
    if "tags" in data:
        row.tags_json = json.dumps(data.pop("tags") or [])
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
    }
    for key, attr in field_map.items():
        if key in data:
            setattr(row, attr, data[key])

    db.commit()
    db.refresh(row)
    return _row_to_out(row)


@router.delete("/{memory_id}", status_code=204)
def delete_memory(memory_id: int, db: Session = Depends(get_db)) -> None:
    row = db.query(Memory).filter(Memory.id == memory_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Memory not found")
    db.delete(row)
    db.commit()


@router.post("/upload", response_model=dict)
async def upload_photo(file: UploadFile = File(...)) -> dict:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only images allowed")

    ext = Path(file.filename or "photo.jpg").suffix or ".jpg"
    name = f"{uuid.uuid4().hex}{ext}"
    dest = settings.upload_dir / name

    content = await file.read()
    dest.write_bytes(content)

    return {
        "id": name,
        "name": file.filename or name,
        "url": f"/uploads/{name}",
    }
