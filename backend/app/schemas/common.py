import json
from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator


class PhotoRef(BaseModel):
    id: str | int
    name: str
    url: str = ""
    data: str = ""


class MemoryBase(BaseModel):
    title: str
    date: str = ""
    location: str = ""
    lat: float | None = None
    lng: float | None = None
    occasion: str = ""
    mood: str = ""
    notes: str = ""
    photos: list[PhotoRef] = Field(default_factory=list)
    is_milestone: bool = False
    milestone_type: str = ""
    playlist_url: str = ""
    tags: list[str] = Field(default_factory=list)
    album_id: int | None = None
    voice_url: str = ""
    before_photo: dict[str, Any] | None = None
    after_photo: dict[str, Any] | None = None
    added_by: str = "Us"


class MemoryCreate(MemoryBase):
    pass


class MemoryUpdate(BaseModel):
    title: str | None = None
    date: str | None = None
    location: str | None = None
    lat: float | None = None
    lng: float | None = None
    occasion: str | None = None
    mood: str | None = None
    notes: str | None = None
    photos: list[PhotoRef] | None = None
    is_milestone: bool | None = None
    milestone_type: str | None = None
    playlist_url: str | None = None
    tags: list[str] | None = None
    album_id: int | None = None
    voice_url: str | None = None
    before_photo: dict[str, Any] | None = None
    after_photo: dict[str, Any] | None = None


class MemoryOut(MemoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime | None = None

    @classmethod
    def from_orm_row(cls, row: Any) -> "MemoryOut":
        photos = json.loads(row.photos_json or "[]")
        tags = json.loads(getattr(row, "tags_json", None) or "[]")
        return cls(
            id=row.id,
            title=row.title,
            date=row.memory_date.isoformat() if row.memory_date else "",
            location=row.location,
            lat=row.lat,
            lng=row.lng,
            occasion=row.occasion,
            mood=row.mood,
            notes=row.notes,
            photos=photos,
            is_milestone=row.is_milestone,
            milestone_type=row.milestone_type,
            playlist_url=getattr(row, "playlist_url", "") or "",
            tags=tags,
            album_id=getattr(row, "album_id", None),
            voice_url=getattr(row, "voice_url", "") or "",
            before_photo=json.loads(getattr(row, "before_photo_json", None) or "null") or None,
            after_photo=json.loads(getattr(row, "after_photo_json", None) or "null") or None,
            created_at=row.created_at,
        )


class TripPinBase(BaseModel):
    title: str
    lat: float
    lng: float
    date: str = ""
    occasion: str = ""
    notes: str = ""
    source_dream_id: int | None = None


class TripPinCreate(TripPinBase):
    pass


class TripPinOut(TripPinBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime | None = None

    @classmethod
    def from_orm_row(cls, row: Any) -> "TripPinOut":
        return cls(
            id=row.id,
            title=row.title,
            lat=row.lat,
            lng=row.lng,
            date=row.pin_date.isoformat() if row.pin_date else "",
            occasion=row.occasion,
            notes=row.notes,
            source_dream_id=row.source_dream_id,
            created_at=row.created_at,
        )


class DreamBase(BaseModel):
    title: str
    location: str = ""
    category: str = "Trip"
    priority: str = "Medium"
    target_year: str = ""
    notes: str = ""
    status: str = "Wishlist"
    budget: str = ""
    checklist: list[dict[str, Any]] = Field(default_factory=list)
    saved_amount: float = 0.0
    wishlist_url: str = ""
    votes: dict[str, int] = Field(default_factory=dict)


class DreamCreate(DreamBase):
    pass


class DreamUpdate(BaseModel):
    title: str | None = None
    location: str | None = None
    category: str | None = None
    priority: str | None = None
    target_year: str | None = None
    notes: str | None = None
    status: str | None = None
    budget: str | None = None
    checklist: list[dict[str, Any]] | None = None
    saved_amount: float | None = None
    wishlist_url: str | None = None
    votes: dict[str, int] | None = None


class DreamOut(DreamBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime | None = None

    @classmethod
    def from_orm_row(cls, row: Any) -> "DreamOut":
        checklist = json.loads(getattr(row, "checklist_json", None) or "[]")
        votes = json.loads(getattr(row, "votes_json", None) or "{}")
        return cls(
            id=row.id,
            title=row.title,
            location=row.location,
            category=row.category,
            priority=row.priority,
            target_year=row.target_year,
            notes=row.notes,
            status=row.status,
            budget=getattr(row, "budget", "") or "",
            checklist=checklist,
            saved_amount=float(getattr(row, "saved_amount", 0) or 0),
            wishlist_url=getattr(row, "wishlist_url", "") or "",
            votes=votes,
            created_at=row.created_at,
        )


class CapsuleBase(BaseModel):
    title: str
    content: str = ""
    unlock_date: date
    author: str = "Us"
    media_url: str = ""
    media_type: str = ""


class CapsuleCreate(CapsuleBase):
    pass


class CapsuleOut(CapsuleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_opened: bool
    opened_at: datetime | None = None
    created_at: datetime | None = None
    is_locked: bool = False
    days_until_unlock: int | None = None
    content: str = ""


class StatsOut(BaseModel):
    memories_count: int
    trip_pins_count: int
    dreams_count: int
    capsules_count: int
    places_on_map: int
    dreams_completed: int
    milestones_count: int
    bucket_progress: float = 0
    love_notes_count: int = 0


class LoveNoteCreate(BaseModel):
    content: str
    author: str = "Us"
    mood: str = ""
    voice_url: str = ""
    letter_template: str = ""
    reveal_date: str = ""


class LoveNoteOut(LoveNoteCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime | None = None

    @classmethod
    def from_row(cls, row: Any) -> "LoveNoteOut":
        return cls(
            id=row.id,
            content=row.content,
            author=row.author,
            mood=row.mood or "",
            voice_url=getattr(row, "voice_url", "") or "",
            letter_template=getattr(row, "letter_template", "") or "",
            reveal_date=row.reveal_date.isoformat() if getattr(row, "reveal_date", None) else "",
            created_at=row.created_at,
        )


class ImportantDateCreate(BaseModel):
    title: str
    event_date: date
    recurring: bool = True


class ImportantDateOut(ImportantDateCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    days_until: int | None = None


class UpcomingItem(BaseModel):
    kind: str
    title: str
    date: str
    days_until: int
    route: str = ""


class InsightsOut(BaseModel):
    on_this_day_count: int
    bucket_progress: float
    next_anniversary: ImportantDateOut | None = None
    upcoming: list[UpcomingItem] = Field(default_factory=list)


class SearchResult(BaseModel):
    kind: str
    id: int
    title: str
    subtitle: str = ""
    route: str


class CalendarEvent(BaseModel):
    id: str
    kind: str
    title: str
    date: str
    route: str
    color: str = ""


class NotificationItem(BaseModel):
    title: str
    body: str
    tag: str
    route: str = "/dashboard"


class PromptAnswerCreate(BaseModel):
    prompt_id: str
    question: str
    answer: str
    author: str = "Us"


class PromptAnswerOut(PromptAnswerCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime | None = None


class PushSubscribePayload(BaseModel):
    endpoint: str
    keys: dict[str, str]
    owner_name: str = ""


class OnThisDayOut(BaseModel):
    memories: list[MemoryOut]


class ImportPayload(BaseModel):
    memories: list[MemoryCreate] = Field(default_factory=list)
    places: list[TripPinCreate] = Field(default_factory=list)
    dreams: list[DreamCreate] = Field(default_factory=list)


def parse_optional_date(value: str) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value)
