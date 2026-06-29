"""Calibration pairs — lexical path must separate same-topic vs different-topic."""
import pytest

from app.services.slip_match import match_threshold, pair_similarity

# Same meaning, different words (should match)
SHOULD_MATCH = [
    ("curious", "", "I want a slow cuddly evening together", "into", "", "Feeling unhurried and cozy tonight"),
    ("curious", "massage", "Would love a back rub after work", "into", "massage", "Thinking about shoulder rubs"),
    ("into", "romantic", "Missing our candlelit dinners", "curious", "romantic", "Want more date nights just us"),
    ("curious", "playful", "Feeling flirty and teasing today", "into", "playful", "In a fun mischievous mood"),
]

# Different topics (should NOT match)
SHOULD_NOT_MATCH = [
    ("curious", "massage", "weekend hiking in the mountains", "into", "romantic", "candlelit dinner at home"),
    ("curious", "bold", "Trying something intense and new", "into", "slow", "Quiet night just holding each other"),
    ("into", "adventure", "Road trip somewhere new", "curious", "words", "Want to talk about feelings more"),
]


@pytest.mark.parametrize("a_type,a_chip,a_body,b_type,b_chip,b_body", SHOULD_MATCH)
def test_same_topic_pairs_match(a_type, a_chip, a_body, b_type, b_chip, b_body):
    score = pair_similarity(a_type, a_chip, a_body, None, b_type, b_chip, b_body, None)
    assert score >= match_threshold(a_chip, b_chip), f"score {score} below threshold for: {a_body!r} vs {b_body!r}"


@pytest.mark.parametrize("a_type,a_chip,a_body,b_type,b_chip,b_body", SHOULD_NOT_MATCH)
def test_different_topic_pairs_rejected(a_type, a_chip, a_body, b_type, b_chip, b_body):
    score = pair_similarity(a_type, a_chip, a_body, None, b_type, b_chip, b_body, None)
    assert score < match_threshold(a_chip, b_chip), f"score {score} too high for: {a_body!r} vs {b_body!r}"
