from datetime import date, timedelta


def week_start(d: date) -> date:
    return d - timedelta(days=d.weekday())


def month_start(d: date) -> date:
    return d.replace(day=1)


def resolve_period_start(d: date | None, period_type: str) -> date:
    today = d or date.today()
    if period_type == "month":
        return month_start(today)
    return week_start(today)
