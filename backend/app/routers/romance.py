import json
from datetime import date, datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps.couple import get_current_couple
from app.models.entities import ActivityEvent, CoupleSpace, ImportantDate, Memory, PushSubscription
from app.routers.push import _send_web_push
from app.services.activity import log_activity
from app.services.romance_data import DATE_NIGHT_DECK, FIRST_TAGS, LETTER_PROMPTS_BY_MOOD

router = APIRouter(prefix="/api/romance", tags=["romance"])


class ThinkingOfYouIn(BaseModel):
    author: str = Field(min_length=1, max_length=64)


class TogetherOut(BaseModel):
    days_together: int
    together_since: str | None
    next_anniversary_title: str | None
    next_anniversary_date: str | None
    next_anniversary_days: int | None
    partner1: str
    partner2: str


def _days_until(event: date, recurring: bool) -> int:
    today = date.today()
    if recurring:
        candidate = event.replace(year=today.year)
        if candidate < today:
            candidate = candidate.replace(year=today.year + 1)
        return (candidate - today).days
    return max(0, (event - today).days)


def _together_start(db: Session, couple: CoupleSpace) -> date:
    dates = db.query(ImportantDate).filter(ImportantDate.couple_id == couple.id).all()
    keywords = ("together", "first date", "started", "anniversary", "met")
    for row in sorted(dates, key=lambda r: r.event_date):
        title = row.title.lower()
        if any(k in title for k in keywords) or row.recurring:
            return row.event_date
    earliest = (
        db.query(Memory)
        .filter(Memory.couple_id == couple.id, Memory.memory_date.isnot(None))
        .order_by(Memory.memory_date.asc())
        .first()
    )
    if earliest and earliest.memory_date:
        return earliest.memory_date
    return couple.created_at.date() if couple.created_at else date.today()


@router.post("/thinking-of-you")
def thinking_of_you(
    payload: ThinkingOfYouIn,
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    title = f"{payload.author} is thinking of you 💕"
    log_activity(
        db,
        couple_id=couple.id,
        kind="ping",
        title=title,
        author=payload.author,
        route="/dashboard",
    )
    db.commit()

    push_payload = {
        "title": "Thinking of you",
        "body": f"{payload.author} sent you a little love ping",
        "tag": "thinking-of-you",
        "route": "/dashboard",
    }
    subs = db.query(PushSubscription).filter(PushSubscription.couple_id == couple.id).all()
    sent = 0
    for sub in subs:
        if _send_web_push(sub, push_payload):
            sent += 1

    return {"ok": True, "message": title, "push_sent": sent}


@router.get("/letter-prompts")
def letter_prompts(mood: str = "") -> dict:
    if mood and mood in LETTER_PROMPTS_BY_MOOD:
        return {"mood": mood, "prompts": LETTER_PROMPTS_BY_MOOD[mood]}
    return {"moods": list(LETTER_PROMPTS_BY_MOOD.keys()), "all": LETTER_PROMPTS_BY_MOOD}


@router.get("/date-deck")
def date_deck() -> dict:
    suits = sorted({c["suit"] for c in DATE_NIGHT_DECK})
    return {"cards": DATE_NIGHT_DECK, "suits": suits}


@router.get("/firsts")
def firsts_timeline(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    rows = db.query(Memory).filter(Memory.couple_id == couple.id).all()
    firsts: list[dict] = []
    for m in rows:
        tags = json.loads(m.tags_json or "[]")
        is_first = any(t in FIRST_TAGS for t in tags) or any(
            t.lower().startswith("first") for t in tags
        )
        milestone = (m.milestone_type or "").lower()
        if not is_first and not any(k in milestone for k in ("first", "engagement", "wedding", "kiss", "date")):
            continue
        firsts.append(
            {
                "id": m.id,
                "title": m.title,
                "date": m.memory_date.isoformat() if m.memory_date else "",
                "location": m.location,
                "tags": tags,
                "milestone_type": m.milestone_type,
                "photos": json.loads(m.photos_json or "[]")[:1],
            }
        )
    firsts.sort(key=lambda x: x["date"] or "9999")
    return {"firsts": firsts}


@router.get("/together", response_model=TogetherOut)
def together_stats(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> TogetherOut:
    start = _together_start(db, couple)
    days = max(0, (date.today() - start).days)

    dates = db.query(ImportantDate).filter(ImportantDate.couple_id == couple.id).all()
    next_title: str | None = None
    next_date: str | None = None
    next_days: int | None = None
    if dates:
        nearest = min(dates, key=lambda r: _days_until(r.event_date, r.recurring))
        next_title = nearest.title
        next_date = nearest.event_date.isoformat()
        next_days = _days_until(nearest.event_date, nearest.recurring)

    return TogetherOut(
        days_together=days,
        together_since=start.isoformat(),
        next_anniversary_title=next_title,
        next_anniversary_date=next_date,
        next_anniversary_days=next_days,
        partner1=couple.partner1_name,
        partner2=couple.partner2_name,
    )


@router.get("/recent-pings")
def recent_pings(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> list[dict]:
    rows = (
        db.query(ActivityEvent)
        .filter(ActivityEvent.couple_id == couple.id, ActivityEvent.kind == "ping")
        .order_by(ActivityEvent.created_at.desc())
        .limit(5)
        .all()
    )
    return [
        {
            "id": r.id,
            "title": r.title,
            "author": r.author,
            "at": r.created_at.isoformat() if isinstance(r.created_at, datetime) else "",
        }
        for r in rows
    ]
