from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


def mount_frontend(app: FastAPI) -> None:
    """Serve Vite production build — same origin as API (fixes iOS PWA sync)."""
    if not STATIC_DIR.is_dir():
        return

    @app.get("/{full_path:path}", include_in_schema=False)
    async def spa_fallback(full_path: str) -> FileResponse:
        if full_path.startswith("api/") or full_path.startswith("uploads/"):
            raise HTTPException(status_code=404)

        if full_path in ("", "index.html"):
            return FileResponse(STATIC_DIR / "index.html")

        candidate = STATIC_DIR / full_path
        if candidate.is_file():
            return FileResponse(candidate)

        return FileResponse(STATIC_DIR / "index.html")
