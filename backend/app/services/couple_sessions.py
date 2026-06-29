"""Per-device sessions — join never revokes other partners' tokens."""
from sqlalchemy.orm import Session

from app.models.entities import CoupleSession, CoupleSpace
from app.services.couple_auth import hash_token, issue_token, verify_token


def create_device_session(db: Session, couple_id: int) -> tuple[str, CoupleSession]:
    raw, token_hash = issue_token()
    row = CoupleSession(couple_id=couple_id, token_hash=token_hash)
    db.add(row)
    db.flush()
    return raw, row


def find_session_by_raw_token(db: Session, raw: str) -> CoupleSession | None:
    if not raw:
        return None
    hashed = hash_token(raw)
    session = db.query(CoupleSession).filter(CoupleSession.token_hash == hashed).first()
    if session:
        return session

    # Legacy: single token stored on couple_spaces — migrate to sessions on use
    for couple in db.query(CoupleSpace).filter(CoupleSpace.token_hash != "").all():
        if verify_token(raw, couple.token_hash):
            session = CoupleSession(couple_id=couple.id, token_hash=hashed)
            couple.token_hash = ""
            db.add(session)
            db.flush()
            return session
    return None


def couple_for_session(db: Session, session: CoupleSession) -> CoupleSpace | None:
    return db.query(CoupleSpace).filter(CoupleSpace.id == session.couple_id).first()


def rotate_session_token(db: Session, session: CoupleSession) -> str:
    raw, session.token_hash = issue_token()
    db.add(session)
    db.flush()
    return raw
