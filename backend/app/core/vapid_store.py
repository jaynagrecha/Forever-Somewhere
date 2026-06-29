"""Persist or generate VAPID keys so Web Push works on Render without manual env setup."""
import base64
import json
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

from app.core.config import settings

_KEY_FILE = Path("/data/vapid_keys.json")
_LOCAL_FILE = Path("vapid_keys.json")


def _key_path() -> Path:
    if _KEY_FILE.parent.exists():
        return _KEY_FILE
    return _LOCAL_FILE


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _generate_keypair() -> tuple[str, str]:
    private_key = ec.generate_private_key(ec.SECP256R1())
    public_key = private_key.public_key()

    private_pem = private_key.private_bytes(
        serialization.Encoding.PEM,
        serialization.PrivateFormat.PKCS8,
        serialization.NoEncryption(),
    ).decode("utf-8")

    raw_pub = public_key.public_bytes(
        serialization.Encoding.X962,
        serialization.PublicFormat.UncompressedPoint,
    )
    return _b64url(raw_pub), private_pem


def ensure_vapid_keys() -> None:
    if settings.vapid_public_key and settings.vapid_private_key:
        return

    path = _key_path()
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            settings.vapid_public_key = data.get("public_key", "")
            settings.vapid_private_key = data.get("private_key", "")
            if settings.vapid_public_key and settings.vapid_private_key:
                return
        except (json.JSONDecodeError, OSError):
            pass

    public_key, private_key = _generate_keypair()
    settings.vapid_public_key = public_key
    settings.vapid_private_key = private_key

    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(
            json.dumps({"public_key": public_key, "private_key": private_key}),
            encoding="utf-8",
        )
    except OSError:
        pass
