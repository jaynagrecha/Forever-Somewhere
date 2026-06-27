# Get on GitHub first

Do this **before** Render or Vercel. Takes about 10 minutes.

---

## Step 1 — Create an empty repo on GitHub

1. Go to [github.com/new](https://github.com/new)
2. **Repository name:** `forever-somewhere` (or any name you like)
3. **Private** — recommended (personal photos & letters)
4. Do **not** check “Add README” or “Add .gitignore” (we already have files locally)
5. Click **Create repository**
6. Copy the URL GitHub shows, e.g.  
   `https://github.com/YOUR_USERNAME/forever-somewhere.git`

---

## Step 2 — Initialize Git on your PC

Open PowerShell in the project folder:

```powershell
cd D:\forever-somewhere
git init
git branch -M main
git add .
git status
```

`git status` should list your source files. It should **not** list:

- `node_modules/`
- `backend/venv/`
- `backend/*.db`
- `.env` files

Those are excluded by `.gitignore`.

---

## Step 3 — First commit

```powershell
git commit -m "Forever Somewhere — initial commit"
```

---

## Step 4 — Push to GitHub

Replace with your real URL from Step 1:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/forever-somewhere.git
git push -u origin main
```

GitHub may ask you to sign in (browser or personal access token).

---

## Step 5 — Verify

Refresh your GitHub repo page — you should see:

- `backend/`
- `frontend/`
- `render.yaml`
- `docs/`
- `README.md`

---

## Then deploy

| Next step | Guide |
|-----------|--------|
| Render backend | [DEPLOY.md](./DEPLOY.md#deploy-on-render-yes--fully-supported) |
| Vercel frontend | [DEPLOY.md](./DEPLOY.md#part-3--deploy-the-frontend-vercel) |

---

## If `git push` asks for a password

GitHub no longer accepts account passwords for Git. Use either:

1. **GitHub CLI:** `gh auth login` then push again  
2. **Personal Access Token:** GitHub → Settings → Developer settings → Tokens → use token as password  
3. **SSH:** add SSH key to GitHub and use `git@github.com:USER/forever-somewhere.git`

---

## Optional — GitHub Desktop

If you prefer a GUI: [desktop.github.com](https://desktop.github.com) → Add existing repository → Publish repository.
