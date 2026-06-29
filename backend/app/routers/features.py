import json
from datetime import date, datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.core.author_guard import assert_can_modify, assert_posts_as_self
from app.core.datetime_utils import days_until
from app.core.database import get_db
from app.deps.couple import get_current_couple
from app.models.entities import (
    CoupleSpace,
    DatePromptAnswer,
    Dream,
    ImportantDate,
    LoveNote,
    Memory,
    TimeCapsule,
    TripPin,
)
from app.services.activity import log_activity
from app.schemas.common import (
    CalendarEvent,
    DreamOut,
    ImportantDateCreate,
    ImportantDateOut,
    InsightsOut,
    LoveNoteCreate,
    LoveNoteOut,
    MemoryOut,
    NotificationItem,
    SearchResult,
    TripPinOut,
    UpcomingItem,
    parse_optional_date,
)

router = APIRouter(prefix="/api", tags=["features"])


def _bucket_progress(db: Session, couple_id: int) -> float:
    total = db.query(Dream).filter(Dream.couple_id == couple_id).count()
    if total == 0:
        return 0.0
    done = db.query(Dream).filter(Dream.couple_id == couple_id, Dream.status == "Completed").count()
    return round(done / total * 100, 1)


@router.get("/love-notes", response_model=list[LoveNoteOut])
def list_love_notes(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> list[LoveNoteOut]:
    rows = (
        db.query(LoveNote)
        .filter(LoveNote.couple_id == couple.id)
        .order_by(LoveNote.created_at.desc())
        .all()
    )
    return [LoveNoteOut.from_row(r) for r in rows]


@router.post("/love-notes", response_model=LoveNoteOut, status_code=201)
def create_love_note(
    payload: LoveNoteCreate,
    actor: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> LoveNoteOut:
    assert_posts_as_self(actor, payload.author, couple)
    data = payload.model_dump()
    data.pop("reveal_date", None)
    row = LoveNote(couple_id=couple.id, **data, reveal_date=None)
    db.add(row)
    db.flush()
    log_activity(
        db,
        couple_id=couple.id,
        kind="love_note",
        title=payload.content[:60],
        author=payload.author,
        entity_id=row.id,
        route="/forever",
    )
    db.commit()
    db.refresh(row)
    return LoveNoteOut.from_row(row)


@router.delete("/love-notes/{note_id}", status_code=204)
def delete_love_note(
    note_id: int,
    author: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> None:
    row = db.query(LoveNote).filter(LoveNote.couple_id == couple.id, LoveNote.id == note_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Note not found")
    assert_can_modify(author, row.author, couple)
    db.delete(row)
    db.commit()


@router.get("/important-dates", response_model=list[ImportantDateOut])
def list_important_dates(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> list[ImportantDateOut]:
    rows = (
        db.query(ImportantDate)
        .filter(ImportantDate.couple_id == couple.id)
        .order_by(ImportantDate.event_date.asc())
        .all()
    )
    return [
        ImportantDateOut(
            id=r.id,
            title=r.title,
            event_date=r.event_date,
            recurring=r.recurring,
            days_until=days_until(r.event_date, r.recurring),
        )
        for r in rows
    ]


@router.post("/important-dates", response_model=ImportantDateOut, status_code=201)
def create_important_date(
    payload: ImportantDateCreate,
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> ImportantDateOut:
    row = ImportantDate(couple_id=couple.id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return ImportantDateOut(
        id=row.id,
        title=row.title,
        event_date=row.event_date,
        recurring=row.recurring,
        days_until=days_until(row.event_date, row.recurring),
    )


@router.delete("/important-dates/{item_id}", status_code=204)
def delete_important_date(
    item_id: int,
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> None:
    row = (
        db.query(ImportantDate)
        .filter(ImportantDate.couple_id == couple.id, ImportantDate.id == item_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Date not found")
    db.delete(row)
    db.commit()


@router.get("/insights", response_model=InsightsOut)
def get_insights(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> InsightsOut:
    today = date.today()
    cid = couple.id
    memories = db.query(Memory).filter(Memory.couple_id == cid).all()
    on_this_day = [
        m
        for m in memories
        if m.memory_date and m.memory_date.month == today.month and m.memory_date.day == today.day
    ]

    upcoming: list[UpcomingItem] = []

    for c in db.query(TimeCapsule).filter(TimeCapsule.couple_id == cid, TimeCapsule.is_opened.is_(False)).all():
        days = (c.unlock_date - today).days
        upcoming.append(
            UpcomingItem(
                kind="capsule",
                title=c.title,
                date=c.unlock_date.isoformat(),
                days_until=days,
                route="/forever",
            )
        )

    for d in db.query(Dream).filter(Dream.couple_id == cid, Dream.status == "Planned").all():
        upcoming.append(
            UpcomingItem(
                kind="trip",
                title=d.title,
                date=d.target_year or "Planned",
                days_until=999,
                route="/someday",
            )
        )

    for row in db.query(ImportantDate).filter(ImportantDate.couple_id == cid).all():
        days = days_until(row.event_date, row.recurring)
        upcoming.append(
            UpcomingItem(
                kind="anniversary",
                title=row.title,
                date=row.event_date.isoformat(),
                days_until=days,
                route="/settings",
            )
        )

    for m in memories:
        if m.is_milestone and m.memory_date:
            days = days_until(m.memory_date, recurring=True)
            upcoming.append(
                UpcomingItem(
                    kind="milestone",
                    title=m.milestone_type or m.title,
                    date=m.memory_date.isoformat(),
                    days_until=days,
                    route="/moments",
                )
            )

    upcoming.sort(key=lambda x: x.days_until)

    next_ann: ImportantDateOut | None = None
    dates = db.query(ImportantDate).filter(ImportantDate.couple_id == cid).all()
    if dates:
        nearest = min(dates, key=lambda r: days_until(r.event_date, r.recurring))
        next_ann = ImportantDateOut(
            id=nearest.id,
            title=nearest.title,
            event_date=nearest.event_date,
            recurring=nearest.recurring,
            days_until=days_until(nearest.event_date, nearest.recurring),
        )

    return InsightsOut(
        on_this_day_count=len(on_this_day),
        bucket_progress=_bucket_progress(db, cid),
        next_anniversary=next_ann,
        upcoming=upcoming[:12],
    )


@router.get("/search", response_model=list[SearchResult])
def search(
    q: str = Query(min_length=1),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> list[SearchResult]:
    term = q.lower()
    cid = couple.id
    results: list[SearchResult] = []

    for m in db.query(Memory).filter(Memory.couple_id == cid).all():
        hay = f"{m.title} {m.location} {m.notes} {m.occasion} {m.mood}".lower()
        if term in hay or any(term in t.lower() for t in json.loads(m.tags_json or "[]")):
            results.append(
                SearchResult(kind="memory", id=m.id, title=m.title, subtitle=m.location, route="/moments")
            )

    for d in db.query(Dream).filter(Dream.couple_id == cid).all():
        if term in f"{d.title} {d.location} {d.notes}".lower():
            results.append(
                SearchResult(kind="dream", id=d.id, title=d.title, subtitle=d.status, route="/someday")
            )

    for c in db.query(TimeCapsule).filter(TimeCapsule.couple_id == cid).all():
        if term in f"{c.title} {c.content}".lower():
            results.append(
                SearchResult(kind="capsule", id=c.id, title=c.title, subtitle="Forever", route="/forever")
            )

    for n in db.query(LoveNote).filter(LoveNote.couple_id == cid).all():
        if term in n.content.lower():
            results.append(
                SearchResult(kind="note", id=n.id, title=n.content[:40], subtitle="Love note", route="/forever")
            )

    return results[:30]


def build_notification_feed(db: Session, couple_id: int) -> list[NotificationItem]:
    today = date.today()
    items: list[NotificationItem] = []

    for m in db.query(Memory).filter(Memory.couple_id == couple_id).all():
        if m.memory_date and m.memory_date.month == today.month and m.memory_date.day == today.day:
            items.append(
                NotificationItem(
                    title="On This Day",
                    body=f"Remember: {m.title}",
                    tag=f"otd-{m.id}",
                    route="/moments",
                )
            )

    for row in db.query(ImportantDate).filter(ImportantDate.couple_id == couple_id).all():
        days = days_until(row.event_date, row.recurring)
        if days == 0:
            items.append(
                NotificationItem(
                    title="Anniversary today!",
                    body=row.title,
                    tag=f"ann-{row.id}",
                    route="/calendar",
                )
            )
        elif days == 1:
            items.append(
                NotificationItem(
                    title="Tomorrow",
                    body=f"{row.title} is tomorrow",
                    tag=f"ann-soon-{row.id}",
                    route="/calendar",
                )
            )

    for c in db.query(TimeCapsule).filter(
        TimeCapsule.couple_id == couple_id, TimeCapsule.is_opened.is_(False)
    ).all():
        days = (c.unlock_date - today).days
        if days == 0:
            items.append(
                NotificationItem(
                    title="Capsule ready!",
                    body=f'"{c.title}" can be opened today',
                    tag=f"cap-{c.id}",
                    route="/forever",
                )
            )
        elif days == 1:
            items.append(
                NotificationItem(
                    title="Capsule unlocks tomorrow",
                    body=c.title,
                    tag=f"cap-soon-{c.id}",
                    route="/forever",
                )
            )

    return items


@router.get("/notifications/feed", response_model=list[NotificationItem])
def notification_feed(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> list[NotificationItem]:
    return build_notification_feed(db, couple.id)


@router.get("/calendar", response_model=list[CalendarEvent])
def calendar_events(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> list[CalendarEvent]:
    cid = couple.id
    events: list[CalendarEvent] = []

    for m in db.query(Memory).filter(Memory.couple_id == cid, Memory.memory_date.isnot(None)).all():
        events.append(
            CalendarEvent(
                id=f"memory-{m.id}",
                kind="memory",
                title=m.title,
                date=m.memory_date.isoformat(),
                route="/moments",
                color="#ff4d6d",
            )
        )

    for c in db.query(TimeCapsule).filter(TimeCapsule.couple_id == cid).all():
        events.append(
            CalendarEvent(
                id=f"capsule-{c.id}",
                kind="capsule",
                title=c.title,
                date=c.unlock_date.isoformat(),
                route="/forever",
                color="#facc15",
            )
        )

    for d in db.query(ImportantDate).filter(ImportantDate.couple_id == cid).all():
        events.append(
            CalendarEvent(
                id=f"date-{d.id}",
                kind="anniversary",
                title=d.title,
                date=d.event_date.isoformat(),
                route="/calendar",
                color="#a78bfa",
            )
        )

    for p in db.query(TripPin).filter(TripPin.couple_id == cid, TripPin.pin_date.isnot(None)).all():
        events.append(
            CalendarEvent(
                id=f"pin-{p.id}",
                kind="trip",
                title=p.title.split(",")[0],
                date=p.pin_date.isoformat(),
                route="/somewhere",
                color="#60a5fa",
            )
        )

    for dr in db.query(Dream).filter(Dream.couple_id == cid, Dream.status == "Planned").all():
        if dr.target_year and len(dr.target_year) == 4:
            events.append(
                CalendarEvent(
                    id=f"dream-{dr.id}",
                    kind="dream",
                    title=dr.title,
                    date=f"{dr.target_year}-06-01",
                    route="/someday",
                    color="#34d399",
                )
            )

    events.sort(key=lambda e: e.date)
    return events


@router.get("/export")
def export_all(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> JSONResponse:
    cid = couple.id
    data = {
        "exported_at": datetime.utcnow().isoformat(),
        "couple": couple.display_name,
        "memories": [
            MemoryOut.from_orm_row(m).model_dump()
            for m in db.query(Memory).filter(Memory.couple_id == cid).all()
        ],
        "trip_pins": [
            TripPinOut.from_orm_row(p).model_dump()
            for p in db.query(TripPin).filter(TripPin.couple_id == cid).all()
        ],
        "dreams": [
            DreamOut.from_orm_row(d).model_dump()
            for d in db.query(Dream).filter(Dream.couple_id == cid).all()
        ],
        "capsules": [
            {
                "id": c.id,
                "title": c.title,
                "content": c.content,
                "unlock_date": c.unlock_date.isoformat(),
                "author": c.author,
                "is_opened": c.is_opened,
            }
            for c in db.query(TimeCapsule).filter(TimeCapsule.couple_id == cid).all()
        ],
        "love_notes": [
            {"id": n.id, "content": n.content, "author": n.author, "mood": n.mood}
            for n in db.query(LoveNote).filter(LoveNote.couple_id == cid).all()
        ],
        "important_dates": [
            {"id": d.id, "title": d.title, "event_date": d.event_date.isoformat(), "recurring": d.recurring}
            for d in db.query(ImportantDate).filter(ImportantDate.couple_id == cid).all()
        ],
        "prompt_answers": [
            {
                "id": a.id,
                "prompt_id": a.prompt_id,
                "question": a.question,
                "answer": a.answer,
                "author": a.author,
            }
            for a in db.query(DatePromptAnswer).filter(DatePromptAnswer.couple_id == cid).all()
        ],
    }
    return JSONResponse(
        content=data,
        headers={"Content-Disposition": "attachment; filename=forever-somewhere-export.json"},
    )
