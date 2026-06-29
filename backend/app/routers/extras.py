import json
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.author_guard import assert_can_modify, assert_posts_as_self
from app.core.database import get_db
from app.core.datetime_utils import utc_iso
from app.core.season_utils import resolve_period_start
from app.deps.couple import get_current_couple
from app.models.entities import (
    ActivityEvent,
    CoupleMeta,
    CoupleSpace,
    DailyQuestionAnswer,
    Memory,
    SeasonEntry,
    TripAlbum,
)
from app.services.activity import log_activity
from app.services.prompts_data import COMPAT_QUIZ, question_for_date

router = APIRouter(prefix="/api", tags=["extras"])


class AlbumCreate(BaseModel):
    title: str
    description: str = ""
    start_date: str = ""
    end_date: str = ""
    cover_url: str = ""


class AlbumOut(BaseModel):
    id: int
    title: str
    description: str
    start_date: str
    end_date: str
    cover_url: str

    @classmethod
    def from_row(cls, r: TripAlbum) -> "AlbumOut":
        return cls(
            id=r.id,
            title=r.title,
            description=r.description or "",
            start_date=r.start_date.isoformat() if r.start_date else "",
            end_date=r.end_date.isoformat() if r.end_date else "",
            cover_url=r.cover_url or "",
        )


class DailyAnswerIn(BaseModel):
    author: str
    answer: str


class SeasonEntryIn(BaseModel):
    author: str = Field(min_length=1, max_length=64)
    period_type: str = Field(pattern="^(week|month)$")
    period_start: str = ""
    title: str = Field(min_length=1, max_length=255)
    description: str = ""
    color: str = "#ff4d6d"
    photo_url: str = ""


class SeasonEntryOut(BaseModel):
    id: int
    author: str
    period_type: str
    period_start: str
    title: str
    description: str
    color: str
    photo_url: str
    created_at: str
    updated_at: str

    @classmethod
    def from_row(cls, row: SeasonEntry) -> "SeasonEntryOut":
        return cls(
            id=row.id,
            author=row.author,
            period_type=row.period_type,
            period_start=row.period_start.isoformat(),
            title=row.title,
            description=row.description or "",
            color=row.color or "#ff4d6d",
            photo_url=row.photo_url or "",
            created_at=utc_iso(row.created_at) if row.created_at else "",
            updated_at=utc_iso(row.updated_at) if row.updated_at else "",
        )


class QuizSubmit(BaseModel):
    author: str
    answers: dict[str, str]


def _parse_d(s: str) -> date | None:
    if not s:
        return None
    return date.fromisoformat(s)


def _meta(db: Session, couple_id: int) -> CoupleMeta:
    row = db.query(CoupleMeta).filter(CoupleMeta.couple_id == couple_id).first()
    if not row:
        row = CoupleMeta(couple_id=couple_id)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


