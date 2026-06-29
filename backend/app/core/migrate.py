import logging

from sqlalchemy import inspect, text

from app.core.database import engine
from app.services.couple_auth import generate_invite_code, issue_token

logger = logging.getLogger(__name__)

TENANT_TABLES = (
    "memories",
    "trip_pins",
    "dreams",
    "love_notes",
    "important_dates",
    "time_capsules",
    "date_prompt_answers",
    "push_subscriptions",
    "trip_albums",
    "activity_events",
    "daily_question_answers",
)


def _add_col(conn, table: str, col: str, ddl: str, cols: set[str]) -> None:
    if col not in cols:
        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {ddl}"))


def _backfill_legacy_couple(conn) -> None:
    """Assign orphan rows to a legacy couple space (existing single-tenant data)."""
    has_spaces = conn.execute(text("SELECT COUNT(*) FROM couple_spaces")).scalar() or 0
    if has_spaces:
        return

    tables = inspect(engine).get_table_names()
    any_data = False
    for t in TENANT_TABLES:
        if t in tables:
            n = conn.execute(text(f"SELECT COUNT(*) FROM {t}")).scalar() or 0
            if n:
                any_data = True
                break

    if not any_data and "couple_meta" in tables:
        any_data = (conn.execute(text("SELECT COUNT(*) FROM couple_meta")).scalar() or 0) > 0

    if not any_data:
        return

    invite = generate_invite_code()
    raw, token_hash = issue_token()
    conn.execute(
        text(
            """
            INSERT INTO couple_spaces
            (invite_code, display_name, partner1_name, partner2_name, token_hash, password_hash, created_at)
            VALUES (:invite, :name, :p1, :p2, :hash, '', datetime('now'))
            """
        ),
        {
            "invite": invite,
            "name": "Our Space",
            "p1": "Partner 1",
            "p2": "Partner 2",
            "hash": token_hash,
        },
    )
    couple_id = conn.execute(text("SELECT id FROM couple_spaces ORDER BY id LIMIT 1")).scalar()

    for t in TENANT_TABLES:
        if t in tables:
            conn.execute(text(f"UPDATE {t} SET couple_id = :cid WHERE couple_id IS NULL"), {"cid": couple_id})

    if "couple_meta" in tables:
        cols = {c["name"] for c in inspect(engine).get_columns("couple_meta")}
        if "couple_id" in cols:
            old = conn.execute(text("SELECT id, mood_board_json, quiz_results_json FROM couple_meta LIMIT 1")).fetchone()
            if old:
                conn.execute(text("DELETE FROM couple_meta"))
                conn.execute(
                    text(
                        "INSERT INTO couple_meta (couple_id, mood_board_json, quiz_results_json) "
                        "VALUES (:cid, :m, :q)"
                    ),
                    {"cid": couple_id, "m": old[1] or "[]", "q": old[2] or "[]"},
                )
        else:
            conn.execute(
                text(
                    "INSERT OR IGNORE INTO couple_meta (couple_id, mood_board_json, quiz_results_json) "
                    "VALUES (:cid, '[]', '[]')"
                ),
                {"cid": couple_id},
            )

    logger.warning(
        "Legacy data migrated to couple space id=%s invite=%s — partners must join with this code",
        couple_id,
        invite,
    )


def run_migrations() -> None:
    """Add new columns/tables for existing SQLite databases."""
    with engine.connect() as conn:
        inspector = inspect(engine)
        tables = inspector.get_table_names()

        if "memories" in tables:
            cols = {c["name"] for c in inspector.get_columns("memories")}
            _add_col(conn, "memories", "playlist_url", "playlist_url VARCHAR(512) DEFAULT ''", cols)
            _add_col(conn, "memories", "tags_json", "tags_json TEXT DEFAULT '[]'", cols)
            _add_col(conn, "memories", "album_id", "album_id INTEGER", cols)
            _add_col(conn, "memories", "voice_url", "voice_url VARCHAR(512) DEFAULT ''", cols)
            _add_col(conn, "memories", "before_photo_json", "before_photo_json TEXT DEFAULT ''", cols)
            _add_col(conn, "memories", "after_photo_json", "after_photo_json TEXT DEFAULT ''", cols)
            _add_col(conn, "memories", "couple_id", "couple_id INTEGER", cols)

        if "dreams" in tables:
            cols = {c["name"] for c in inspector.get_columns("dreams")}
            _add_col(conn, "dreams", "budget", "budget VARCHAR(64) DEFAULT ''", cols)
            _add_col(conn, "dreams", "checklist_json", "checklist_json TEXT DEFAULT '[]'", cols)
            _add_col(conn, "dreams", "saved_amount", "saved_amount FLOAT DEFAULT 0", cols)
            _add_col(conn, "dreams", "wishlist_url", "wishlist_url VARCHAR(512) DEFAULT ''", cols)
            _add_col(conn, "dreams", "votes_json", "votes_json TEXT DEFAULT '{}'", cols)
            _add_col(conn, "dreams", "couple_id", "couple_id INTEGER", cols)

        if "time_capsules" in tables:
            cols = {c["name"] for c in inspector.get_columns("time_capsules")}
            _add_col(conn, "time_capsules", "media_url", "media_url VARCHAR(512) DEFAULT ''", cols)
            _add_col(conn, "time_capsules", "media_type", "media_type VARCHAR(32) DEFAULT ''", cols)
            _add_col(conn, "time_capsules", "couple_id", "couple_id INTEGER", cols)

        if "love_notes" in tables:
            cols = {c["name"] for c in inspector.get_columns("love_notes")}
            _add_col(conn, "love_notes", "voice_url", "voice_url VARCHAR(512) DEFAULT ''", cols)
            _add_col(conn, "love_notes", "letter_template", "letter_template VARCHAR(64) DEFAULT ''", cols)
            _add_col(conn, "love_notes", "reveal_date", "reveal_date DATE", cols)
            _add_col(conn, "love_notes", "couple_id", "couple_id INTEGER", cols)

        for table in (
            "trip_pins",
            "important_dates",
            "date_prompt_answers",
            "push_subscriptions",
            "trip_albums",
            "activity_events",
            "daily_question_answers",
        ):
            if table in tables:
                cols = {c["name"] for c in inspector.get_columns(table)}
                _add_col(conn, table, "couple_id", "couple_id INTEGER", cols)

        if "couple_meta" in tables:
            cols = {c["name"] for c in inspector.get_columns("couple_meta")}
            if "couple_id" not in cols and "id" in cols:
                conn.execute(text("ALTER TABLE couple_meta RENAME TO couple_meta_old"))
                conn.execute(
                    text(
                        """
                        CREATE TABLE couple_meta (
                            couple_id INTEGER PRIMARY KEY,
                            mood_board_json TEXT DEFAULT '[]',
                            quiz_results_json TEXT DEFAULT '[]'
                        )
                        """
                    )
                )
                conn.execute(
                    text(
                        """
                        INSERT INTO couple_meta (couple_id, mood_board_json, quiz_results_json)
                        SELECT 1, mood_board_json, quiz_results_json FROM couple_meta_old LIMIT 1
                        """
                    )
                )
                conn.execute(text("DROP TABLE couple_meta_old"))

        conn.commit()

        tables = inspect(engine).get_table_names()
        if "couple_spaces" in tables:
            _backfill_legacy_couple(conn)
            conn.commit()
