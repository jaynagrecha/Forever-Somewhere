from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import Base, engine
from app.core.migrate import run_migrations
from app.routers import couples, extras, features, memories, misc, prompts, push, trip_pins
from app.static_files import INDEX_HTML, frontend_available, mount_frontend

Base.metadata.create_all(bind=engine)
run_migrations()

app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list(),
    allow_origin_regex=r"https://.*\.onrender\.com",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_path = Path(settings.upload_dir)
uploads_path.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_path)), name="uploads")

app.include_router(couples.router)
app.include_router(memories.router)
app.include_router(trip_pins.router)
app.include_router(misc.router_dreams)
app.include_router(misc.router_capsules)
app.include_router(misc.router_stats)
app.include_router(misc.router_import)
app.include_router(features.router)
app.include_router(push.router)
app.include_router(extras.router)
app.include_router(prompts.router)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "frontend": "ready" if frontend_available() else "missing",
    }


@app.get("/")
@app.head("/")
def root():
    """Render health checks hit GET / — must always return 2xx."""
    if frontend_available():
        return FileResponse(INDEX_HTML)
    return {"status": "ok", "message": "Forever Somewhere API running"}


mount_frontend(app)
