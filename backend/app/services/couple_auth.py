"""Invite-code couple spaces — token + optional password (PBKDF2)."""
import hashlib
import secrets
import string


def generate_invite_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    raw = "".join(secrets.choice(alphabet) for _ in range(8))
    return f"{raw[:4]}-{raw[4:]}"


def issue_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(32)
    return raw, hash_token(raw)


def hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def verify_token(raw: str, token_hash: str) -> bool:
    if not raw or not token_hash:
        return False
    return secrets.compare_digest(hash_token(raw), token_hash)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000)
    return f"{salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    if not stored:
        return True
    if not password:
        return False
    try:
        salt, hx = stored.split("$", 1)
    except ValueError:
        return False
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 120_000)
    return secrets.compare_digest(digest.hex(), hx)


def normalize_invite_code(code: str) -> str:
    return code.strip().upper().replace(" ", "")
