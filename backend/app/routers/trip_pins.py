from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.entities import TripPin
from app.schemas.common import TripPinCreate, TripPinOut, parse_optional_date

router = APIRouter(prefix="/api/trip-pins", tags=["trip-pins"])


@router.get("", response_model=list[TripPinOut])
def list_pins(db: Session = Depends(get_db)) -> list[TripPinOut]:
    rows = db.query(TripPin).order_by(TripPin.id.desc()).all()
    return [TripPinOut.from_orm_row(r) for r in rows]


@router.post("", response_model=TripPinOut, status_code=201)
def create_pin(payload: TripPinCreate, db: Session = Depends(get_db)) -> TripPinOut:
    row = TripPin(
        title=payload.title,
        lat=payload.lat,
        lng=payload.lng,
        pin_date=parse_optional_date(payload.date),
        occasion=payload.occasion,
        notes=payload.notes,
        source_dream_id=payload.source_dream_id,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return TripPinOut.from_orm_row(row)


@router.delete("/{pin_id}", status_code=204)
def delete_pin(pin_id: int, db: Session = Depends(get_db)) -> None:
    row = db.query(TripPin).filter(TripPin.id == pin_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Trip pin not found")
    db.delete(row)
    db.commit()
