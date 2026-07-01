Here's a practical local test flow for the security changes.

## 1. Quick unit tests (no Google needed)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m pytest tests/ -v
```

This covers OAuth state signing, email allowlist logic, and the Sweeps parser.

---

## 2. Full stack (frontend + backend + DB)

Your `backend/.env` is mostly set for production. For local dev, **uncomment the overrides at the bottom** (or temporarily set):

```env
ENV=development
DATABASE_URL=postgresql+asyncpg://sweeps:sweeps@localhost:5432/sweeps
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
FRONTEND_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:3000
ALLOWED_EMAILS=your-email@gmail.com  # your Gmail, or leave empty to allow any
RATE_LIMIT_ENABLED=true
```

In Google Cloud OAuth client, ensure you have:
- Redirect URI: `http://localhost:8000/auth/google/callback`
- JS origin: `http://localhost:3000`

**Terminal 1 — Postgres:**
```bash
docker compose up -d db
```

**Terminal 2 — API:**
```bash
cd backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 3 — Next.js** (root `.env`):
```env
NEXT_PUBLIC_SWEEPS_API_URL=http://localhost:8000
```

```bash
npm run dev
```

Open [http://localhost:3000/sweeps](http://localhost:3000/sweeps) → **Sign in with Google**.

**What to verify:**
- Redirect goes to `/sweeps/auth/callback#token=...` (hash, not `?token=`)
- URL bar clears to `/sweeps` after sign-in
- Dashboard loads your jobs

---

## 3. Security feature checks (curl)

**Health + docs (dev only):**
```bash
curl http://localhost:8000/health
# → {"status":"ok"}

open http://localhost:8000/docs   # should work with ENV=development
```

**Rate limit on `/auth/google/login`** (11th request should 429):
```bash
for i in $(seq 1 12); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/auth/google/login)
  echo "$i → $code"
done
```
Expect `307`/`302` redirects for the first ~10, then `429`.

**Protected route without token:**
```bash
curl -s http://localhost:8000/jobs
# → 401 Unauthorized
```

**With token** (after sign-in, grab from DevTools → Application → Local Storage → `sweeps_auth_token`):
```bash
curl -s -H "Authorization: Bearer YOUR_TOKEN" http://localhost:8000/auth/me
```

**Email allowlist:** sign in with a Google account **not** in `ALLOWED_EMAILS` → should get `403` on callback. Your own email should work.

**OAuth state:** visit callback without going through login first:
```bash
curl -s "http://localhost:8000/auth/google/callback?code=fake&state=fake"
# → 400 Invalid OAuth state
```

---

## 4. Test production mode locally (optional)

Temporarily in `backend/.env`:
```env
ENV=production
```

Restart uvicorn, then:
```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/docs
# → 404
```

Switch back to `ENV=development` when done.

---

## Common gotchas

| Issue | Fix |
|--------|-----|
| OAuth redirect mismatch | `GOOGLE_REDIRECT_URI` must match Google Console exactly |
| CORS error on frontend | `CORS_ORIGINS=http://localhost:3000` |
| DB connection refused | `docker compose up -d db` + `localhost` in `DATABASE_URL` |
| Sign-in redirects to Vercel | Set `FRONTEND_URL=http://localhost:3000` |
| Rate limits while testing | Set `RATE_LIMIT_ENABLED=false` temporarily |

Fastest path: **pytest first**, then **docker db + uvicorn + npm run dev** with the local env overrides flipped on.