from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Forever Somewhere"
    database_url: str = "sqlite:///./forever_somewhere.db"
    upload_dir: Path = Path("uploads")
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    public_app_url: str = "https://forever-somewhere-web.onrender.com"
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    # Apple Web Push rejects mailto:@localhost and *.local — use a real https URL or email.
    vapid_claims_email: str = "https://forever-somewhere-web.onrender.com"
    resend_api_key: str = ""
    recovery_from_email: str = "Forever Somewhere <onboarding@resend.dev>"
    recovery_otp_ttl_minutes: int = 15

    def cors_origin_list(self) -> list[str]:
        origins = []
        for o in self.cors_origins.split(","):
            o = o.strip()
            if not o:
                continue
            if not o.startswith("http"):
                o = f"https://{o}"
            origins.append(o)
        for local in ("http://localhost:5173", "http://127.0.0.1:5173"):
            if local not in origins:
                origins.append(local)
        # iOS Safari "Add to Home Screen" sends Origin: null for cross-origin fetch
        if "null" not in origins:
            origins.append("null")
        return origins


settings = Settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)
