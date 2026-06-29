import json
import urllib.parse
import urllib.request
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.author_guard import assert_can_modify
from app.core.database import get_db
from app.deps.couple import get_current_couple
from app.models.entities import CoupleSpace, Dream, LoveNote, Memory, TimeCapsule, TripPin
from app.services.activity import log_activity
from app.schemas.common import (
    CapsuleCreate,
    CapsuleOut,
    DreamCreate,
    DreamOut,
    DreamUpdate,
    ImportPayload,
    StatsOut,
    parse_optional_date,
)

router_dreams = APIRouter(prefix="/api/dreams", tags=["dreams"])
router_capsules = APIRouter(prefix="/api/capsules", tags=["capsules"])
router_stats = APIRouter(prefix="/api", tags=["stats"])
router_import = APIRouter(prefix="/api", tags=["import"])


def _geocode_location(location: str) -> tuple[float, float] | None:
    if not location.strip():
        return None
    url = (
        "https://nominatim.openstreetmap.org/search?format=json&limit=1&q="
        + urllib.parse.quote(location)
    )
    req = urllib.request.Request(url, headers={"User-Agent": "ForeverSomewhere/1.0"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())
            if data:
                return float(data[0]["lat"]), float(data[0]["lon"])
    except OSError:
        pass
    return None


def _dream_payload_to_row(payload: DreamCreate | DreamUpdate) -> dict:
    data = payload.model_dump(exclude_unset=True)
    checklist = data.pop("checklist", None)
    votes = data.pop("votes", None)
    if checklist is not None:
        data["checklist_json"] = json.dumps(checklist)
    if votes is not None:
        data["votes_json"] = json.dumps(votes)
    return data


@router_dreams.get("", response_model=list[DreamOut])
def list_dreams(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> list[DreamOut]:
    rows = db.query(Dream).filter(Dream.couple_id == couple.id).order_by(Dream.id.desc()).all()
    return [DreamOut.from_orm_row(r) for r in rows]


@router_dreams.post("", response_model=DreamOut, status_code=201)
def create_dream(
    payload: DreamCreate,
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> DreamOut:
    data = payload.model_dump()
    checklist = data.pop("checklist", [])
    votes = data.pop("votes", {})
    created_by = data.pop("created_by", "Us") or "Us"
    row = Dream(
        couple_id=couple.id,
        created_by=created_by,
        checklist_json=json.dumps(checklist),
        votes_json=json.dumps(votes),
        **data,
    )
    db.add(row)
    db.flush()
    log_activity(
        db,
        couple_id=couple.id,
        kind="dream",
        title=payload.title,
        author=row.created_by,
        entity_id=row.id,
        route="/someday",
    )
    db.commit()
    db.refresh(row)
    return DreamOut.from_orm_row(row)


@router_dreams.put("/{dream_id}", response_model=DreamOut)
def update_dream(
    dream_id: int,
    payload: DreamUpdate,
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> DreamOut:
    row = db.query(Dream).filter(Dream.couple_id == couple.id, Dream.id == dream_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Dream not found")
    data = _dream_payload_to_row(payload)
    for key, value in data.items():
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return DreamOut.from_orm_row(row)


@router_dreams.delete("/{dream_id}", status_code=204)
def delete_dream(
    dream_id: int,
    author: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> None:
    row = db.query(Dream).filter(Dream.couple_id == couple.id, Dream.id == dream_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Dream not found")
    assert_can_modify(author, getattr(row, "created_by", None), couple)
    db.delete(row)
    db.commit()


@router_dreams.post("/{dream_id}/promote-to-map", response_model=dict)
def promote_dream_to_map(
    dream_id: int,
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    row = db.query(Dream).filter(Dream.couple_id == couple.id, Dream.id == dream_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Dream not found")

    row.status = "Planned"
    lat, lng = 0.0, 0.0
    needs_geocode = True
    coords = _geocode_location(row.location or row.title)
    if coords:
        lat, lng = coords
        needs_geocode = False
    pin = TripPin(
        couple_id=couple.id,
        title=row.location or row.title,
        lat=lat,
        lng=lng,
        notes=f"From dream: {row.title}. {row.notes}",
        source_dream_id=row.id,
    )
    db.add(pin)
    db.flush()
    log_activity(
        db,
        couple_id=couple.id,
        kind="trip_pin",
        title=pin.title,
        author="Us",
        entity_id=pin.id,
        route="/somewhere",
    )
    db.commit()
    db.refresh(pin)
    return {"dream": DreamOut.from_orm_row(row), "pin_id": pin.id, "needs_geocode": needs_geocode}


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
def list_capsules(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> list[CapsuleOut]:
    rows = (
        db.query(TimeCapsule)
        .filter(TimeCapsule.couple_id == couple.id)
        .order_by(TimeCapsule.unlock_date.asc())
        .all()
    )
    return [_capsule_out(r) for r in rows]


@router_capsules.post("", response_model=CapsuleOut, status_code=201)
def create_capsule(
    payload: CapsuleCreate,
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> CapsuleOut:
    row = TimeCapsule(couple_id=couple.id, **payload.model_dump())
    db.add(row)
    db.flush()
    log_activity(
        db,
        couple_id=couple.id,
        kind="capsule",
        title=payload.title,
        author=payload.author,
        entity_id=row.id,
        route="/forever",
    )
    db.commit()
    db.refresh(row)
    return _capsule_out(row)


@router_capsules.post("/{capsule_id}/open", response_model=CapsuleOut)
def open_capsule(
    capsule_id: int,
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> CapsuleOut:
    row = (
        db.query(TimeCapsule)
        .filter(TimeCapsule.couple_id == couple.id, TimeCapsule.id == capsule_id)
        .first()
    )
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
def delete_capsule(
    capsule_id: int,
    author: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> None:
    row = (
        db.query(TimeCapsule)
        .filter(TimeCapsule.couple_id == couple.id, TimeCapsule.id == capsule_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Capsule not found")
    assert_can_modify(author, row.author, couple)
    db.delete(row)
    db.commit()


@router_stats.get("/stats", response_model=StatsOut)
def get_stats(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> StatsOut:
    cid = couple.id
    memories = db.query(Memory).filter(Memory.couple_id == cid).count()
    pins = db.query(TripPin).filter(TripPin.couple_id == cid).count()
    dreams = db.query(Dream).filter(Dream.couple_id == cid).count()
    capsules = db.query(TimeCapsule).filter(TimeCapsule.couple_id == cid).count()
    completed = db.query(Dream).filter(Dream.couple_id == cid, Dream.status == "Completed").count()
    milestones = db.query(Memory).filter(Memory.couple_id == cid, Memory.is_milestone.is_(True)).count()
    memory_coords = (
        db.query(Memory).filter(Memory.couple_id == cid, Memory.lat.isnot(None), Memory.lng.isnot(None)).count()
    )
    bucket = round(completed / dreams * 100, 1) if dreams else 0.0
    notes = db.query(LoveNote).filter(LoveNote.couple_id == cid).count()
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
def import_local(
    payload: ImportPayload,
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    created = {"memories": 0, "pins": 0, "dreams": 0}

    for m in payload.memories:
        db.add(
            Memory(
                couple_id=couple.id,
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
        )
        created["memories"] += 1

    for p in payload.places:
        db.add(
            TripPin(
                couple_id=couple.id,
                title=p.title,
                lat=p.lat,
                lng=p.lng,
                pin_date=parse_optional_date(p.date),
                occasion=p.occasion,
                notes=p.notes,
            )
        )
        created["pins"] += 1

    for d in payload.dreams:
        data = d.model_dump()
        checklist = data.pop("checklist", [])
        db.add(Dream(couple_id=couple.id, **data, checklist_json=json.dumps(checklist)))
        created["dreams"] += 1

    db.commit()
    return created
