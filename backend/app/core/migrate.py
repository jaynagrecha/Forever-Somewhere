from sqlalchemy import inspect, text

from app.core.database import engine


def run_migrations() -> None:
    """Add new columns/tables for existing SQLite databases."""
    with engine.connect() as conn:
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        if "memories" in tables:
            cols = {c["name"] for c in inspector.get_columns("memories")}
            if "playlist_url" not in cols:
                conn.execute(text("ALTER TABLE memories ADD COLUMN playlist_url VARCHAR(512) DEFAULT ''"))
            if "tags_json" not in cols:
                conn.execute(text("ALTER TABLE memories ADD COLUMN tags_json TEXT DEFAULT '[]'"))

        if "dreams" in tables:
            cols = {c["name"] for c in inspector.get_columns("dreams")}
            if "budget" not in cols:
                conn.execute(text("ALTER TABLE dreams ADD COLUMN budget VARCHAR(64) DEFAULT ''"))
            if "checklist_json" not in cols:
                conn.execute(text("ALTER TABLE dreams ADD COLUMN checklist_json TEXT DEFAULT '[]'"))

        if "time_capsules" in tables:
            cols = {c["name"] for c in inspector.get_columns("time_capsules")}
            if "media_url" not in cols:
                conn.execute(text("ALTER TABLE time_capsules ADD COLUMN media_url VARCHAR(512) DEFAULT ''"))
            if "media_type" not in cols:
                conn.execute(text("ALTER TABLE time_capsules ADD COLUMN media_type VARCHAR(32) DEFAULT ''"))

        conn.commit()
