from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.entities import CoupleSpace
from app.services.couple_auth import verify_token


def get_current_couple(
    authorization: str | None = Header(None),
    x_couple_token: str | None = Header(None, alias="X-Couple-Token"),
    db: Session = Depends(get_db),
) -> CoupleSpace:
    raw = None
    if authorization and authorization.lower().startswith("bearer "):
        raw = authorization[7:].strip()
    elif x_couple_token:
        raw = x_couple_token.strip()

    if not raw:
        raise HTTPException(status_code=401, detail="Couple space token required")

    for row in db.query(CoupleSpace).all():
        if verify_token(raw, row.token_hash):
            return row

    raise HTTPException(status_code=401, detail="Invalid or expired couple token")
