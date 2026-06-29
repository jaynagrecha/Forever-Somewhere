"""Transactional email — SMTP (any recipient) or Resend HTTP API."""
import json
import logging
import re
import smtplib
import urllib.error
import urllib.request
from dataclasses import dataclass
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.core.config import settings

logger = logging.getLogger(__name__)

_FROM_ADDR_RE = re.compile(r"^(.+?)\s*<([^>]+)>$")


@dataclass(frozen=True)
class SendResult:
    ok: bool
    error: str = ""


def _parse_from_address(from_field: str) -> tuple[str, str]:
    """Return (display_from_header, envelope_from_email)."""
    raw = from_field.strip()
    match = _FROM_ADDR_RE.match(raw)
    if match:
        return raw, match.group(2).strip()
    return raw, raw


def _parse_resend_error(body: str) -> str:
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        return body.strip()[:240] if body.strip() else "Email provider rejected the request"

    message = data.get("message")
    if isinstance(message, str) and message.strip():
        return message.strip()

    detail = data.get("detail")
    if isinstance(detail, str) and detail.strip():
        return detail.strip()

    return "Email provider rejected the request"


def smtp_configured() -> bool:
    return bool(settings.smtp_host.strip() and settings.smtp_user.strip() and settings.smtp_password.strip())


def resend_configured() -> bool:
    return bool(settings.resend_api_key.strip())


def active_email_provider() -> str:
    provider = settings.email_provider.strip().lower()
    if provider == "smtp":
        return "smtp" if smtp_configured() else "none"
    if provider == "resend":
        return "resend" if resend_configured() else "none"
    if smtp_configured():
        return "smtp"
    if resend_configured():
        return "resend"
    return "none"


def email_configured() -> bool:
    return active_email_provider() != "none"


def _send_via_smtp(*, to: str, subject: str, html: str, text: str) -> SendResult:
    from_header, envelope_from = _parse_from_address(settings.recovery_from_email)

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_header
    msg["To"] = to
    if text:
        msg.attach(MIMEText(text, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=12) as server:
            if settings.smtp_use_tls:
                server.starttls()
            server.login(settings.smtp_user, settings.smtp_password)
            server.sendmail(envelope_from, [to], msg.as_string())
        return SendResult(ok=True)
    except smtplib.SMTPAuthenticationError:
        return SendResult(
            ok=False,
            error="SMTP login failed — check SMTP_USER and SMTP_PASSWORD (Gmail needs an App Password, not your normal password).",
        )
    except Exception as exc:
        logger.error("SMTP send failed: %s", exc)
        return SendResult(ok=False, error=f"SMTP error: {exc}"[:240])


def _send_via_resend(*, to: str, subject: str, html: str, text: str) -> SendResult:
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
        with urllib.request.urlopen(req, timeout=12) as resp:
            if 200 <= resp.status < 300:
                return SendResult(ok=True)
            body = resp.read().decode("utf-8", errors="replace")
            logger.error("Resend HTTP %s: %s", resp.status, body[:300])
            return SendResult(ok=False, error=_parse_resend_error(body))
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        logger.error("Resend HTTP %s: %s", exc.code, body[:300])
        parsed = _parse_resend_error(body)
        if exc.code == 403 and "resend.dev" in settings.recovery_from_email:
            parsed = (
                f"{parsed} "
                "Add Gmail SMTP env vars on Render (SMTP_HOST, SMTP_USER, SMTP_PASSWORD) "
                "or verify your own domain in Resend."
            )
        return SendResult(ok=False, error=parsed)
    except Exception as exc:
        logger.error("Resend send failed: %s", exc)
        return SendResult(ok=False, error=str(exc)[:240])


def send_email(*, to: str, subject: str, html: str, text: str = "") -> SendResult:
    provider = active_email_provider()
    if provider == "none":
        return SendResult(
            ok=False,
            error=(
                "Email is not configured on the API server. "
                "Set SMTP_HOST, SMTP_USER, SMTP_PASSWORD (recommended — works for any inbox), "
                "or RESEND_API_KEY with a verified domain."
            ),
        )
    if provider == "smtp":
        return _send_via_smtp(to=to, subject=subject, html=html, text=text)
    return _send_via_resend(to=to, subject=subject, html=html, text=text)
