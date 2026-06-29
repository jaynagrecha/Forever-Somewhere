"""Transactional email via Resend HTTP API."""
import json
import logging
import urllib.error
import urllib.request

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(*, to: str, subject: str, html: str, text: str = "") -> bool:
    if not settings.resend_api_key:
        logger.warning("RESEND_API_KEY not set — email not sent to %s: %s", to, subject)
        return False

    payload = {
        "from": settings.recovery_from_email,
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if text:
        payload["text"] = text

    req = urllib.request.Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {settings.resend_api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return 200 <= resp.status < 300
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")[:300]
        logger.error("Resend HTTP %s: %s", exc.code, body)
        return False
    except Exception as exc:
        logger.error("Resend send failed: %s", exc)
        return False
