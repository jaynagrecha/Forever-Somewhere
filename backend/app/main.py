from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import Base, engine
from app.core.migrate import run_migrations
from app.core.vapid_store import ensure_vapid_keys
from app.routers import couples, extras, features, memories, misc, phase2, prompts, push, recovery, romance, trip_pins
from app.services.slip_match import warm_embedding_model
from app.static_files import INDEX_HTML, frontend_available, mount_frontend

Base.metadata.create_all(bind=engine)
run_migrations()
ensure_vapid_keys()

app = FastAPI(title=settings.app_name)


@app.on_event("startup")
def _startup_warm_embeddings() -> None:
    warm_embedding_model()

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
app.include_router(recovery.router)
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
app.include_router(romance.router)
app.include_router(phase2.router)


@app.get("/api/health")
def health() -> dict[str, str | bool]:
    from app.services.email_send import email_configured

    return {
        "status": "ok",
        "frontend": "ready" if frontend_available() else "missing",
        "recovery_email_configured": email_configured(),
    }


@app.get("/")
@app.head("/")
def root():
    """Render health checks hit GET / — must always return 2xx."""
    if frontend_available():
        return FileResponse(INDEX_HTML)
    return {"status": "ok", "message": "Forever Somewhere API running"}


mount_frontend(app)
