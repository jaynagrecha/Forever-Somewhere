from pathlib import Path

from app.core.config import settings


def couple_upload_dir(couple_id: int) -> Path:
    dest = Path(settings.upload_dir) / str(couple_id)
    dest.mkdir(parents=True, exist_ok=True)
    return dest
