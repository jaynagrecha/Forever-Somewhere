from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps.couple import get_current_couple, get_current_session_row
from app.models.entities import CoupleMeta, CoupleSession, CoupleSpace
from app.services.couple_auth import (
    generate_invite_code,
    hash_password,
    normalize_invite_code,
    verify_password,
)
from app.services.couple_sessions import create_device_session, rotate_session_token

router = APIRouter(prefix="/api/couples", tags=["couples"])


class CoupleCreateIn(BaseModel):
    display_name: str = Field(min_length=1, max_length=255)
    partner1_name: str = Field(min_length=1, max_length=64)
    partner2_name: str = Field(min_length=1, max_length=64)
    password: str = ""


class CoupleJoinIn(BaseModel):
    invite_code: str = Field(min_length=4, max_length=16)
    password: str = ""


class CoupleOut(BaseModel):
    id: int
    invite_code: str
    display_name: str
    partner1_name: str
    partner2_name: str
    has_password: bool

    @classmethod
    def from_row(cls, row: CoupleSpace) -> "CoupleOut":
        return cls(
            id=row.id,
            invite_code=row.invite_code,
            display_name=row.display_name,
            partner1_name=row.partner1_name,
            partner2_name=row.partner2_name,
            has_password=bool(row.password_hash),
        )


class CoupleSessionOut(BaseModel):
    token: str
    couple: CoupleOut


def _unique_invite(db: Session) -> str:
    for _ in range(20):
        code = generate_invite_code()
        if not db.query(CoupleSpace).filter(CoupleSpace.invite_code == code).first():
            return code
    raise HTTPException(status_code=500, detail="Could not generate invite code")


def _out(db: Session, couple: CoupleSpace, raw: str) -> CoupleSessionOut:
    db.commit()
    db.refresh(couple)
    return CoupleSessionOut(token=raw, couple=CoupleOut.from_row(couple))


@router.post("/create", response_model=CoupleSessionOut, status_code=201)
def create_couple_space(payload: CoupleCreateIn, db: Session = Depends(get_db)) -> CoupleSessionOut:
    invite = _unique_invite(db)
    row = CoupleSpace(
        invite_code=invite,
        display_name=payload.display_name.strip(),
        partner1_name=payload.partner1_name.strip(),
        partner2_name=payload.partner2_name.strip(),
        token_hash="",
        password_hash=hash_password(payload.password) if payload.password else "",
    )
    db.add(row)
    db.flush()
    db.add(CoupleMeta(couple_id=row.id))
    raw, _ = create_device_session(db, row.id)
    return _out(db, row, raw)


@router.post("/join", response_model=CoupleSessionOut)
def join_couple_space(payload: CoupleJoinIn, db: Session = Depends(get_db)) -> CoupleSessionOut:
    code = normalize_invite_code(payload.invite_code)
    row = db.query(CoupleSpace).filter(CoupleSpace.invite_code == code).first()
    if not row:
        raise HTTPException(status_code=404, detail="Invite code not found")
    if row.password_hash and not verify_password(payload.password, row.password_hash):
        raise HTTPException(status_code=403, detail="Incorrect space password")
    # New device session only — existing partners stay signed in
    raw, _ = create_device_session(db, row.id)
    return _out(db, row, raw)


@router.get("/me", response_model=CoupleOut)
def couple_me(couple: CoupleSpace = Depends(get_current_couple)) -> CoupleOut:
    return CoupleOut.from_row(couple)


@router.post("/refresh-token", response_model=CoupleSessionOut)
def refresh_token(
    couple: CoupleSpace = Depends(get_current_couple),
    session: CoupleSession = Depends(get_current_session_row),
    db: Session = Depends(get_db),
) -> CoupleSessionOut:
    """Rotate this device's token only."""
    raw = rotate_session_token(db, session)
    return _out(db, couple, raw)


@router.post("/logout", status_code=204)
def logout(
    session: CoupleSession = Depends(get_current_session_row),
    db: Session = Depends(get_db),
) -> None:
    """Revoke this device only — partner phones unaffected."""
    db.delete(session)
    db.commit()
