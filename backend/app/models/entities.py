from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class CoupleSpace(Base):
    """Private world for one couple — isolated by invite code + token."""

    __tablename__ = "couple_spaces"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    invite_code: Mapped[str] = mapped_column(String(16), unique=True, index=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    partner1_name: Mapped[str] = mapped_column(String(64), nullable=False)
    partner2_name: Mapped[str] = mapped_column(String(64), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), default="")
    password_hash: Mapped[str] = mapped_column(String(255), default="")
    partner1_recovery_email: Mapped[str] = mapped_column(String(255), default="")
    partner2_recovery_email: Mapped[str] = mapped_column(String(255), default="")
    partner1_recovery_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    partner2_recovery_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    partner1_backup_code_hash: Mapped[str] = mapped_column(String(64), default="")
    partner2_backup_code_hash: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RecoveryOtp(Base):
    __tablename__ = "recovery_otps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)
    otp_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    couple_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    purpose: Mapped[str] = mapped_column(String(32), nullable=False)
    partner_slot: Mapped[int | None] = mapped_column(Integer, nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class RecoveryAuditLog(Base):
    __tablename__ = "recovery_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    couple_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    detail: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CoupleSession(Base):
    """One login per device — many sessions per couple space."""

    __tablename__ = "couple_sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    couple_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Memory(Base):
    __tablename__ = "memories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    couple_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    memory_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    location: Mapped[str] = mapped_column(Text, default="")
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    occasion: Mapped[str] = mapped_column(String(255), default="")
    mood: Mapped[str] = mapped_column(String(255), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    photos_json: Mapped[str] = mapped_column(Text, default="[]")
    is_milestone: Mapped[bool] = mapped_column(Boolean, default=False)
    milestone_type: Mapped[str] = mapped_column(String(255), default="")
    playlist_url: Mapped[str] = mapped_column(String(512), default="")
    tags_json: Mapped[str] = mapped_column(Text, default="[]")
    album_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    voice_url: Mapped[str] = mapped_column(String(512), default="")
    before_photo_json: Mapped[str] = mapped_column(Text, default="")
    after_photo_json: Mapped[str] = mapped_column(Text, default="")
    added_by: Mapped[str] = mapped_column(String(64), default="Us")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class TripPin(Base):
    __tablename__ = "trip_pins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    couple_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    lat: Mapped[float] = mapped_column(Float, nullable=False)
    lng: Mapped[float] = mapped_column(Float, nullable=False)
    pin_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    occasion: Mapped[str] = mapped_column(String(255), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    source_dream_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Dream(Base):
    __tablename__ = "dreams"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    couple_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    location: Mapped[str] = mapped_column(String(255), default="")
    category: Mapped[str] = mapped_column(String(64), default="Trip")
    priority: Mapped[str] = mapped_column(String(32), default="Medium")
    target_year: Mapped[str] = mapped_column(String(16), default="")
    notes: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(32), default="Wishlist")
    budget: Mapped[str] = mapped_column(String(64), default="")
    checklist_json: Mapped[str] = mapped_column(Text, default="[]")
    saved_amount: Mapped[float] = mapped_column(Float, default=0.0)
    wishlist_url: Mapped[str] = mapped_column(String(512), default="")
    votes_json: Mapped[str] = mapped_column(Text, default="{}")
    created_by: Mapped[str] = mapped_column(String(64), default="Us")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class LoveNote(Base):
    __tablename__ = "love_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    couple_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    author: Mapped[str] = mapped_column(String(64), default="Us")
    mood: Mapped[str] = mapped_column(String(64), default="")
    voice_url: Mapped[str] = mapped_column(String(512), default="")
    letter_template: Mapped[str] = mapped_column(String(64), default="")
    reveal_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ImportantDate(Base):
    __tablename__ = "important_dates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    couple_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    event_date: Mapped[date] = mapped_column(Date, nullable=False)
    recurring: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class TimeCapsule(Base):
    __tablename__ = "time_capsules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    couple_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    unlock_date: Mapped[date] = mapped_column(Date, nullable=False)
    author: Mapped[str] = mapped_column(String(64), default="Us")
    media_url: Mapped[str] = mapped_column(String(512), default="")
    media_type: Mapped[str] = mapped_column(String(32), default="")
    is_opened: Mapped[bool] = mapped_column(Boolean, default=False)
    opened_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    capsule_type: Mapped[str] = mapped_column(String(32), default="standard")
    year_index: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DatePromptAnswer(Base):
    __tablename__ = "date_prompt_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    couple_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    prompt_id: Mapped[str] = mapped_column(String(64), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    author: Mapped[str] = mapped_column(String(64), default="Us")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    couple_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    endpoint: Mapped[str] = mapped_column(Text, nullable=False)
    p256dh: Mapped[str] = mapped_column(String(255), nullable=False)
    auth: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_name: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class TripAlbum(Base):
    __tablename__ = "trip_albums"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    couple_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    cover_url: Mapped[str] = mapped_column(String(512), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ActivityEvent(Base):
    __tablename__ = "activity_events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    couple_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    kind: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    author: Mapped[str] = mapped_column(String(64), default="Us")
    entity_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    route: Mapped[str] = mapped_column(String(255), default="/dashboard")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DailyQuestionAnswer(Base):
    __tablename__ = "daily_question_answers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    couple_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    question_date: Mapped[date] = mapped_column(Date, nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    author: Mapped[str] = mapped_column(String(64), nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class SeasonEntry(Base):
    __tablename__ = "season_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    couple_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    author: Mapped[str] = mapped_column(String(64), nullable=False)
    period_type: Mapped[str] = mapped_column(String(16), nullable=False)
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    color: Mapped[str] = mapped_column(String(32), default="#ff4d6d")
    photo_url: Mapped[str] = mapped_column(String(512), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )


class CoupleMeta(Base):
    __tablename__ = "couple_meta"

    couple_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    mood_board_json: Mapped[str] = mapped_column(Text, default="[]")
    quiz_results_json: Mapped[str] = mapped_column(Text, default="[]")
    phase2_prefs_json: Mapped[str] = mapped_column(Text, default="{}")
    custom_deck_json: Mapped[str] = mapped_column(Text, default="[]")


class NoteReaction(Base):
    __tablename__ = "note_reactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    couple_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    note_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    author: Mapped[str] = mapped_column(String(64), nullable=False)
    emoji: Mapped[str] = mapped_column(String(8), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class StolenNote(Base):
    __tablename__ = "stolen_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    couple_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    owner_name: Mapped[str] = mapped_column(String(64), nullable=False)
    note_id: Mapped[int] = mapped_column(Integer, nullable=False)
    stolen_until: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class DesireSlip(Base):
    __tablename__ = "desire_slips"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    couple_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    author: Mapped[str] = mapped_column(String(64), nullable=False)
    slip_type: Mapped[str] = mapped_column(String(32), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    chip: Mapped[str] = mapped_column(String(64), default="")
    body_embedding_json: Mapped[str] = mapped_column(Text, default="")
    anonymous: Mapped[bool] = mapped_column(Boolean, default=False)
    matched_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    revealed: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class VaultEntry(Base):
    __tablename__ = "vault_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    couple_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    author: Mapped[str] = mapped_column(String(64), nullable=False)
    entry_kind: Mapped[str] = mapped_column(String(32), default="fantasy")
    title: Mapped[str] = mapped_column(String(255), default="")
    body: Mapped[str] = mapped_column(Text, nullable=False)
    visibility: Mapped[str] = mapped_column(String(32), default="private")
    voice_url: Mapped[str] = mapped_column(String(512), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class EnergyStatus(Base):
    __tablename__ = "energy_status"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    couple_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    author: Mapped[str] = mapped_column(String(64), nullable=False)
    energy: Mapped[str] = mapped_column(String(32), default="playful")
    surprises: Mapped[str] = mapped_column(String(32), default="ask")
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class IntimacyCheckIn(Base):
    __tablename__ = "intimacy_checkins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    couple_id: Mapped[int] = mapped_column(Integer, index=True, nullable=False)
    author: Mapped[str] = mapped_column(String(64), nullable=False)
    rating: Mapped[str] = mapped_column(String(32), nullable=False)
    note: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
