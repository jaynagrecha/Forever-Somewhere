from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.deps.couple import get_current_couple
from app.models.entities import CoupleSpace, DatePromptAnswer
from app.schemas.common import PromptAnswerCreate, PromptAnswerOut

router = APIRouter(prefix="/api/prompts", tags=["prompts"])

DEFAULT_PROMPTS = [
    {"id": "p1", "category": "Memory", "text": "What is your favourite memory of us this year?"},
    {"id": "p2", "category": "Dreams", "text": "If we could teleport anywhere tomorrow, where would we go?"},
    {"id": "p3", "category": "Us", "text": "What is one small thing I do that makes you feel loved?"},
    {"id": "p4", "category": "Future", "text": "What tradition do you want us to start as a couple?"},
    {"id": "p5", "category": "Gratitude", "text": "What are you most grateful for about our relationship right now?"},
    {"id": "p6", "category": "Play", "text": "What is an adventure we have never tried but should?"},
    {"id": "p7", "category": "Deep", "text": "When did you know you wanted to build a life with me?"},
    {"id": "p8", "category": "Fun", "text": "What song feels most like us as a couple?"},
    {"id": "p9", "category": "Home", "text": "What does our ideal ordinary Sunday look like?"},
    {"id": "p10", "category": "Growth", "text": "How can we support each other better this month?"},
    {"id": "p11", "category": "Memory", "text": "Which trip together changed us the most?"},
    {"id": "p12", "category": "Forever", "text": "What promise do you want to make to our future selves?"},
]


@router.get("")
def list_prompts() -> list[dict]:
    return DEFAULT_PROMPTS


@router.get("/answers", response_model=list[PromptAnswerOut])
def list_answers(
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> list[PromptAnswerOut]:
    return (
        db.query(DatePromptAnswer)
        .filter(DatePromptAnswer.couple_id == couple.id)
        .order_by(DatePromptAnswer.created_at.desc())
        .all()
    )


@router.post("/answers", response_model=PromptAnswerOut, status_code=201)
def save_answer(
    payload: PromptAnswerCreate,
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> PromptAnswerOut:
    row = DatePromptAnswer(couple_id=couple.id, **payload.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/answers/{answer_id}", status_code=204)
def delete_answer(
    answer_id: int,
    couple: CoupleSpace = Depends(get_current_couple),
    db: Session = Depends(get_db),
) -> None:
    row = (
        db.query(DatePromptAnswer)
        .filter(DatePromptAnswer.couple_id == couple.id, DatePromptAnswer.id == answer_id)
        .first()
    )
    if row:
        db.delete(row)
        db.commit()
