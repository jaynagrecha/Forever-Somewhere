"""Space recovery — verified email OTP, backup codes, audit log, rate limits."""
import logging
import re
import secrets
from datetime import datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.entities import CoupleSpace, RecoveryAuditLog, RecoveryOtp
from app.services.couple_auth import hash_token, verify_password
from app.services.email_send import SendResult, email_configured, send_email

logger = logging.getLogger(__name__)

OTP_PURPOSE_VERIFY = "verify_email"
OTP_PURPOSE_RECOVER = "recover_access"

MAX_OTP_REQUESTS_PER_HOUR = 3
MAX_OTP_ATTEMPTS = 5
MAX_BACKUP_ATTEMPTS_PER_HOUR = 5

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def normalize_email(email: str) -> str:
    return email.strip().lower()


def mask_email(email: str) -> str:
    if "@" not in email:
        return "***"
    local, domain = email.split("@", 1)
    if len(local) <= 1:
        masked_local = "*"
    else:
        masked_local = local[0] + "***"
    return f"{masked_local}@{domain}"


def generate_otp() -> str:
    return f"{secrets.randbelow(900000) + 100000:06d}"


def generate_backup_code() -> str:
    raw = secrets.token_hex(6).upper()
    return f"FS-{raw[:4]}-{raw[4:8]}-{raw[8:12]}"


def hash_backup_code(code: str) -> str:
    normalized = code.strip().upper().replace(" ", "")
    return hash_token(normalized)


def partner_slot_fields(slot: int) -> tuple[str, str, str, str]:
    if slot == 1:
        return (
            "partner1_recovery_email",
            "partner1_recovery_verified",
            "partner1_backup_code_hash",
            "partner1_name",
        )
    if slot == 2:
        return (
            "partner2_recovery_email",
            "partner2_recovery_verified",
            "partner2_backup_code_hash",
            "partner2_name",
        )
    raise ValueError("partner_slot must be 1 or 2")


def find_couple_by_verified_email(db: Session, email: str) -> tuple[CoupleSpace | None, int | None]:
    normalized = normalize_email(email)
    for row in db.query(CoupleSpace).all():
        if row.partner1_recovery_verified and normalize_email(row.partner1_recovery_email) == normalized:
            return row, 1
        if row.partner2_recovery_verified and normalize_email(row.partner2_recovery_email) == normalized:
            return row, 2
    return None, None


def find_couple_by_backup_code(db: Session, code: str) -> tuple[CoupleSpace | None, int | None]:
    hashed = hash_backup_code(code)
    for row in db.query(CoupleSpace).all():
        if row.partner1_backup_code_hash and secrets.compare_digest(row.partner1_backup_code_hash, hashed):
            return row, 1
        if row.partner2_backup_code_hash and secrets.compare_digest(row.partner2_backup_code_hash, hashed):
            return row, 2
    return None, None


def _otp_ttl() -> datetime:
    return datetime.utcnow() + timedelta(minutes=settings.recovery_otp_ttl_minutes)


def _count_recent_otp_requests(db: Session, email: str) -> int:
    since = datetime.utcnow() - timedelta(hours=1)
    return (
        db.query(func.count(RecoveryOtp.id))
        .filter(RecoveryOtp.email == normalize_email(email), RecoveryOtp.created_at >= since)
        .scalar()
        or 0
    )


def _count_recent_backup_attempts(db: Session, couple_id: int) -> int:
    since = datetime.utcnow() - timedelta(hours=1)
    return (
        db.query(func.count(RecoveryAuditLog.id))
        .filter(
            RecoveryAuditLog.couple_id == couple_id,
            RecoveryAuditLog.event_type == "backup_attempt",
            RecoveryAuditLog.created_at >= since,
        )
        .scalar()
        or 0
    )


def log_audit(db: Session, couple_id: int, event_type: str, detail: str) -> None:
    db.add(
        RecoveryAuditLog(
            couple_id=couple_id,
            event_type=event_type,
            detail=detail[:255],
        )
    )


def _send_otp_email(to: str, otp: str, *, verifying: bool) -> SendResult:
    action = "verify your recovery email" if verifying else "recover your invite code"
    subject = f"Forever, Somewhere — {action}"
    html = f"""
    <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#ff4d6d;">Forever, Somewhere</h2>
      <p>Your one-time code to {action}:</p>
      <p style="font-size:32px;letter-spacing:8px;font-weight:bold;">{otp}</p>
      <p style="color:#666;font-size:14px;">Expires in {settings.recovery_otp_ttl_minutes} minutes.
      If you didn't request this, ignore this email.</p>
    </div>
    """
    text = f"Your Forever, Somewhere code: {otp} (expires in {settings.recovery_otp_ttl_minutes} min)"
    return send_email(to=to, subject=subject, html=html, text=text)


