from fastapi import HTTPException

from app.models.entities import CoupleSpace


def partner_names(couple: CoupleSpace) -> set[str]:
    return {couple.partner1_name, couple.partner2_name, "Us"}


def assert_actor(actor: str, couple: CoupleSpace) -> None:
    if actor not in partner_names(couple):
        raise HTTPException(status_code=400, detail="Invalid author")


def assert_can_modify(actor: str, content_author: str | None, couple: CoupleSpace) -> None:
    """Block one partner from editing/deleting the other's personal entries."""
    assert_actor(actor, couple)
    owner = (content_author or "Us").strip() or "Us"
    if owner == "Us":
        return
    if owner != actor:
        raise HTTPException(status_code=403, detail="You can only change your own entries")


def assert_posts_as_self(actor: str, claimed_author: str | None, couple: CoupleSpace) -> None:
    """Block posting content under a partner's name."""
    assert_actor(actor, couple)
    owner = (claimed_author or "").strip()
    if not owner or owner == "Us":
        raise HTTPException(status_code=400, detail="Author required")
    if owner != actor:
        raise HTTPException(status_code=403, detail="You can only post as yourself")
