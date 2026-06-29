from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps.couple import get_current_couple
from app.models.entities import CoupleSpace
from app.services import recovery as recovery_svc

router = APIRouter(prefix="/api/recovery", tags=["recovery"])


class PartnerSlotIn(BaseModel):
    partner_slot: int = Field(ge=1, le=2)
    email: str = Field(min_length=3, max_length=255)


class ConfirmVerifyIn(BaseModel):
    partner_slot: int = Field(ge=1, le=2)
    email: str = Field(min_length=3, max_length=255)
    otp: str = Field(min_length=6, max_length=6)


class RecoveryStartIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)


class RecoveryCompleteIn(BaseModel):
    email: str = Field(min_length=3, max_length=255)
    otp: str = Field(min_length=6, max_length=6)
    password: str = ""


class BackupRecoverIn(BaseModel):
    backup_code: str = Field(min_length=8, max_length=32)


class PartnerSlotOnlyIn(BaseModel):
    partner_slot: int = Field(ge=1, le=2)


@router.get("/settings")
def get_recovery_settings(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    return recovery_svc.recovery_settings(db, couple)


@router.post("/email/request")
def request_email_verification(
    payload: PartnerSlotIn,
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    try:
        masked = recovery_svc.request_verify_otp(db, couple, payload.partner_slot, payload.email)
        db.commit()
        return {"message": f"Verification code sent to {masked}", "email_masked": masked}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/email/confirm")
def confirm_email_verification(
    payload: ConfirmVerifyIn,
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    try:
        masked = recovery_svc.confirm_verify_otp(
            db, couple, payload.partner_slot, payload.email, payload.otp
        )
        db.commit()
        return {"message": f"Recovery email verified: {masked}", "email_masked": masked}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/backup/generate")
def generate_backup_code(
    payload: PartnerSlotOnlyIn,
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    code = recovery_svc.generate_partner_backup_code(db, couple, payload.partner_slot)
    db.commit()
    return {
        "backup_code": code,
        "message": "Save this code somewhere safe — it replaces any previous backup code for you.",
    }


@router.post("/start")
def start_recovery(payload: RecoveryStartIn, db: Session = Depends(get_db)) -> dict[str, str]:
    """Public — send OTP if this verified recovery email exists (same response either way)."""
    try:
        masked = recovery_svc.request_recovery_otp(db, payload.email)
        db.commit()
        return {
            "message": f"If this email is registered for recovery, a code was sent to {masked}.",
            "email_masked": masked,
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/complete")
def complete_recovery(payload: RecoveryCompleteIn, db: Session = Depends(get_db)) -> dict[str, str]:
    try:
        masked = recovery_svc.complete_recovery(db, payload.email, payload.otp, payload.password)
        db.commit()
        return {
            "message": f"Your invite code was sent to {masked}. Check your inbox and join your space.",
            "email_masked": masked,
        }
    except ValueError as exc:
        db.commit()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@router.post("/backup")
def recover_with_backup(payload: BackupRecoverIn, db: Session = Depends(get_db)) -> dict[str, str]:
    try:
        invite_code, display_name = recovery_svc.recover_with_backup_code(db, payload.backup_code)
        db.commit()
        return {
            "invite_code": invite_code,
            "display_name": display_name,
            "message": "Use this invite code on the Join screen (and your space password if set).",
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
