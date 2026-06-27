import json
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.entities import Dream, ImportantDate, LoveNote, Memory, TimeCapsule, TripPin
from app.schemas.common import (
    CapsuleCreate,
    CapsuleOut,
    DreamCreate,
    DreamOut,
    DreamUpdate,
    ImportPayload,
    StatsOut,
    TripPinCreate,
    parse_optional_date,
)

router_dreams = APIRouter(prefix="/api/dreams", tags=["dreams"])
router_capsules = APIRouter(prefix="/api/capsules", tags=["capsules"])
router_stats = APIRouter(prefix="/api", tags=["stats"])
router_import = APIRouter(prefix="/api", tags=["import"])


def _dream_payload_to_row(payload: DreamCreate | DreamUpdate, existing: Dream | None = None) -> dict:
    data = payload.model_dump(exclude_unset=True)
    checklist = data.pop("checklist", None)
    if checklist is not None:
        data["checklist_json"] = json.dumps(checklist)
    return data


@router_dreams.get("", response_model=list[DreamOut])
def list_dreams(db: Session = Depends(get_db)) -> list[DreamOut]:
    return [DreamOut.from_orm_row(r) for r in db.query(Dream).order_by(Dream.id.desc()).all()]


@router_dreams.post("", response_model=DreamOut, status_code=201)
def create_dream(payload: DreamCreate, db: Session = Depends(get_db)) -> DreamOut:
    data = payload.model_dump()
    checklist = data.pop("checklist", [])
    row = Dream(**data, checklist_json=json.dumps(checklist))
    db.add(row)
    db.commit()
    db.refresh(row)
    return DreamOut.from_orm_row(row)


@router_dreams.put("/{dream_id}", response_model=DreamOut)
def update_dream(dream_id: int, payload: DreamUpdate, db: Session = Depends(get_db)) -> DreamOut:
    row = db.query(Dream).filter(Dream.id == dream_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Dream not found")
    data = _dream_payload_to_row(payload)
    for key, value in data.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return DreamOut.from_orm_row(row)


@router_dreams.delete("/{dream_id}", status_code=204)
def delete_dream(dream_id: int, db: Session = Depends(get_db)) -> None:
    row = db.query(Dream).filter(Dream.id == dream_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Dream not found")
    db.delete(row)
    db.commit()


@router_dreams.post("/{dream_id}/promote-to-map", response_model=dict)
def promote_dream_to_map(dream_id: int, db: Session = Depends(get_db)) -> dict:
    """Promote a Planned dream to a map trip pin — unique Someday→Somewhere bridge."""
    row = db.query(Dream).filter(Dream.id == dream_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Dream not found")

    row.status = "Planned"
    pin = TripPin(
        title=row.location or row.title,
        lat=0.0,
        lng=0.0,
        notes=f"From dream: {row.title}. {row.notes}",
        source_dream_id=row.id,
    )
    db.add(pin)
    db.commit()
    db.refresh(pin)
    return {"dream": DreamOut.from_orm_row(row), "pin_id": pin.id, "needs_geocode": True}


def _capsule_out(row: TimeCapsule) -> CapsuleOut:
    today = date.today()
    locked = today < row.unlock_date and not row.is_opened
    days = (row.unlock_date - today).days if locked else None
    return CapsuleOut(
        id=row.id,
        title=row.title,
        content=row.content if (not locked or row.is_opened) else "",
        unlock_date=row.unlock_date,
        author=row.author,
        media_url=getattr(row, "media_url", "") or "" if (not locked or row.is_opened) else "",
        media_type=getattr(row, "media_type", "") or "" if (not locked or row.is_opened) else "",
        is_opened=row.is_opened,
        opened_at=row.opened_at,
        created_at=row.created_at,
        is_locked=locked,
        days_until_unlock=days,
    )


@router_capsules.get("", response_model=list[CapsuleOut])
def list_capsules(db: Session = Depends(get_db)) -> list[CapsuleOut]:
    rows = db.query(TimeCapsule).order_by(TimeCapsule.unlock_date.asc()).all()
    return [_capsule_out(r) for r in rows]


@router_capsules.post("", response_model=CapsuleOut, status_code=201)
def create_capsule(payload: CapsuleCreate, db: Session = Depends(get_db)) -> CapsuleOut:
    row = TimeCapsule(**payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return _capsule_out(row)


@router_capsules.post("/{capsule_id}/open", response_model=CapsuleOut)
def open_capsule(capsule_id: int, db: Session = Depends(get_db)) -> CapsuleOut:
    row = db.query(TimeCapsule).filter(TimeCapsule.id == capsule_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Capsule not found")
    if date.today() < row.unlock_date:
        raise HTTPException(status_code=403, detail="Capsule is still locked")
    row.is_opened = True
    row.opened_at = datetime.utcnow()
    db.commit()
    db.refresh(row)
    return _capsule_out(row)


@router_capsules.delete("/{capsule_id}", status_code=204)
def delete_capsule(capsule_id: int, db: Session = Depends(get_db)) -> None:
    row = db.query(TimeCapsule).filter(TimeCapsule.id == capsule_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Capsule not found")
    db.delete(row)
    db.commit()


@router_stats.get("/stats", response_model=StatsOut)
def get_stats(db: Session = Depends(get_db)) -> StatsOut:
    memories = db.query(Memory).count()
    pins = db.query(TripPin).count()
    dreams = db.query(Dream).count()
    capsules = db.query(TimeCapsule).count()
    completed = db.query(Dream).filter(Dream.status == "Completed").count()
    milestones = db.query(Memory).filter(Memory.is_milestone.is_(True)).count()
    memory_coords = db.query(Memory).filter(Memory.lat.isnot(None), Memory.lng.isnot(None)).count()
    total_dreams = dreams
    bucket = round(completed / total_dreams * 100, 1) if total_dreams else 0.0
    notes = db.query(LoveNote).count()
    return StatsOut(
        memories_count=memories,
        trip_pins_count=pins,
        dreams_count=dreams,
        capsules_count=capsules,
        places_on_map=pins + memory_coords,
        dreams_completed=completed,
        milestones_count=milestones,
        bucket_progress=bucket,
        love_notes_count=notes,
    )


@router_import.post("/import/local", response_model=dict)
def import_local(payload: ImportPayload, db: Session = Depends(get_db)) -> dict:
    """One-time migration from browser localStorage."""
    import json

    created = {"memories": 0, "pins": 0, "dreams": 0}

    for m in payload.memories:
        row = Memory(
            title=m.title,
            memory_date=parse_optional_date(m.date),
            location=m.location,
            lat=m.lat,
            lng=m.lng,
            occasion=m.occasion,
            mood=m.mood,
            notes=m.notes,
            photos_json=json.dumps([p.model_dump() for p in m.photos]),
            is_milestone=m.is_milestone,
            milestone_type=m.milestone_type,
        )
        db.add(row)
        created["memories"] += 1

    for p in payload.places:
        row = TripPin(
            title=p.title,
            lat=p.lat,
            lng=p.lng,
            pin_date=parse_optional_date(p.date),
            occasion=p.occasion,
            notes=p.notes,
        )
        db.add(row)
        created["pins"] += 1

    for d in payload.dreams:
        data = d.model_dump()
        checklist = data.pop("checklist", [])
        row = Dream(**data, checklist_json=json.dumps(checklist))
        db.add(row)
        created["dreams"] += 1

    db.commit()
    return created
