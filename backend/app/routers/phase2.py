"""Phase 2 — intimacy features, deck, reactions, after-dark."""
import json
import random
import uuid
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.author_guard import assert_can_modify, assert_posts_as_self
from app.core.database import get_db
from app.core.datetime_utils import utc_iso
from app.data.deck_seed import (
    DESIRE_CHIPS,
    SPICY_DARES,
    SPICY_TRUTHS,
    SWEET_DARES,
    SWEET_TRUTHS,
    WILD_CHALLENGES,
    WILD_DARES,
    WILD_TRUTHS,
)
from app.deps.couple import get_current_couple
from app.models.entities import (
    CoupleMeta,
    CoupleSpace,
    DesireSlip,
    EnergyStatus,
    IntimacyCheckIn,
    LoveNote,
    NoteReaction,
    StolenNote,
    TimeCapsule,
    VaultEntry,
)
from app.services.activity import log_activity

router = APIRouter(prefix="/api/phase2", tags=["phase2"])


def _meta(db: Session, couple_id: int) -> CoupleMeta:
    row = db.query(CoupleMeta).filter(CoupleMeta.couple_id == couple_id).first()
    if not row:
        row = CoupleMeta(couple_id=couple_id)
        db.add(row)
        db.flush()
    return row


def _prefs(meta: CoupleMeta) -> dict:
    try:
        return json.loads(meta.phase2_prefs_json or "{}")
    except json.JSONDecodeError:
        return {}


def _save_prefs(meta: CoupleMeta, prefs: dict) -> None:
    meta.phase2_prefs_json = json.dumps(prefs)


def _custom_deck(meta: CoupleMeta) -> list[dict]:
    try:
        return json.loads(meta.custom_deck_json or "[]")
    except json.JSONDecodeError:
        return []


def _seed_deck(tier: str) -> list[dict]:
    cards: list[dict] = []
    if tier == "sweet":
        for t in SWEET_TRUTHS:
            cards.append({"id": str(uuid.uuid4()), "tier": "sweet", "kind": "truth", "text": t, "custom": False})
        for d in SWEET_DARES:
            cards.append({"id": str(uuid.uuid4()), "tier": "sweet", "kind": "dare", "text": d, "custom": False})
    elif tier == "spicy":
        for t in SPICY_TRUTHS:
            cards.append({"id": str(uuid.uuid4()), "tier": "spicy", "kind": "truth", "text": t, "custom": False})
        for d in SPICY_DARES:
            cards.append({"id": str(uuid.uuid4()), "tier": "spicy", "kind": "dare", "text": d, "custom": False})
    elif tier == "wild":
        for t in WILD_TRUTHS:
            cards.append({"id": str(uuid.uuid4()), "tier": "wild", "kind": "truth", "text": t, "custom": False})
        for d in WILD_DARES:
            cards.append({"id": str(uuid.uuid4()), "tier": "wild", "kind": "dare", "text": d, "custom": False})
        for c in WILD_CHALLENGES:
            cards.append({"id": str(uuid.uuid4()), "tier": "wild", "kind": "challenge", "text": c, "custom": False})
    return cards


class PrefsOut(BaseModel):
    partner1_after_dark: bool = False
    partner2_after_dark: bool = False
    after_dark_unlocked: bool = False
    tease_energy_dashboard: bool = False
    anniversary_date: str = ""
    anniversary_reminder_dismissed_year: int | None = None


class PrefsUpdate(BaseModel):
    actor: str = Field(min_length=1, max_length=64)
    opt_in_after_dark: bool | None = None
    tease_energy_dashboard: bool | None = None
    anniversary_date: str | None = None
    dismiss_anniversary_reminder: bool | None = None


class ReactIn(BaseModel):
    emoji: str = Field(pattern="^(heart|fire|blush)$")


class StolenNoteIn(BaseModel):
    note_id: int


class DesireSlipIn(BaseModel):
    slip_type: str = Field(pattern="^(curious|into|someday|hard_no)$")
    body: str = Field(min_length=1, max_length=500)
    chip: str = ""
    anonymous: bool = False


class VaultIn(BaseModel):
    entry_kind: str = "fantasy"
    title: str = ""
    body: str = Field(min_length=1)
    visibility: str = "private"
    voice_url: str = ""


class VaultVisibilityIn(BaseModel):
    visibility: str = Field(pattern="^(private|offered|shared)$")


