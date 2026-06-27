# Deploy Forever, Somewhere — full walkthrough

Jay & Ikshika can use the **same app on Android and iPhone**. Both install it from the browser (no App Store needed). Data syncs through the shared backend.

---

## Android & iPhone support

| Feature | Android (Chrome) | iPhone (Safari) |
|---------|------------------|-----------------|
| Open in browser | Yes | Yes |
| Add to Home Screen (app icon) | Yes | Yes |
| Offline viewing (cached) | Yes | Yes |
| Map, photos, memories | Yes | Yes |
| Local notifications (app open) | Yes | Yes |
| Push notifications (background) | Yes (Chrome) | Yes (iOS **16.4+**, only when installed to Home Screen) |
| Voice/video capsules | Yes | Yes |

**Summary:** Works on **both** phones. Install via **Add to Home Screen** on each device. Use the **same frontend URL** on both — that’s what keeps you in sync.

---

## Before you start

You need:

1. A **GitHub** account (repo pushed)
2. **Backend:** [Render](https://render.com) *or* [Railway](https://railway.app)
3. **Frontend:** [Vercel](https://vercel.com) *or* Render Static Site

Estimated time: **20–30 minutes**.

---

## Deploy on Render (yes — fully supported)

The repo includes **`render.yaml`** at the root for one-click backend setup.

### Backend on Render

**Blueprint (easiest):**

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect GitHub → select `forever-somewhere`
3. Set **`CORS_ORIGINS`** when prompted (your frontend URL — set after frontend deploy if needed)
4. Deploy → copy API URL: `https://forever-somewhere-api.onrender.com`

**Manual:** New → Web Service → Root `backend` → Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT` → Add disk at **`/data`** → env vars same as blueprint.

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | `sqlite:////data/forever_somewhere.db` |
| `UPLOAD_DIR` | `/data/uploads` |
| `CORS_ORIGINS` | your frontend URL |

### Frontend with Render

**Option A — Vercel:** set `VITE_API_URL` to your Render API URL (see Part 3 below).

**Option B — Render Static Site:** Root `frontend`, Build `npm install && npm run build`, Publish `dist`, env `VITE_API_URL=https://YOUR-API.onrender.com`.

### Render notes

- **Free tier:** API sleeps after ~15 min idle; first load may be slow (~30–60s wake-up).
- **Persistent disk:** needed for SQLite + photos; requires a **paid** Render plan (check current pricing).
- **Android & iPhone:** unchanged — same frontend URL, Add to Home Screen on both.

---

## Part 1 — Push code to GitHub

If the project isn’t on GitHub yet:

```powershell
cd D:\forever-somewhere
git init
git add .
git commit -m "Forever Somewhere — ready to deploy"
```

Create a new repo on GitHub (private is fine), then:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/forever-somewhere.git
git branch -M main
git push -u origin main
```

---

## Part 2 — Deploy the backend (Railway)

### Step 1: New project

1. Go to [railway.app](https://railway.app) → **New Project**
2. **Deploy from GitHub repo** → select `forever-somewhere`
3. Railway may auto-detect the repo — if it deploys the wrong folder, continue below

### Step 2: Set root directory

1. Click your service → **Settings**
2. **Root Directory** → `backend`
3. **Start Command** (if empty):

   ```
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```

### Step 3: Persistent storage (important)

SQLite and uploaded photos must survive restarts:

1. In your Railway project → **+ New** → **Volume**
2. Mount path: `/data`
3. Attach the volume to your backend service

### Step 4: Environment variables

Service → **Variables** → add:

| Variable | Value |
|----------|--------|
| `DATABASE_URL` | `sqlite:////data/forever_somewhere.db` |
| `UPLOAD_DIR` | `/data/uploads` |
| `CORS_ORIGINS` | `https://YOUR-APP.vercel.app` *(update after Part 3)* |

Leave `CORS_ORIGINS` as localhost for now if Vercel URL isn’t ready:

```
http://localhost:5173,https://YOUR-APP.vercel.app
```

### Step 5: Public URL

1. **Settings** → **Networking** → **Generate Domain**
2. Copy the URL, e.g. `https://forever-somewhere-production.up.railway.app`
3. Test in browser: open that URL — you should see `{"message":"Forever Somewhere API running"}`

---

## Part 3 — Deploy the frontend (Vercel)

### Step 1: Import project

1. [vercel.com](https://vercel.com) → **Add New** → **Project**
2. Import the same GitHub repo
3. **Root Directory** → `frontend` (Edit → set to `frontend`)

### Step 2: Environment variable (required)

Under **Environment Variables**, add:

| Name | Value |
|------|--------|
| `VITE_API_URL` | `https://forever-somewhere-production.up.railway.app` |

Use your **actual** Railway URL — no trailing slash.

Vite bakes this in at **build time**, so you must set it **before** the first deploy (or redeploy after adding it).

### Step 3: Deploy

Click **Deploy**. When done, Vercel gives you a URL like:

```
https://forever-somewhere.vercel.app
```

### Step 4: Connect backend CORS

Go back to **Railway** → Variables → update `CORS_ORIGINS`:

```
https://forever-somewhere.vercel.app
```

(Redeploy backend if needed — Railway usually auto-redeploys on variable change.)

### Step 5: Verify sync

1. Open your Vercel URL on a laptop
2. Dashboard should show **● Synced** (not Offline mode)
3. Add a test memory on Moments
4. Open the same URL on your phone — the memory should appear

---

## Part 4 — Install on both phones

### iPhone (Safari)

1. Open your **Vercel URL** in **Safari** (not Chrome)
2. Tap **Share** (square with arrow)
3. **Add to Home Screen**
4. Name it **Forever** → Add
5. Open from home screen → **Settings** → **Enable reminders** (optional)

### Android (Chrome)

1. Open your **Vercel URL** in Chrome
2. Menu (⋮) → **Install app** or **Add to Home screen**
3. Confirm
4. **Settings** → **Enable reminders** (optional)

Both of you use the **exact same URL**. That’s your shared world.

---

## Part 5 — Push notifications (optional)

For reminders when the app isn’t open:

### Generate VAPID keys (once, on your PC)

```powershell
npx web-push generate-vapid-keys
```

Add to **Railway** variables:

| Variable | Value |
|----------|--------|
| `VAPID_PUBLIC_KEY` | *(public key from command)* |
| `VAPID_PRIVATE_KEY` | *(private key from command)* |
| `VAPID_CLAIMS_EMAIL` | `mailto:your@email.com` |

On each phone: **Settings → Enable reminders** → allow notifications.

### Daily cron (optional)

Railway → your service → **Cron** or use an external cron to hit:

```
POST https://YOUR-RAILWAY-URL/api/push/broadcast
```

Once per day is enough for anniversary/capsule reminders.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Dashboard says **Offline mode** | Check `VITE_API_URL` on Vercel, redeploy frontend |
| **CORS error** in browser console | Add exact Vercel URL to Railway `CORS_ORIGINS` |
| **Photos don’t load** after deploy | Ensure `VITE_API_URL` is set and frontend was redeployed after |
| **Data lost** on Railway restart | Confirm volume mounted at `/data` and env paths use `/data/` |
| iPhone push not working | Must use **Safari**, **Add to Home Screen**, iOS **16.4+** |
| Old localStorage data | First connect with API online — auto-migrates once |

---

## Quick reference

| What | URL |
|------|-----|
| App (share this with Ikshika) | `https://YOUR-APP.vercel.app` |
| API (don’t share publicly) | `https://YOUR-API.up.railway.app` |
| API health check | `https://YOUR-API.up.railway.app/` |

---

## Order of operations (cheat sheet)

```
1. GitHub push
2. Railway: backend + volume + env vars + public domain
3. Vercel: frontend + VITE_API_URL=Railway URL
4. Railway: CORS_ORIGINS=Vercel URL
5. Both phones: open Vercel URL → Add to Home Screen
6. Optional: VAPID keys + Enable reminders
```

You’re done when both phones show **● Synced** and see the same memories.