@router.get("/activity")
def list_activity(
    limit: int = 20,
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> list[dict]:
    rows = (
        db.query(ActivityEvent)
        .filter(ActivityEvent.couple_id == couple.id)
        .order_by(ActivityEvent.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": r.id,
            "kind": r.kind,
            "title": r.title,
            "author": r.author,
            "route": r.route,
            "created_at": utc_iso(r.created_at),
        }
        for r in rows
    ]


@router.get("/albums")
def list_albums(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> list[AlbumOut]:
    rows = (
        db.query(TripAlbum)
        .filter(TripAlbum.couple_id == couple.id)
        .order_by(TripAlbum.id.desc())
        .all()
    )
    return [AlbumOut.from_row(r) for r in rows]


@router.post("/albums", status_code=201)
def create_album(
    payload: AlbumCreate,
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> AlbumOut:
    row = TripAlbum(
        couple_id=couple.id,
        title=payload.title,
        description=payload.description,
        start_date=_parse_d(payload.start_date),
        end_date=_parse_d(payload.end_date),
        cover_url=payload.cover_url,
    )
    db.add(row)
    db.flush()
    log_activity(
        db,
        couple_id=couple.id,
        kind="album",
        title=payload.title,
        author="Us",
        entity_id=row.id,
        route="/moments",
    )
    db.commit()
    db.refresh(row)
    return AlbumOut.from_row(row)


@router.delete("/albums/{album_id}", status_code=204)
def delete_album(
    album_id: int,
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> None:
    row = (
        db.query(TripAlbum)
        .filter(TripAlbum.couple_id == couple.id, TripAlbum.id == album_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Album not found")
    db.delete(row)
    db.commit()


@router.get("/daily-question")
def get_daily_question(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    today = date.today()
    q = question_for_date(today)
    answers = (
        db.query(DailyQuestionAnswer)
        .filter(
            DailyQuestionAnswer.couple_id == couple.id,
            DailyQuestionAnswer.question_date == today,
        )
        .all()
    )
    partners = [couple.partner1_name, couple.partner2_name]
    by_author = {a.author: {"answer": a.answer, "id": a.id} for a in answers}
    revealed = len(by_author) >= 2 or (len(by_author) == 1 and "Us" in by_author)
    return {
        "date": today.isoformat(),
        "question": q,
        "answers": by_author if revealed else {k: {"answered": True} for k in by_author},
        "revealed": revealed,
        "waiting_for": [p for p in partners if p not in by_author],
        "partners": partners,
    }


@router.post("/daily-question/answer")
def save_daily_answer(
    payload: DailyAnswerIn,
    actor: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    assert_posts_as_self(actor, payload.author, couple)
    today = date.today()
    q = question_for_date(today)
    existing = (
        db.query(DailyQuestionAnswer)
        .filter(
            DailyQuestionAnswer.couple_id == couple.id,
            DailyQuestionAnswer.question_date == today,
            DailyQuestionAnswer.author == payload.author,
        )
        .first()
    )
    if existing:
        existing.answer = payload.answer
        existing.question = q
    else:
        db.add(
            DailyQuestionAnswer(
                couple_id=couple.id,
                question_date=today,
                question=q,
                author=payload.author,
                answer=payload.answer,
            )
        )
    db.commit()
    return {"ok": True}


@router.get("/quiz")
def get_quiz() -> dict:
    return {"questions": COMPAT_QUIZ}


@router.get("/quiz/results")
def quiz_results(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    meta = _meta(db, couple.id)
    return {"results": json.loads(meta.quiz_results_json or "[]")}


@router.post("/quiz/submit")
def submit_quiz(
    payload: QuizSubmit,
    actor: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    assert_posts_as_self(actor, payload.author, couple)
    meta = _meta(db, couple.id)
    results = json.loads(meta.quiz_results_json or "[]")
    results = [r for r in results if r.get("author") != payload.author]
    results.append({"author": payload.author, "answers": payload.answers})
    meta.quiz_results_json = json.dumps(results)
    db.commit()
    return {"ok": True, "results": results}


def _season_entries(db: Session, couple_id: int):
    return db.query(SeasonEntry).filter(SeasonEntry.couple_id == couple_id)


@router.get("/seasons", response_model=dict)
def list_seasons(
    period_type: str = Query(default="week", pattern="^(week|month)$"),
    limit: int = Query(default=24, ge=1, le=120),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    rows = (
        _season_entries(db, couple.id)
        .filter(SeasonEntry.period_type == period_type)
        .order_by(SeasonEntry.period_start.desc(), SeasonEntry.author.asc())
        .limit(limit)
        .all()
    )
    current_start = resolve_period_start(date.today(), period_type)
    entries = [SeasonEntryOut.from_row(r) for r in rows]
    current = [e for e in entries if e.period_start == current_start.isoformat()]
    return {
        "period_type": period_type,
        "current_period_start": current_start.isoformat(),
        "entries": entries,
        "current": current,
    }


@router.post("/seasons", response_model=SeasonEntryOut, status_code=201)
def upsert_season(
    payload: SeasonEntryIn,
    actor: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> SeasonEntryOut:
    assert_posts_as_self(actor, payload.author, couple)
    names = {couple.partner1_name, couple.partner2_name, "Us"}
    if payload.author not in names:
        raise HTTPException(status_code=400, detail="Invalid author")

    if payload.period_start:
        try:
            period_start = date.fromisoformat(payload.period_start)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="Invalid period_start") from exc
        period_start = resolve_period_start(period_start, payload.period_type)
    else:
        period_start = resolve_period_start(None, payload.period_type)

    row = (
        _season_entries(db, couple.id)
        .filter(
            SeasonEntry.author == payload.author,
            SeasonEntry.period_type == payload.period_type,
            SeasonEntry.period_start == period_start,
        )
        .first()
    )
    created = row is None
    if not row:
        row = SeasonEntry(
            couple_id=couple.id,
            author=payload.author,
            period_type=payload.period_type,
            period_start=period_start,
        )
        db.add(row)

    row.title = payload.title.strip()
    row.description = payload.description.strip()
    row.color = payload.color or "#ff4d6d"
    row.photo_url = payload.photo_url or ""

    if created:
        db.flush()
        log_activity(
            db,
            couple_id=couple.id,
            kind="season",
            title=payload.title.strip(),
            author=payload.author,
            entity_id=row.id,
            route="/mood-board",
        )

    db.commit()
    db.refresh(row)
    return SeasonEntryOut.from_row(row)


@router.delete("/seasons/{entry_id}", status_code=204)
def delete_season(
    entry_id: int,
    author: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> None:
    row = _season_entries(db, couple.id).filter(SeasonEntry.id == entry_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Season entry not found")
    assert_can_modify(author, row.author, couple)
    db.delete(row)
    db.commit()


@router.get("/story")
def our_story(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    rows = (
        db.query(Memory)
        .filter(Memory.couple_id == couple.id, Memory.is_milestone == True)  # noqa: E712
        .order_by(Memory.memory_date.asc())
        .all()
    )
    milestones = [
        {
            "id": r.id,
            "title": r.title,
            "date": r.memory_date.isoformat() if r.memory_date else "",
            "milestone_type": r.milestone_type,
            "location": r.location,
        }
        for r in rows
    ]
    if not milestones:
        all_m = (
            db.query(Memory)
            .filter(Memory.couple_id == couple.id)
            .order_by(Memory.memory_date.asc())
            .limit(5)
            .all()
        )
        milestones = [
            {
                "id": r.id,
                "title": r.title,
                "date": r.memory_date.isoformat() if r.memory_date else "",
                "milestone_type": "Memory",
                "location": r.location,
            }
            for r in all_m
        ]
    return {"milestones": milestones}


@router.get("/insights/extra")
def extra_insights(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    memories = (
        db.query(Memory)
        .filter(Memory.couple_id == couple.id, Memory.memory_date.isnot(None))
        .all()
    )
    dates = sorted({m.memory_date for m in memories if m.memory_date})
    streak = 0
    if dates:
        streak = 1
        for i in range(len(dates) - 1, 0, -1):
            if (dates[i] - dates[i - 1]).days <= 7:
                streak += 1
            else:
                break
    return {
        "memory_streak_weeks": streak,
        "total_albums": db.query(TripAlbum).filter(TripAlbum.couple_id == couple.id).count(),
        "activity_count": db.query(ActivityEvent).filter(ActivityEvent.couple_id == couple.id).count(),
    }
