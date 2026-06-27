# Forever, Somewhere

Personal couples app — memories, map, dreams, and letters.

## Run locally

**Backend:** `cd backend && .\venv\Scripts\uvicorn.exe app.main:app --reload --port 8000`

**Frontend:** `cd frontend && npm run dev`

## New features

- **Calendar** (`/calendar`) — shared view of memories, anniversaries, capsules
- **Slideshow** (`/slideshow`) — fullscreen photo screensaver
- **Date night** (`/date-night`) — couple questions + saved answers
- **Push notifications** — Settings → Enable reminders
- **Voice/video capsules** — Forever → attach media to time capsules
- **Deploy** — see [docs/DEPLOY.md](docs/DEPLOY.md) for Railway + Vercel two-phone sync

See [docs/FEATURE_BOUNDARIES.md](docs/FEATURE_BOUNDARIES.md) for how sections differ.
