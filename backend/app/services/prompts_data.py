from datetime import date

DAILY_QUESTIONS = [
    "What made you smile about us today?",
    "What's one thing you're grateful for about your partner?",
    "If we had a free day tomorrow, what would we do?",
    "What's a small moment recently you want to remember forever?",
    "What song reminds you of us right now?",
    "What's something new you want to try together?",
    "Where do you see us in one year?",
    "What's your favourite memory from this month?",
    "What would make this week feel special for us?",
    "What's one dream you want us to prioritize next?",
    "When did you last feel really close to me?",
    "What's something I do that you love?",
    "If we could relive one day together, which would it be?",
    "What's a place you've always wanted to take me?",
    "What inside joke should we never forget?",
]

COMPAT_QUIZ = [
    {"id": "q1", "question": "Ideal date night?", "options": ["Cozy home", "Fancy dinner", "Road trip", "Adventure"]},
    {"id": "q2", "question": "Love language?", "options": ["Words", "Touch", "Gifts", "Quality time", "Acts of service"]},
    {"id": "q3", "question": "Vacation vibe?", "options": ["Beach", "Mountains", "City", "Countryside"]},
    {"id": "q4", "question": "Morning or night person?", "options": ["Early bird", "Night owl", "Depends"]},
    {"id": "q5", "question": "Celebration style?", "options": ["Big party", "Intimate dinner", "Surprise", "Low-key"]},
    {"id": "q6", "question": "Conflict style?", "options": ["Talk immediately", "Cool off first", "Humor helps", "Write it out"]},
    {"id": "q7", "question": "Future home?", "options": ["Apartment city", "House suburbs", "Travel often", "Anywhere together"]},
    {"id": "q8", "question": "Pet preference?", "options": ["Dog", "Cat", "Both", "None"]},
]


def question_for_date(d: date | None = None) -> str:
    d = d or date.today()
    return DAILY_QUESTIONS[d.toordinal() % len(DAILY_QUESTIONS)]
