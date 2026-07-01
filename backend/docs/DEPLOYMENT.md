# Sweeps Automation Deployment

Hybrid setup: **Next.js on Vercel** + **Python backend on Railway** (or VPS).

## 1. Deploy Python backend (Railway)

1. Create a [Railway](https://railway.app) project
2. Add **PostgreSQL** plugin → copy `DATABASE_URL` (use `postgresql+asyncpg://` prefix if needed)
3. Add a service from this repo's `backend/` directory (Dockerfile)
4. Set environment variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | From Railway Postgres (ensure `+asyncpg` driver) |
| `GOOGLE_CLIENT_ID` | Google Cloud OAuth client |
| `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth secret |
| `GOOGLE_REDIRECT_URI` | `https://YOUR-RAILWAY-URL/auth/google/callback` |
| `FRONTEND_URL` | `https://YOUR-VERCEL-APP.vercel.app` |
| `CORS_ORIGINS` | Same as `FRONTEND_URL` |
| `SECRET_KEY` | Random 64-char string |
| `ENCRYPTION_KEY` | `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` |
| `ORS_API_KEY` | OpenRouteService API key |

5. Note the public Railway URL (e.g. `https://sweeps-api-production.up.railway.app`)

### Alternative: VPS (Contabo / Hetzner)

```bash
# On VPS with Docker
git clone git@github.com:mdw223/Commute_Calculator.git
cd Commute_Calculator
cp backend/.env.example backend/.env  # configure
docker compose up -d --build
```

Use host nginx for HTTPS and proxy `api-jobs.tritechhelp.com` → `127.0.0.1:8000`.

#### Auto-deploy on push to `main` (GitHub Actions)

Workflow: [`.github/workflows/deploy-vps.yml`](../../.github/workflows/deploy-vps.yml)

Add these **repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Example |
|--------|---------|
| `VPS_HOST` | Your server IP or hostname |
| `VPS_USER` | SSH login user |
| `VPS_DEPLOY_PATH` | `/home/you/Commute_Calculator` |
| `VPS_SSH_KEY` | Private key for Actions → VPS (generate a dedicated key pair; add the public key to `~/.ssh/authorized_keys` on the VPS) |

`backend/.env` lives only on the VPS (not in git). The workflow runs `git pull` + `docker compose up --build -d`.

The Next.js frontend still deploys automatically via **Vercel** when you push to `main`.

## 2. Deploy Next.js frontend (Vercel)

1. Import the repo in Vercel (existing Commute Calculator project)
2. Add environment variable:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SWEEPS_API_URL` | Your Railway backend URL |
| `ORS_API_KEY` | (existing) |

3. Redeploy

## 3. Finalize Google OAuth

Add to **Authorized redirect URIs**:

- `https://YOUR-RAILWAY-URL/auth/google/callback`

Add to **Authorized JavaScript origins** (optional):

- `https://YOUR-VERCEL-APP.vercel.app`

## 4. Verify

1. Visit `https://YOUR-VERCEL-APP.vercel.app/sweeps`
2. Sign in with Google
3. Create Gmail filter (Settings page)
4. Forward a Sweeps email or wait for a new one
5. Job should appear within ~2 minutes

## Cost estimate

| Service | Cost |
|---------|------|
| Vercel (hobby) | Free |
| Railway (starter) | ~$5/mo |
| ORS API | Free tier |
| Google APIs | Free for personal use |
