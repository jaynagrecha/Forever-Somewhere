from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.entities import CoupleSpace
from app.services.couple_sessions import couple_for_session, find_session_by_raw_token


def _extract_raw_token(
    authorization: str | None,
    x_couple_token: str | None,
) -> str | None:
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    if x_couple_token:
        return x_couple_token.strip()
    return None


def get_current_couple(
    authorization: str | None = Header(None),
    x_couple_token: str | None = Header(None, alias="X-Couple-Token"),
    db: Session = Depends(get_db),
) -> CoupleSpace:
    raw = _extract_raw_token(authorization, x_couple_token)
    if not raw:
        raise HTTPException(status_code=401, detail="Couple space token required")

    session = find_session_by_raw_token(db, raw)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired couple token")

    couple = couple_for_session(db, session)
    if not couple:
        raise HTTPException(status_code=401, detail="Couple space not found")

    db.commit()
    return couple


def get_current_session_row(
    authorization: str | None = Header(None),
    x_couple_token: str | None = Header(None, alias="X-Couple-Token"),
    db: Session = Depends(get_db),
):
    from app.models.entities import CoupleSession

    raw = _extract_raw_token(authorization, x_couple_token)
    if not raw:
        raise HTTPException(status_code=401, detail="Couple space token required")

    session = find_session_by_raw_token(db, raw)
    if not session:
        raise HTTPException(status_code=401, detail="Invalid or expired couple token")

    db.commit()
    return session
