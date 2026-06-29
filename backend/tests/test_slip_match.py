from app.services.slip_match import cosine_similarity, match_threshold, pair_similarity


def test_cosine_identical():
    v = [1.0, 0.0, 0.0]
    assert cosine_similarity(v, v) == 1.0


def test_cosine_orthogonal():
    assert cosine_similarity([1.0, 0.0], [0.0, 1.0]) == 0.0


def test_pair_similarity_same_meaning_lexical_fallback():
    score = pair_similarity(
        "curious",
        "slow",
        "I want a slow cuddly evening together",
        None,
        "into",
        "slow",
        "Feeling unhurried and cozy tonight",
        None,
    )
    assert score >= match_threshold("slow", "slow")


def test_pair_similarity_different_topics_low():
    score = pair_similarity(
        "curious",
        "massage",
        "weekend hiking trip in the mountains",
        None,
        "into",
        "romantic",
        "candlelit dinner at home",
        None,
    )
    assert score < match_threshold("massage", "romantic")


def test_match_threshold_same_chip_lower():
    assert match_threshold("playful", "playful") < match_threshold("", "")


def test_match_threshold_different_chip_higher():
    assert match_threshold("massage", "bold") > match_threshold("playful", "playful")
