"""Semantic pairing for desire jar slips — meaning-based, not tag-only."""
from __future__ import annotations

import json
import logging
import math
import re
from difflib import SequenceMatcher
from functools import lru_cache
from typing import TYPE_CHECKING

from app.core.config import settings

if TYPE_CHECKING:
    from app.models.entities import DesireSlip

logger = logging.getLogger(__name__)

MATCHABLE_TYPES = frozenset({"curious", "into"})

# Calibrated for ~95% precision on "aligned" badges (few false positives).
BASE_THRESHOLD = 0.76
SAME_CHIP_THRESHOLD = 0.72
DIFFERENT_CHIP_THRESHOLD = 0.84
UNMATCH_THRESHOLD = 0.65
MIN_BODY_CHARS = 8

_STOP = frozenset(
    """
    a an the and or but if in on at to for of is am are was were be been being
    i me my we us our you your they them it this that with about want would like
    really very so just maybe something some more
    """.split()
)

# Lightweight synonym groups for fallback when embeddings are unavailable.
_SYNONYM_GROUPS = (
    {"massage", "rub", "rubs", "backrub", "shoulders", "shoulder", "back", "touch", "oiled"},
    {"slow", "gentle", "cuddly", "unhurried", "soft", "cozy", "cuddle"},
    {"surprise", "surprises", "unexpected", "spontaneous", "random"},
    {"romantic", "romance", "date", "dinner", "candles", "candlelit"},
    {"playful", "play", "tease", "teasing", "flirty", "fun"},
    {"bold", "adventurous", "daring", "brave", "intense"},
    {"adventure", "travel", "trip", "getaway", "weekend", "away"},
    {"words", "talk", "talking", "voice", "whisper", "say", "tell"},
    {"night", "tonight", "evening", "bedtime", "sleep"},
    {"kiss", "kissing", "first", "intimate", "feel", "felt", "lips"},
)


def _tokenize(text: str) -> set[str]:
    words = set(re.findall(r"[a-z']+", (text or "").lower()))
    return {w for w in words if len(w) > 2 and w not in _STOP}


def _expand_tokens(tokens: set[str]) -> set[str]:
    out = set(tokens)
    for group in _SYNONYM_GROUPS:
        if tokens & group:
            out |= group
    return out


def embed_text(slip_type: str, chip: str, body: str) -> list[float]:
    """Embed slip meaning. Prefix type/chip so intent is part of the vector."""
    chip = (chip or "").strip().lower()
    body = (body or "").strip()
    parts = [slip_type.strip().lower(), chip, body]
    text = " ".join(p for p in parts if p)
    if not text:
        return []

    try:
        model = _embedding_model()
        vector = next(model.embed([text]))
        return [float(x) for x in vector]
    except Exception as exc:
        logger.warning("Embedding model unavailable: %s", exc)
        return []


@lru_cache(maxsize=1)
def _embedding_model():
    from fastembed import TextEmbedding

    cache_dir = settings.upload_dir.parent / "embedding_cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    return TextEmbedding(model_name="BAAI/bge-small-en-v1.5", cache_dir=str(cache_dir))


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    if na == 0 or nb == 0:
        return 0.0
    return max(0.0, min(1.0, dot / (na * nb)))


def _body_phrase_ratio(a_body: str, b_body: str) -> float:
    a = (a_body or "").strip().lower()
    b = (b_body or "").strip().lower()
    if len(a) < MIN_BODY_CHARS or len(b) < MIN_BODY_CHARS:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


def _lexical_similarity(a_type: str, a_chip: str, a_body: str, b_type: str, b_chip: str, b_body: str) -> float:
    """Fallback overlap score when embeddings cannot run."""
    ta = _expand_tokens(_tokenize(f"{a_type} {a_chip} {a_body}"))
    tb = _expand_tokens(_tokenize(f"{b_type} {b_chip} {b_body}"))
    if not ta or not tb:
        return 0.0
    inter = len(ta & tb)
    union = len(ta | tb)
    jaccard = inter / union if union else 0.0
    phrase = _body_phrase_ratio(a_body, b_body)
    chip_a = (a_chip or "").strip().lower()
    chip_b = (b_chip or "").strip().lower()
    chip_bonus = 0.18 if chip_a and chip_a == chip_b else 0.0
    type_bonus = 0.08 if a_type == b_type else 0.04 if {a_type, b_type} <= MATCHABLE_TYPES else 0.0
    blended = max(jaccard, phrase * 0.85) + chip_bonus + type_bonus
    return min(1.0, blended)