class EnergyIn(BaseModel):
    energy: str = Field(pattern="^(quiet|playful|very)$")
    surprises: str = Field(pattern="^(open|ask|no)$")


class CheckInIn(BaseModel):
    rating: str = Field(pattern="^(great|good|talk|not_for_me)$")
    note: str = ""


class DeckCardIn(BaseModel):
    tier: str = Field(pattern="^(sweet|spicy|wild)$")
    kind: str = Field(pattern="^(truth|dare|challenge)$")
    text: str = Field(min_length=1, max_length=500)


class DrawDeckIn(BaseModel):
    tier: str = Field(pattern="^(sweet|spicy|wild)$")
    kind: str = ""


@router.get("/prefs", response_model=PrefsOut)
def get_prefs(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> PrefsOut:
    p = _prefs(_meta(db, couple.id))
    p1 = bool(p.get("partner1_after_dark"))
    p2 = bool(p.get("partner2_after_dark"))
    return PrefsOut(
        partner1_after_dark=p1,
        partner2_after_dark=p2,
        after_dark_unlocked=p1 and p2,
        tease_energy_dashboard=bool(p.get("tease_energy_dashboard")),
        anniversary_date=p.get("anniversary_date") or "",
        anniversary_reminder_dismissed_year=p.get("anniversary_reminder_dismissed_year"),
    )


@router.put("/prefs")
def update_prefs(
    payload: PrefsUpdate,
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    assert_posts_as_self(payload.actor, payload.actor, couple)
    meta = _meta(db, couple.id)
    prefs = _prefs(meta)
    slot = "partner1_after_dark" if payload.actor == couple.partner1_name else "partner2_after_dark"
    if payload.actor not in (couple.partner1_name, couple.partner2_name):
        raise HTTPException(status_code=400, detail="Invalid author")

    if payload.opt_in_after_dark is not None:
        prefs[slot] = payload.opt_in_after_dark
    if payload.tease_energy_dashboard is not None:
        prefs["tease_energy_dashboard"] = payload.tease_energy_dashboard
    if payload.anniversary_date is not None:
        prefs["anniversary_date"] = payload.anniversary_date
    if payload.dismiss_anniversary_reminder:
        prefs["anniversary_reminder_dismissed_year"] = date.today().year

    _save_prefs(meta, prefs)
    db.commit()
    return {"ok": True, "after_dark_unlocked": bool(prefs.get("partner1_after_dark")) and bool(prefs.get("partner2_after_dark"))}


def _require_after_dark(couple: CoupleSpace, db: Session) -> None:
    p = _prefs(_meta(db, couple.id))
    if not (p.get("partner1_after_dark") and p.get("partner2_after_dark")):
        raise HTTPException(status_code=403, detail="After Dark not unlocked for both partners")


@router.get("/note-reactions")
def list_note_reactions(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> list[dict]:
    rows = db.query(NoteReaction).filter(NoteReaction.couple_id == couple.id).all()
    return [{"note_id": r.note_id, "author": r.author, "emoji": r.emoji} for r in rows]


@router.post("/love-notes/{note_id}/react")
def react_to_note(
    note_id: int,
    payload: ReactIn,
    author: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    note = db.query(LoveNote).filter(LoveNote.couple_id == couple.id, LoveNote.id == note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    assert_posts_as_self(author, author, couple)
    if note.author == author:
        raise HTTPException(status_code=400, detail="Cannot react to your own note")

    row = (
        db.query(NoteReaction)
        .filter(NoteReaction.couple_id == couple.id, NoteReaction.note_id == note_id, NoteReaction.author == author)
        .first()
    )
    if row:
        row.emoji = payload.emoji
    else:
        db.add(NoteReaction(couple_id=couple.id, note_id=note_id, author=author, emoji=payload.emoji))

    emoji_label = {"heart": "❤️", "fire": "🔥", "blush": "😳"}.get(payload.emoji, payload.emoji)
    log_activity(
        db,
        couple_id=couple.id,
        kind="note_reaction",
        title=f"reacted {emoji_label}",
        author=author,
        entity_id=note_id,
        route=f"/forever?tab=notes&note={note_id}",
    )
    db.commit()
    return {"ok": True}


@router.delete("/love-notes/{note_id}/react", status_code=204)
def remove_reaction(
    note_id: int,
    author: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> None:
    row = (
        db.query(NoteReaction)
        .filter(NoteReaction.couple_id == couple.id, NoteReaction.note_id == note_id, NoteReaction.author == author)
        .first()
    )
    if row:
        db.delete(row)
        db.commit()


@router.get("/stolen-note")
def get_stolen_note(
    owner: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    now = datetime.utcnow()
    row = (
        db.query(StolenNote)
        .filter(
            StolenNote.couple_id == couple.id,
            StolenNote.owner_name == owner,
            StolenNote.stolen_until > now,
        )
        .order_by(StolenNote.created_at.desc())
        .first()
    )
    if not row:
        return {"note": None}
    note = db.query(LoveNote).filter(LoveNote.id == row.note_id).first()
    if not note:
        return {"note": None}
    return {
        "note": {
            "id": note.id,
            "content": note.content,
            "author": note.author,
            "stolen_until": utc_iso(row.stolen_until),
        }
    }


@router.post("/stolen-note")
def steal_note(
    payload: StolenNoteIn,
    owner: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    assert_posts_as_self(owner, owner, couple)
    note = db.query(LoveNote).filter(LoveNote.couple_id == couple.id, LoveNote.id == payload.note_id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found")
    if note.author == owner:
        raise HTTPException(status_code=400, detail="Steal a partner's note")

    db.query(StolenNote).filter(StolenNote.couple_id == couple.id, StolenNote.owner_name == owner).delete()
    until = datetime.utcnow() + timedelta(days=7)
    db.add(StolenNote(couple_id=couple.id, owner_name=owner, note_id=note.id, stolen_until=until))
    db.commit()
    return {"ok": True, "stolen_until": utc_iso(until)}


@router.delete("/stolen-note", status_code=204)
def release_stolen(
    owner: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> None:
    db.query(StolenNote).filter(StolenNote.couple_id == couple.id, StolenNote.owner_name == owner).delete()
    db.commit()


@router.get("/anniversary-chain")
def anniversary_chain(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    prefs = _prefs(_meta(db, couple.id))
    ann = prefs.get("anniversary_date") or ""
    rows = (
        db.query(TimeCapsule)
        .filter(TimeCapsule.couple_id == couple.id, TimeCapsule.capsule_type == "anniversary")
        .order_by(TimeCapsule.year_index.asc())
        .all()
    )
    today = date.today()
    show_reminder = False
    if ann:
        try:
            ad = date.fromisoformat(ann)
            days_until = (date(today.year, ad.month, ad.day) - today).days
            if 0 <= days_until <= 14:
                dismissed = prefs.get("anniversary_reminder_dismissed_year")
                show_reminder = dismissed != today.year
        except ValueError:
            pass

    return {
        "anniversary_date": ann,
        "show_reminder": show_reminder,
        "capsules": [
            {
                "id": r.id,
                "title": r.title,
                "year_index": r.year_index,
                "unlock_date": r.unlock_date.isoformat(),
                "is_opened": r.is_opened,
                "is_locked": today < r.unlock_date and not r.is_opened,
                "author": r.author,
            }
            for r in rows
        ],
    }


@router.get("/deck")
def get_deck(
    tier: str = Query(pattern="^(sweet|spicy|wild)$"),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    if tier == "wild":
        _require_after_dark(couple, db)
    meta = _meta(db, couple.id)
    custom = [c for c in _custom_deck(meta) if c.get("tier") == tier]
    return {"tier": tier, "cards": _seed_deck(tier) + custom, "chips": DESIRE_CHIPS if tier == "wild" else []}


@router.post("/deck/custom", status_code=201)
def add_custom_card(
    payload: DeckCardIn,
    author: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    if payload.tier == "wild":
        _require_after_dark(couple, db)
    assert_posts_as_self(author, author, couple)
    meta = _meta(db, couple.id)
    custom = _custom_deck(meta)
    card = {
        "id": str(uuid.uuid4()),
        "tier": payload.tier,
        "kind": payload.kind,
        "text": payload.text.strip(),
        "custom": True,
        "author": author,
    }
    custom.append(card)
    meta.custom_deck_json = json.dumps(custom)
    db.commit()
    return card


@router.post("/deck/draw")
def draw_card(
    payload: DrawDeckIn,
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    if payload.tier == "wild":
        _require_after_dark(couple, db)
    meta = _meta(db, couple.id)
    pool = _seed_deck(payload.tier) + [c for c in _custom_deck(meta) if c.get("tier") == payload.tier]
    if payload.kind:
        pool = [c for c in pool if c.get("kind") == payload.kind]
    if not pool:
        raise HTTPException(status_code=404, detail="No cards in deck")
    return random.choice(pool)


@router.get("/desire-jar")
def list_desire_slips(
    viewer: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    _require_after_dark(couple, db)
    rows = (
        db.query(DesireSlip)
        .filter(DesireSlip.couple_id == couple.id)
        .order_by(DesireSlip.created_at.desc())
        .all()
    )
    out = []
    for r in rows:
        is_mine = r.author == viewer
        show_body = is_mine or r.revealed or (r.matched_id and r.revealed)
        if r.anonymous and not is_mine and not r.revealed:
            show_body = False
        out.append(
            {
                "id": r.id,
                "slip_type": r.slip_type,
                "body": r.body if show_body else "",
                "chip": r.chip if show_body else "",
                "anonymous": r.anonymous,
                "author": r.author if (is_mine or r.revealed) else ("Anonymous" if r.anonymous else "Partner"),
                "matched_id": r.matched_id,
                "revealed": r.revealed,
                "is_mine": is_mine,
                "created_at": utc_iso(r.created_at),
            }
        )
    return {"slips": out, "chips": DESIRE_CHIPS}


@router.post("/desire-jar", status_code=201)
def add_desire_slip(
    payload: DesireSlipIn,
    author: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    _require_after_dark(couple, db)
    assert_posts_as_self(author, author, couple)
    row = DesireSlip(
        couple_id=couple.id,
        author=author,
        slip_type=payload.slip_type,
        body=payload.body.strip(),
        chip=(payload.chip or "").strip().lower(),
        anonymous=payload.anonymous,
    )
    db.add(row)
    db.flush()

    if payload.chip and payload.slip_type in ("curious", "into"):
        partner_slips = (
            db.query(DesireSlip)
            .filter(
                DesireSlip.couple_id == couple.id,
                DesireSlip.author != author,
                DesireSlip.chip == row.chip,
                DesireSlip.slip_type.in_(("curious", "into")),
                DesireSlip.matched_id.is_(None),
            )
            .all()
        )
        if partner_slips:
            match = partner_slips[0]
            row.matched_id = match.id
            match.matched_id = row.id

    log_activity(
        db,
        couple_id=couple.id,
        kind="desire_jar",
        title="New slip in the jar",
        author=author,
        entity_id=row.id,
        route="/after-dark",
    )
    db.commit()
    db.refresh(row)
    return {"id": row.id, "matched_id": row.matched_id}


@router.post("/desire-jar/{slip_id}/reveal")
def reveal_match(
    slip_id: int,
    author: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    _require_after_dark(couple, db)
    row = db.query(DesireSlip).filter(DesireSlip.couple_id == couple.id, DesireSlip.id == slip_id).first()
    if not row or row.author != author:
        raise HTTPException(status_code=404, detail="Slip not found")
    row.revealed = True
    if row.matched_id:
        other = db.query(DesireSlip).filter(DesireSlip.id == row.matched_id).first()
        if other:
            other.revealed = True
    db.commit()
    return {"ok": True}


@router.delete("/desire-jar/{slip_id}", status_code=204)
def delete_slip(
    slip_id: int,
    author: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> None:
    row = db.query(DesireSlip).filter(DesireSlip.couple_id == couple.id, DesireSlip.id == slip_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    assert_can_modify(author, row.author, couple)
    db.delete(row)
    db.commit()


@router.get("/vault")
def list_vault(
    viewer: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    _require_after_dark(couple, db)
    rows = (
        db.query(VaultEntry)
        .filter(VaultEntry.couple_id == couple.id)
        .order_by(VaultEntry.created_at.desc())
        .all()
    )
    out = []
    for r in rows:
        is_mine = r.author == viewer
        if r.visibility == "private" and not is_mine:
            out.append({"id": r.id, "author": r.author, "visibility": r.visibility, "locked": True})
            continue
        if r.visibility == "offered" and not is_mine:
            out.append(
                {
                    "id": r.id,
                    "author": r.author,
                    "visibility": r.visibility,
                    "title": "Something waiting for you",
                    "locked": True,
                }
            )
            continue
        out.append(
            {
                "id": r.id,
                "author": r.author,
                "entry_kind": r.entry_kind,
                "title": r.title,
                "body": r.body,
                "visibility": r.visibility,
                "voice_url": r.voice_url,
                "locked": False,
                "is_mine": is_mine,
                "created_at": utc_iso(r.created_at),
            }
        )
    return {"entries": out}


@router.post("/vault", status_code=201)
def create_vault(
    payload: VaultIn,
    author: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    _require_after_dark(couple, db)
    assert_posts_as_self(author, author, couple)
    row = VaultEntry(
        couple_id=couple.id,
        author=author,
        entry_kind=payload.entry_kind,
        title=payload.title.strip(),
        body=payload.body.strip(),
        visibility=payload.visibility if payload.visibility in ("private", "offered", "shared") else "private",
        voice_url=payload.voice_url,
    )
    db.add(row)
    db.flush()
    if row.visibility == "offered":
        log_activity(
            db,
            couple_id=couple.id,
            kind="vault",
            title="Left something in the vault",
            author=author,
            entity_id=row.id,
            route="/after-dark",
        )
    db.commit()
    db.refresh(row)
    return {"id": row.id}


@router.put("/vault/{entry_id}/visibility")
def update_vault_visibility(
    entry_id: int,
    payload: VaultVisibilityIn,
    author: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    row = db.query(VaultEntry).filter(VaultEntry.couple_id == couple.id, VaultEntry.id == entry_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    assert_can_modify(author, row.author, couple)
    row.visibility = payload.visibility
    if payload.visibility == "offered":
        log_activity(
            db,
            couple_id=couple.id,
            kind="vault",
            title="Offered something in the vault",
            author=author,
            entity_id=row.id,
            route="/after-dark",
        )
    db.commit()
    return {"ok": True}


@router.post("/vault/{entry_id}/accept")
def accept_vault(
    entry_id: int,
    author: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    row = db.query(VaultEntry).filter(VaultEntry.couple_id == couple.id, VaultEntry.id == entry_id).first()
    if not row or row.author == author:
        raise HTTPException(status_code=404, detail="Not found")
    if row.visibility != "offered":
        raise HTTPException(status_code=400, detail="Not offered")
    row.visibility = "shared"
    db.commit()
    return {"ok": True}


@router.delete("/vault/{entry_id}", status_code=204)
def delete_vault(
    entry_id: int,
    author: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> None:
    row = db.query(VaultEntry).filter(VaultEntry.couple_id == couple.id, VaultEntry.id == entry_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    assert_can_modify(author, row.author, couple)
    db.delete(row)
    db.commit()


@router.get("/energy")
def get_energy(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    now = datetime.utcnow()
    rows = (
        db.query(EnergyStatus)
        .filter(EnergyStatus.couple_id == couple.id, EnergyStatus.expires_at > now)
        .order_by(EnergyStatus.created_at.desc())
        .all()
    )
    by_author = {}
    for r in rows:
        if r.author not in by_author:
            by_author[r.author] = {
                "author": r.author,
                "energy": r.energy,
                "surprises": r.surprises,
                "expires_at": utc_iso(r.expires_at),
            }
    prefs = _prefs(_meta(db, couple.id))
    return {"statuses": list(by_author.values()), "tease_dashboard": bool(prefs.get("tease_energy_dashboard"))}


@router.post("/energy")
def set_energy(
    payload: EnergyIn,
    author: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    _require_after_dark(couple, db)
    assert_posts_as_self(author, author, couple)
    expires = datetime.utcnow() + timedelta(hours=12)
    db.add(
        EnergyStatus(
            couple_id=couple.id,
            author=author,
            energy=payload.energy,
            surprises=payload.surprises,
            expires_at=expires,
        )
    )
    db.commit()
    return {"ok": True, "expires_at": utc_iso(expires)}


@router.post("/check-in", status_code=201)
def check_in(
    payload: CheckInIn,
    author: str = Query(min_length=1, max_length=64),
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> dict:
    _require_after_dark(couple, db)
    assert_posts_as_self(author, author, couple)
    db.add(
        IntimacyCheckIn(
            couple_id=couple.id,
            author=author,
            rating=payload.rating,
            note=payload.note.strip(),
        )
    )
    db.commit()
    return {"ok": True}