def _send_invite_email(to: str, invite_code: str, display_name: str) -> SendResult:
    subject = "Your Forever, Somewhere invite code"
    html = f"""
    <div style="font-family:Georgia,serif;max-width:480px;margin:0 auto;padding:24px;">
      <h2 style="color:#ff4d6d;">Welcome back</h2>
      <p>Your space <strong>{display_name}</strong> is waiting.</p>
      <p style="font-size:28px;letter-spacing:4px;font-weight:bold;">{invite_code}</p>
      <p>Open the app → <strong>Join with invite code</strong> → enter this code
      (and your space password if you set one).</p>
    </div>
    """
    text = f"Invite code for {display_name}: {invite_code}\nJoin at the app with this code."
    return send_email(to=to, subject=subject, html=html, text=text)


def _store_otp(
    db: Session,
    *,
    email: str,
    otp: str,
    couple_id: int,
    purpose: str,
    partner_slot: int | None,
) -> None:
    normalized = normalize_email(email)
    db.query(RecoveryOtp).filter(
        RecoveryOtp.email == normalized,
        RecoveryOtp.purpose == purpose,
    ).delete(synchronize_session=False)
    db.add(
        RecoveryOtp(
            email=normalized,
            otp_hash=hash_token(otp),
            couple_id=couple_id,
            purpose=purpose,
            partner_slot=partner_slot,
            expires_at=_otp_ttl(),
        )
    )


def _verify_otp_row(db: Session, email: str, otp: str, purpose: str) -> RecoveryOtp | None:
    normalized = normalize_email(email)
    row = (
        db.query(RecoveryOtp)
        .filter(
            RecoveryOtp.email == normalized,
            RecoveryOtp.purpose == purpose,
        )
        .order_by(RecoveryOtp.id.desc())
        .first()
    )
    if not row:
        return None
    if row.expires_at < datetime.utcnow():
        return None
    if row.attempts >= MAX_OTP_ATTEMPTS:
        return None
    if not secrets.compare_digest(row.otp_hash, hash_token(otp)):
        row.attempts += 1
        db.flush()
        return None
    return row


def request_verify_otp(db: Session, couple: CoupleSpace, partner_slot: int, email: str) -> tuple[str, str, str]:
    if not email_configured():
        raise RuntimeError(
            "Email is not configured on the server. Add SMTP_HOST, SMTP_USER, and SMTP_PASSWORD "
            "(Gmail App Password) on Render → forever-somewhere-api, then redeploy."
        )

    normalized = normalize_email(email)
    if not _EMAIL_RE.match(normalized):
        raise ValueError("Invalid email address")
    if _count_recent_otp_requests(db, normalized) >= MAX_OTP_REQUESTS_PER_HOUR:
        raise ValueError("Too many codes requested — try again in an hour")

    otp = generate_otp()
    _store_otp(
        db,
        email=normalized,
        otp=otp,
        couple_id=couple.id,
        purpose=OTP_PURPOSE_VERIFY,
        partner_slot=partner_slot,
    )
    return otp, normalized, mask_email(normalized)


def deliver_verify_otp_email(couple_id: int, to: str, otp: str) -> None:
    """Send verification OTP after the HTTP response (avoids Render/browser timeouts)."""
    from app.core.database import SessionLocal

    result = _send_otp_email(to, otp, verifying=True)
    db = SessionLocal()
    try:
        if result.ok:
            log_audit(db, couple_id, "verify_otp_sent", f"Verification code sent to {mask_email(to)}")
        else:
            log_audit(db, couple_id, "verify_otp_failed", result.error[:255])
            logger.error("Verify OTP email failed for %s: %s", mask_email(to), result.error)
        db.commit()
    finally:
        db.close()


def _email_used_by_other_partner(couple: CoupleSpace, partner_slot: int, normalized: str) -> bool:
    other = 2 if partner_slot == 1 else 1
    email_field, verified_field, _, _ = partner_slot_fields(other)
    if not getattr(couple, verified_field):
        return False
    other_email = normalize_email(getattr(couple, email_field) or "")
    return other_email == normalized


def confirm_verify_otp(db: Session, couple: CoupleSpace, partner_slot: int, email: str, otp: str) -> str:
    normalized = normalize_email(email)
    row = _verify_otp_row(db, normalized, otp, OTP_PURPOSE_VERIFY)
    if not row or row.couple_id != couple.id or row.partner_slot != partner_slot:
        raise ValueError("Invalid or expired code")

    if _email_used_by_other_partner(couple, partner_slot, normalized):
        raise ValueError(
            "This email is already registered for your partner's recovery. "
            "Each person needs their own recovery email."
        )

    email_field, verified_field, _, name_field = partner_slot_fields(partner_slot)
    setattr(couple, email_field, normalized)
    setattr(couple, verified_field, True)
    db.delete(row)
    log_audit(db, couple.id, "recovery_email_verified", f"{getattr(couple, name_field)}: {mask_email(normalized)}")
    db.flush()
    return mask_email(normalized)