def pair_similarity(
    a_type: str,
    a_chip: str,
    a_body: str,
    a_embedding: list[float] | None,
    b_type: str,
    b_chip: str,
    b_body: str,
    b_embedding: list[float] | None,
) -> float:
    if a_type not in MATCHABLE_TYPES or b_type not in MATCHABLE_TYPES:
        return 0.0

    chip_a = (a_chip or "").strip().lower()
    chip_b = (b_chip or "").strip().lower()

    lex = _lexical_similarity(a_type, chip_a, a_body, b_type, chip_b, b_body)
    if a_embedding and b_embedding:
        emb = cosine_similarity(a_embedding, b_embedding)
        score = 0.82 * emb + 0.18 * lex
    else:
        score = lex

    if chip_a and chip_b:
        if chip_a == chip_b:
            score = min(1.0, score + 0.05)
        else:
            score = max(0.0, score - 0.10)

    # Very short notes need a shared topic or near-identical wording.
    if len((a_body or "").strip()) < MIN_BODY_CHARS or len((b_body or "").strip()) < MIN_BODY_CHARS:
        if not (chip_a and chip_a == chip_b):
            score = min(score, 0.55)

    return score


def match_threshold(chip_a: str, chip_b: str) -> float:
    chip_a = (chip_a or "").strip().lower()
    chip_b = (chip_b or "").strip().lower()
    if chip_a and chip_b:
        if chip_a == chip_b:
            return SAME_CHIP_THRESHOLD
        return DIFFERENT_CHIP_THRESHOLD
    return BASE_THRESHOLD


def embedding_from_json(raw: str | None) -> list[float]:
    if not raw:
        return []
    try:
        data = json.loads(raw)
        if isinstance(data, list):
            return [float(x) for x in data]
    except (json.JSONDecodeError, TypeError, ValueError):
        pass
    return []


def embedding_to_json(vector: list[float]) -> str:
    return json.dumps(vector)


def ensure_embedding(slip: DesireSlip) -> list[float]:
    vector = embedding_from_json(getattr(slip, "body_embedding_json", None))
    if vector:
        return vector
    vector = embed_text(slip.slip_type, slip.chip or "", slip.body)
    if vector:
        slip.body_embedding_json = embedding_to_json(vector)
    return vector


def warm_embedding_model() -> bool:
    """Load embedding model at startup so first jar post is fast."""
    try:
        return bool(embed_text("curious", "", "warmup"))
    except Exception as exc:
        logger.warning("Embedding warmup failed: %s", exc)
        return False


def find_best_partner_match(row: DesireSlip, candidates: list[DesireSlip]) -> tuple[DesireSlip | None, float]:
    if row.slip_type not in MATCHABLE_TYPES:
        return None, 0.0

    row_emb = ensure_embedding(row)
    best: DesireSlip | None = None
    best_score = 0.0

    for candidate in candidates:
        if candidate.author == row.author:
            continue
        if candidate.slip_type not in MATCHABLE_TYPES:
            continue
        if candidate.matched_id is not None:
            continue

        cand_emb = ensure_embedding(candidate)
        score = pair_similarity(
            row.slip_type,
            row.chip or "",
            row.body,
            row_emb,
            candidate.slip_type,
            candidate.chip or "",
            candidate.body,
            cand_emb,
        )
        if score > best_score:
            best_score = score
            best = candidate

    if best is None:
        return None, 0.0

    threshold = match_threshold(row.chip or "", best.chip or "")
    if best_score >= threshold:
        return best, best_score
    return None, best_score


def is_mutual_best_match(a: DesireSlip, b: DesireSlip, pool: list[DesireSlip]) -> bool:
    """Both slips must be each other's top candidate — cuts false positives."""
    partner_for_a, score_a = find_best_partner_match(a, pool)
    if partner_for_a is None or partner_for_a.id != b.id:
        return False
    partner_for_b, score_b = find_best_partner_match(b, pool)
    if partner_for_b is None or partner_for_b.id != a.id:
        return False
    return score_a >= match_threshold(a.chip or "", b.chip or "") and score_b >= match_threshold(
        b.chip or "", a.chip or ""
    )


def pair_still_matches(a: DesireSlip, b: DesireSlip) -> bool:
    score = pair_similarity(
        a.slip_type,
        a.chip or "",
        a.body,
        ensure_embedding(a),
        b.slip_type,
        b.chip or "",
        b.body,
        ensure_embedding(b),
    )
    return score >= UNMATCH_THRESHOLD
