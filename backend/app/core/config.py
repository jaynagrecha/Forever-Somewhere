from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Forever Somewhere"
    database_url: str = "sqlite:///./forever_somewhere.db"
    upload_dir: Path = Path("uploads")
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    vapid_public_key: str = ""
    vapid_private_key: str = ""
    vapid_claims_email: str = "mailto:jay@forever-somewhere.local"

    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
settings.upload_dir.mkdir(parents=True, exist_ok=True)