def request_recovery_otp(db: Session, email: str) -> str:
    normalized = normalize_email(email)
    if not _EMAIL_RE.match(normalized):
        raise ValueError("Invalid email address")
    if _count_recent_otp_requests(db, normalized) >= MAX_OTP_REQUESTS_PER_HOUR:
        raise ValueError("Too many codes requested — try again in an hour")

    couple, slot = find_couple_by_verified_email(db, normalized)
    if couple:
        otp = generate_otp()
        _store_otp(
            db,
            email=normalized,
            otp=otp,
            couple_id=couple.id,
            purpose=OTP_PURPOSE_RECOVER,
            partner_slot=slot,
        )
        if email_configured():
            result = _send_otp_email(normalized, otp, verifying=False)
            if not result.ok:
                logger.warning("Recovery OTP email failed for %s: %s", mask_email(normalized), result.error)
        log_audit(db, couple.id, "recover_otp_sent", f"Recovery code sent to {mask_email(normalized)}")

    return mask_email(normalized)


def complete_recovery(db: Session, email: str, otp: str, password: str = "") -> str:
    normalized = normalize_email(email)
    couple, _ = find_couple_by_verified_email(db, normalized)
    if not couple:
        raise ValueError("Invalid or expired code")

    row = _verify_otp_row(db, normalized, otp, OTP_PURPOSE_RECOVER)
    if not row or row.couple_id != couple.id:
        raise ValueError("Invalid or expired code")

    if couple.password_hash and not verify_password(password, couple.password_hash):
        log_audit(db, couple.id, "recover_failed", f"Wrong password for {mask_email(normalized)}")
        raise ValueError("Incorrect space password")

    db.delete(row)
    result = _send_invite_email(normalized, couple.invite_code, couple.display_name)
    if not result.ok:
        raise RuntimeError(result.error or "Code verified but email could not be sent — try backup code")

    log_audit(db, couple.id, "recover_success", f"Invite code emailed to {mask_email(normalized)}")
    db.flush()
    return mask_email(normalized)


def generate_partner_backup_code(db: Session, couple: CoupleSpace, partner_slot: int) -> str:
    code = generate_backup_code()
    _, _, hash_field, name_field = partner_slot_fields(partner_slot)
    setattr(couple, hash_field, hash_backup_code(code))
    log_audit(
        db,
        couple.id,
        "backup_code_generated",
        f"New backup code for {getattr(couple, name_field)}",
    )
    db.flush()
    return code


def recover_with_backup_code(db: Session, code: str) -> tuple[str, str]:
    couple, slot = find_couple_by_backup_code(db, code)
    if not couple or not slot:
        raise ValueError("Invalid backup code")

    if _count_recent_backup_attempts(db, couple.id) >= MAX_BACKUP_ATTEMPTS_PER_HOUR:
        raise ValueError("Too many attempts — try again in an hour")

    _, _, _, name_field = partner_slot_fields(slot)
    log_audit(
        db,
        couple.id,
        "backup_recover_success",
        f"Invite code recovered via backup ({getattr(couple, name_field)})",
    )
    log_audit(db, couple.id, "backup_attempt", "Backup recovery used")
    db.flush()
    return couple.invite_code, couple.display_name


def recovery_settings(db: Session, couple: CoupleSpace) -> dict:
    def partner_info(slot: int) -> dict:
        email_field, verified_field, hash_field, name_field = partner_slot_fields(slot)
        email = getattr(couple, email_field) or ""
        verified = bool(getattr(couple, verified_field))
        return {
            "name": getattr(couple, name_field),
            "email_masked": mask_email(email) if verified and email else "",
            "verified": verified,
            "has_backup": bool(getattr(couple, hash_field)),
        }

    logs = (
        db.query(RecoveryAuditLog)
        .filter(RecoveryAuditLog.couple_id == couple.id)
        .order_by(RecoveryAuditLog.created_at.desc())
        .limit(20)
        .all()
    )
    return {
        "partner1": partner_info(1),
        "partner2": partner_info(2),
        "audit": [
            {
                "event_type": log.event_type,
                "detail": log.detail,
                "created_at": log.created_at.isoformat() + "Z" if log.created_at else "",
            }
            for log in logs
        ],
    }
