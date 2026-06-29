"""Romantic prompts, date-night deck, and letter starters by mood."""

LETTER_PROMPTS_BY_MOOD: dict[str, list[dict[str, str]]] = {
    "Joyful": [
        {"id": "j1", "prompt": "Today made me laugh because…", "starter": "Today made me laugh because you…"},
        {"id": "j2", "prompt": "The happiest moment we shared recently was…", "starter": "The happiest moment we shared recently was when…"},
        {"id": "j3", "prompt": "I can't wait to celebrate with you…", "starter": "I can't wait to celebrate with you when…"},
    ],
    "Peaceful": [
        {"id": "p1", "prompt": "When I'm with you, the world feels…", "starter": "When I'm with you, the world feels quiet in the best way…"},
        {"id": "p2", "prompt": "A calm memory I return to is…", "starter": "A calm memory I return to is the night we…"},
        {"id": "p3", "prompt": "Thank you for making home feel like…", "starter": "Thank you for making home feel like…"},
    ],
    "Excited": [
        {"id": "e1", "prompt": "I'm buzzing about us because…", "starter": "I'm buzzing about us because…"},
        {"id": "e2", "prompt": "The next adventure I want with you is…", "starter": "The next adventure I want with you is…"},
        {"id": "e3", "prompt": "Something new I discovered about you…", "starter": "Something new I discovered about you lately…"},
    ],
    "Grateful": [
        {"id": "g1", "prompt": "Three things I'm grateful for about you…", "starter": "Three things I'm grateful for about you:\n1.\n2.\n3."},
        {"id": "g2", "prompt": "You showed up for me when…", "starter": "You showed up for me when…"},
        {"id": "g3", "prompt": "I don't say this enough, but…", "starter": "I don't say this enough, but…"},
    ],
    "Romantic": [
        {"id": "r1", "prompt": "Open when you miss me…", "starter": "Open when you miss me,\n\nRight now I am thinking…"},
        {"id": "r2", "prompt": "The way you look at me makes me feel…", "starter": "The way you look at me makes me feel…"},
        {"id": "r3", "prompt": "Dear future us…", "starter": "Dear future us,\n\nLooking back from…"},
        {"id": "r4", "prompt": "If I could slow down one moment with you…", "starter": "If I could slow down one moment with you, it would be…"},
    ],
    "Silly": [
        {"id": "s1", "prompt": "Our weirdest inside joke is…", "starter": "Our weirdest inside joke is…"},
        {"id": "s2", "prompt": "If we were characters in a movie…", "starter": "If we were characters in a movie, we'd be…"},
        {"id": "s3", "prompt": "The most ridiculous thing I love about you…", "starter": "The most ridiculous thing I love about you is…"},
    ],
    "Cozy": [
        {"id": "c1", "prompt": "Open when you feel sad…", "starter": "Open when you feel sad,\n\nI want you to know…"},
        {"id": "c2", "prompt": "Our perfect rainy day together…", "starter": "Our perfect rainy day together would be…"},
        {"id": "c3", "prompt": "The little ritual I love with you…", "starter": "The little ritual I love with you is…"},
    ],
}

FIRST_TAGS = frozenset(
    {
        "First Trip",
        "First Kiss",
        "First Date",
        "Engagement",
        "Wedding",
    }
)

DATE_NIGHT_DECK: list[dict[str, str]] = [
    {"id": "d1", "suit": "Activity", "title": "Cook a new recipe together", "detail": "Pick one cuisine neither of you has tried. Split tasks — one chops, one stirs."},
    {"id": "d2", "suit": "Activity", "title": "Stargazing walk", "detail": "Find a dark spot, bring a blanket, name a constellation after your inside joke."},
    {"id": "d3", "suit": "Activity", "title": "Photo scavenger hunt", "detail": "Each of you gets 5 prompts (something blue, something that reminds you of us…). Compare albums after."},
    {"id": "d4", "suit": "Food", "title": "Blind taste test", "detail": "Blindfold your partner. Feed them 5 snacks — they guess each one."},
    {"id": "d5", "suit": "Food", "title": "Build-your-own board", "detail": "Cheese, fruit, chocolate — arrange it like art. No phones until it's gone."},
    {"id": "d6", "suit": "Food", "title": "Recreate your first date meal", "detail": "Same dish or same vibe. Swap the story of that night."},
    {"id": "d7", "suit": "Music", "title": "Playlist swap", "detail": "Each makes a 10-song playlist for the other. Listen start to finish together."},
    {"id": "d8", "suit": "Music", "title": "Living room dance", "detail": "One song each — no skipping. Slow dance counts double."},
    {"id": "d9", "suit": "Music", "title": "Karaoke night", "detail": "Pick a duet or take turns. Bonus: record a 30-second clip for your capsule wall."},
    {"id": "d10", "suit": "Deep talk", "title": "Rose, thorn, bud", "detail": "Rose = best part of your week. Thorn = hard part. Bud = something you're looking forward to."},
    {"id": "d11", "suit": "Deep talk", "title": "Letter read-aloud", "detail": "Write 3 sentences you'd want read at your wedding. Read them to each other tonight."},
    {"id": "d12", "suit": "Deep talk", "title": "Future postcard", "detail": "Describe a day together five years from now — hour by hour."},
    {"id": "d13", "suit": "Surprise", "title": "Mystery envelope", "detail": "One of you hides a tiny note somewhere in the house. The other finds it before dessert."},
    {"id": "d14", "suit": "Surprise", "title": "Swap roles night", "detail": "Whoever usually plans tonight — the other takes over completely."},
    {"id": "d15", "suit": "Surprise", "title": "Memory roulette", "detail": "Open the app, hit Surprise Memory, retell that day in full detail."},
    {"id": "d16", "suit": "Activity", "title": "Build a blanket fort", "detail": "Fort + fairy lights + one movie you both loved as kids."},
    {"id": "d17", "suit": "Food", "title": "Breakfast for dinner", "detail": "Pancakes, masala chai, or whatever feels like morning at midnight."},
    {"id": "d18", "suit": "Deep talk", "title": "36 questions", "detail": "Pick 6 questions from Date Night — alternate asking. No multitasking."},
]
