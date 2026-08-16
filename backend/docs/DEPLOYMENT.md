# Sweeps Automation Deployment

**VPS-only:** Next.js frontend and Python backend both run on the Contabo box behind host nginx. Railway is documented as an alternative below.

| Component | Host | Public URL |
|-----------|------|------------|
| Dashboard (`/sweeps`) | Contabo VPS (systemd `commute-frontend`) | `https://jobs.tritechhelp.com` |
| Sweeps API | Contabo VPS (`vmi3257883`, Docker) | `https://api-jobs.tritechhelp.com` |
| Postgres | Docker (internal network) | not exposed publicly |

**Reverse proxy:** host nginx on the VPS (Path B — gateway).

- Operator architecture: [`/root/docs/vps-edge-proxy.md`](/root/docs/vps-edge-proxy.md)
- API site config: [`deploy/nginx/api-jobs.tritechhelp.com.conf`](../../deploy/nginx/api-jobs.tritechhelp.com.conf) → `/etc/nginx/sites-available/`
- Frontend site config: [`deploy/nginx/jobs.tritechhelp.com.conf`](../../deploy/nginx/jobs.tritechhelp.com.conf) → `/etc/nginx/sites-available/`
- Frontend unit: [`deploy/systemd/commute-frontend.service`](../../deploy/systemd/commute-frontend.service) → `/etc/systemd/system/`

---

## Architecture

```text
User on https://jobs.tritechhelp.com/sweeps
    → clicks "Sign in"
    → https://api-jobs.tritechhelp.com/auth/google/login
    → Google login
    → https://api-jobs.tritechhelp.com/auth/google/callback
    → backend issues JWT
    → https://jobs.tritechhelp.com/sweeps/auth/callback#token=...
```

Google OAuth is server-side on the Python backend — Google does **not** talk to the Next.js process for the callback.

```text
Internet :443
    │
    ▼
Host nginx (/etc/nginx/)          ← only thing on 80/443
    ├── jobs.tritechhelp.com         → 127.0.0.1:3003  (Next.js systemd)
    ├── api-jobs.tritechhelp.com     → 127.0.0.1:8000  (FastAPI Docker)
    └── api.islamiccalendarsync.com  → 127.0.0.1:3000  (/api rewrite)
```

Each project binds to `127.0.0.1:<port>` only. New automations on `tritechhelp.com` add one nginx site file + certbot — no app code changes.

---

## 1. DNS

At your `tritechhelp.com` registrar:

```text
Type: A
Name: api-jobs
Value: <Contabo VPS IP>
TTL: Auto / 300

Type: A
Name: jobs
Value: <Contabo VPS IP>
TTL: Auto / 300
```

---

## 2. VPS — clone and configure (Contabo)

### GitHub deploy key (one key per repo)

Deploy keys are scoped to a single repository. If you already have `id_ed25519_vps_deploy` on another repo (e.g. IslamicCalendarSync), generate a **new** key for Commute_Calculator:

```bash
ssh-keygen -t ed25519 -C "contabo-commute-calc" -f ~/.ssh/id_ed25519_commute_calc -N ""
chmod 600 ~/.ssh/id_ed25519_commute_calc
chmod 644 ~/.ssh/id_ed25519_commute_calc.pub
```

Append to `~/.ssh/config` (keep any existing `github-vps` entry):

```sshconfig
Host github-commute
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_commute_calc
    IdentitiesOnly yes
```

Add the public key to **Commute_Calculator → Settings → Deploy keys** (read-only is enough):

```bash
cat ~/.ssh/id_ed25519_commute_calc.pub
```

Or from your laptop:

```bash
ssh root@vmi3257883 'cat ~/.ssh/id_ed25519_commute_calc.pub' | \
  gh repo deploy-key add - --repo mdw223/Commute_Calculator -t "Contabo VPS Commute Calc"
```

Test:

```bash
ssh -T git@github-commute
# → Hi mdw223/Commute_Calculator! You've successfully authenticated...
```

### Clone and env

```bash
cd ~
git clone git@github-commute:mdw223/Commute_Calculator.git
cd Commute_Calculator
cp backend/.env.example backend/.env
# nano backend/.env
```

`docker-compose.yml` binds the API to localhost only:

```yaml
ports:
  - "127.0.0.1:8000:8000"
```

Postgres stays on the Compose internal network (`db:5432`). On the shared Contabo VPS the host publish of Postgres is **commented out** (ICS already uses `127.0.0.1:5432`). Uncomment that `ports` block (or use `127.0.0.1:5433:5432`) on a dedicated box / for local uvicorn — see comments in `docker-compose.yml`.

### `backend/.env` (production)

```env
ENV=production
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://api-jobs.tritechhelp.com/auth/google/callback
FRONTEND_URL=https://jobs.tritechhelp.com
CORS_ORIGINS=https://jobs.tritechhelp.com
ALLOWED_EMAILS=you@gmail.com
TRUSTED_HOSTS=api-jobs.tritechhelp.com,localhost,127.0.0.1
SECRET_KEY=<random 64-char string>
ENCRYPTION_KEY=<python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">
ORS_API_KEY=...
JWT_EXPIRE_MINUTES=1440
RATE_LIMIT_ENABLED=true
```

`ALLOWED_EMAILS`: comma-separated list for personal use. Leave **empty** to allow any Google account (open signup).

`backend/.env` lives only on the VPS (not in git). Frontend env is a separate gitignored `.env.local` at the repo root (see section 4).

Start the stack:

```bash
docker compose up -d --build
curl http://127.0.0.1:8000/health
# → {"status":"ok"}
```

---

## 3. VPS — host nginx gateway

Full shared-VPS layout: [`/root/docs/vps-edge-proxy.md`](/root/docs/vps-edge-proxy.md).

Versioned config for this API: copy [`deploy/nginx/api-jobs.tritechhelp.com.conf`](../../deploy/nginx/api-jobs.tritechhelp.com.conf) to `/etc/nginx/sites-available/api-jobs.tritechhelp.com`, symlink into `sites-enabled/`, then `nginx -t && systemctl reload nginx`.

If another project already owns ports 80/443 via Docker nginx, migrate to host nginx first.

### Diagnose

```bash
sudo ss -tlnp | grep -E ':80|:443'
docker ps --format "table {{.Names}}\t{{.Ports}}"
```

If `docker-proxy` binds 80/443 (e.g. `nginx_proxy_prod` from IslamicCalendarSync), free those ports before starting host nginx.

### IslamicCalendarSync migration (if applicable)

In `~/IslamicCalendarSync/docker-compose.yml`:

1. Expose `api_service_prod` on localhost: `127.0.0.1:3000:3000`
2. Remove public `80:80` and `443:443` bindings from `nginx_proxy_prod`

```bash
cd ~/IslamicCalendarSync
docker compose down && docker compose up -d
sudo ss -tlnp | grep -E ':80|:443'   # should be empty
```

### Nginx site: `api.islamiccalendarsync.com`

Create `/etc/nginx/sites-available/api.islamiccalendarsync.com` — mirrors the exported Docker config, upstream `127.0.0.1:3000`, `/api` rewrite. Reuse existing Let's Encrypt certs at `/etc/letsencrypt/live/api.islamiccalendarsync.com/`.

```bash
sudo ln -s /etc/nginx/sites-available/api.islamiccalendarsync.com /etc/nginx/sites-enabled/
```

(Full config with SSL + `/api` rewrite is in your Obsidian vault if you need the exact block.)

### Nginx site: `api-jobs.tritechhelp.com` (Sweeps)

**Do not replace a working Certbot SSL config with the HTTP-only block below.** If Certbot already created HTTPS on the VPS, use the **post-Certbot** file in the next subsection.

#### New site (HTTP only, before Certbot)

Create `/etc/nginx/sites-available/api-jobs.tritechhelp.com`:

```nginx
limit_req_zone $binary_remote_addr zone=sweeps_api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=sweeps_auth:10m rate=5r/m;

server {
    listen 80;
    listen [::]:80;
    server_name api-jobs.tritechhelp.com;

    location /auth/ {
        limit_req zone=sweeps_auth burst=5 nodelay;
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        limit_req zone=sweeps_api burst=20 nodelay;
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Then run `sudo certbot --nginx -d api-jobs.tritechhelp.com` and verify the HTTPS `server` block still has the `location /auth/` and `location /` blocks with `limit_req` and `proxy_set_header` (Certbot sometimes only adds SSL lines).

#### Post-Certbot (edit existing VPS file)

If you already have SSL from Certbot, **keep all Certbot SSL lines** and split the single `location /` into two locations with rate limits. Full file:

```nginx
limit_req_zone $binary_remote_addr zone=sweeps_api:10m rate=10r/s;
limit_req_zone $binary_remote_addr zone=sweeps_auth:10m rate=5r/m;

server {
    server_name api-jobs.tritechhelp.com;

    location /auth/ {
        limit_req zone=sweeps_auth burst=5 nodelay;
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        limit_req zone=sweeps_api burst=20 nodelay;
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen [::]:443 ssl ipv6only=on; # managed by Certbot
    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/api-jobs.tritechhelp.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/api-jobs.tritechhelp.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
}

server {
    if ($host = api-jobs.tritechhelp.com) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    listen [::]:80;
    server_name api-jobs.tritechhelp.com;
    return 404; # managed by Certbot
}
```

On the VPS:

```bash
sudo nano /etc/nginx/sites-available/api-jobs.tritechhelp.com
sudo nginx -t
sudo systemctl reload nginx
curl https://api-jobs.tritechhelp.com/health
```

`X-Real-IP` is required so the app's slowapi rate limiter sees the real client IP, not `127.0.0.1`. Rate limits on port 80 are optional — Certbot redirects HTTP to HTTPS, so the **443** block above is what matters.

```bash
sudo ln -s /etc/nginx/sites-available/api-jobs.tritechhelp.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl reload nginx
```

### SSL

```bash
sudo certbot --nginx -d api-jobs.tritechhelp.com
sudo certbot renew --dry-run
```

Verify:

```bash
curl https://api-jobs.tritechhelp.com/health
curl -I https://api.islamiccalendarsync.com/api/
sudo ss -tlnp | grep -E ':80|:443'   # should show nginx, not docker-proxy
```

### Future automations

Add one file per API under `/etc/nginx/sites-available/`:

```text
api-foo.tritechhelp.com  →  127.0.0.1:8001
```

Enable, `nginx -t`, `reload`, `certbot --nginx -d api-foo.tritechhelp.com`.

---

## 4. Deploy Next.js frontend (VPS)

The frontend is a systemd service bound to `127.0.0.1:3003` (not 3001 — Inbox Guard already uses that port). Host nginx proxies `jobs.tritechhelp.com` to it.

### One-time: Node, env, build, unit

Install **Node 22** on the host if missing (Next 16 needs Node 20+). Use NodeSource so systemd sees `/usr/bin/node` and `/usr/bin/npx` — nvm is invisible to systemd.

```bash
cd ~/Commute_Calculator
# .env.local is gitignored. NEXT_PUBLIC_* is baked in at build time.
cat > .env.local << 'EOF'
ORS_API_KEY=<same key as backend/.env>
NEXT_PUBLIC_SWEEPS_API_URL=https://api-jobs.tritechhelp.com
EOF
npm ci
npm run build
sudo cp deploy/systemd/commute-frontend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now commute-frontend
ss -tlnp | grep 3003   # should show 127.0.0.1:3003
```

`.env.local` must exist **before** `npm run build` so `NEXT_PUBLIC_SWEEPS_API_URL` is inlined. `ORS_API_KEY` is read at runtime by Next.js API routes (`/api/geocode`, `/api/route`, `/api/pois`).

### Nginx + TLS

Copy [`deploy/nginx/jobs.tritechhelp.com.conf`](../../deploy/nginx/jobs.tritechhelp.com.conf) (HTTP-only) after the DNS A record for `jobs` points here:

```bash
sudo cp deploy/nginx/jobs.tritechhelp.com.conf /etc/nginx/sites-available/jobs.tritechhelp.com
sudo ln -sf /etc/nginx/sites-available/jobs.tritechhelp.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d jobs.tritechhelp.com
```

After Certbot, copy the live SSL file back into `deploy/nginx/jobs.tritechhelp.com.conf` (same pattern as `api-jobs`).

Pushes to `main` rebuild and restart the frontend via GitHub Actions (section 6).

---

## 5. Google OAuth

See [GOOGLE_CLOUD_SETUP.md](./GOOGLE_CLOUD_SETUP.md) for API enablement and consent screen.

### Production OAuth client settings

**Authorized redirect URIs** — must match `GOOGLE_REDIRECT_URI` exactly (no trailing slash):

| Environment | URI |
|-------------|-----|
| Production | `https://api-jobs.tritechhelp.com/auth/google/callback` |
| Local dev | `http://localhost:8000/auth/google/callback` |

Do **not** use `127.0.0.1`, raw VPS IP, or a Vercel URL for the callback.

**Authorized JavaScript origins:**

| Environment | Origin |
|-------------|--------|
| Production frontend | `https://jobs.tritechhelp.com` |
| Local frontend | `http://localhost:3000` |

Add your Gmail as a **test user** while the app is in Testing mode.

---

## 6. Auto-deploy on push to `main` (GitHub Actions)

Workflow: [`.github/workflows/deploy-vps.yml`](../../.github/workflows/deploy-vps.yml)

Runs `git pull`, `docker compose up --build -d`, `npm ci`, `npm run build`, and `systemctl restart commute-frontend`. Deploys **backend + frontend**.

Add **repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Example |
|--------|---------|
| `VPS_HOST` | Contabo server IP or hostname |
| `VPS_USER` | `root` or deploy user |
| `VPS_DEPLOY_PATH` | `/root/Commute_Calculator` |
| `VPS_SSH_KEY` | Private key for Actions → VPS (`github_actions_vps` in `authorized_keys` — **not** the VPS→GitHub deploy key) |

One-time on VPS: clone repo, configure `backend/.env` and `.env.local`, install `commute-frontend.service`, ensure `git remote` can pull `main` (via `github-commute` deploy key).

### Key map (this VPS)

```text
IslamicCalendarSync    →  git@github-vps:...      →  id_ed25519_vps_deploy
Commute_Calculator     →  git@github-commute:... →  id_ed25519_commute_calc
GitHub Actions → VPS   →  github_actions_vps      →  authorized_keys
SSH into VPS           →  laptop key              →  authorized_keys
```

---

## 7. Verify

1. `curl https://api-jobs.tritechhelp.com/health` → `{"status":"ok"}`
2. Visit `https://jobs.tritechhelp.com/sweeps`
3. Sign in with Google
4. Create Gmail filter (Settings page): `from:newjob@sweeps.jobs` → label `Sweeps`
5. Forward a Sweeps email or wait for a new one
6. Job should appear within ~2 minutes

---

## 8. Security and rate limiting

The FastAPI app enforces:

| Layer | What |
|-------|------|
| **JWT** | All job/calendar routes require `Authorization: Bearer` |
| **OAuth state** | Signed cookie validates CSRF on Google callback |
| **Email allowlist** | `ALLOWED_EMAILS` — empty = open signup |
| **slowapi** | Per-IP limits on `/auth/*` and `/health`; per-user limits on ORS/calendar routes |
| **Production** | `ENV=production` disables `/docs`, enables `TrustedHostMiddleware` |
| **nginx** | Coarse `limit_req` on `/auth/` and global API (see section 3) |

### Security env vars

| Variable | Production | Notes |
|----------|------------|-------|
| `ENV` | `production` | Disables OpenAPI docs |
| `ALLOWED_EMAILS` | `you@gmail.com` | Empty = any Google account |
| `TRUSTED_HOSTS` | `api-jobs.tritechhelp.com` | Host header validation |
| `JWT_EXPIRE_MINUTES` | `1440` | 24h; user re-logs in after expiry |
| `RATE_LIMIT_ENABLED` | `true` | Set `false` only for local debugging |

### App rate limits (slowapi)

| Route | Limit |
|-------|-------|
| `GET /health` | 60/min per IP |
| `GET /auth/google/login` | 10/min per IP |
| `GET /auth/google/callback` | 20/min per IP |
| `POST /jobs/*/commute` | 30/hour per user |
| `POST /jobs/plan-route` | 20/hour per user |
| Calendar endpoints | 60/hour per user |
| Other authenticated routes | 120/min per user |

JWT is delivered via URL **hash fragment** (`/sweeps/auth/callback#token=...`) so it is not logged by servers or sent in Referer headers.

---

## Pre-flight checklist

- [ ] DNS A records `api-jobs` and `jobs` → VPS IP
- [ ] `api_service_prod` on `127.0.0.1:3000`; Docker nginx `proxy` commented out in ICS `compose.prod.yml` (if sharing VPS)
- [ ] Host nginx site configs from `deploy/nginx/` in `/etc/nginx/sites-available/`
- [ ] Architecture doc: `/root/docs/vps-edge-proxy.md`
- [ ] `sudo nginx -t` passes
- [ ] `docker compose up -d` — API on `127.0.0.1:8000` (Sweeps Postgres not publishing host 5432 beside ICS)
- [ ] Node 22 on the host; `.env.local` filled; `commute-frontend` enabled on `127.0.0.1:3003`
- [ ] Certbot SSL for `api-jobs.tritechhelp.com` and `jobs.tritechhelp.com`
- [ ] `curl https://api-jobs.tritechhelp.com/health` OK
- [ ] `curl -I https://jobs.tritechhelp.com` OK
- [ ] Google redirect URI + JS origin saved (`https://jobs.tritechhelp.com`)
- [ ] `backend/.env` `FRONTEND_URL` / `CORS_ORIGINS` set to `https://jobs.tritechhelp.com`
- [ ] Test: `https://jobs.tritechhelp.com/sweeps` → Sign in with Google

---

## Alternative: Railway

If you prefer managed hosting instead of the VPS:

1. Create a [Railway](https://railway.app) project
2. Add **PostgreSQL** → copy `DATABASE_URL` (use `postgresql+asyncpg://` prefix)
3. Add a service from `backend/` (Dockerfile)
4. Set environment variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | From Railway Postgres |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth client |
| `GOOGLE_REDIRECT_URI` | `https://YOUR-RAILWAY-URL/auth/google/callback` |
| `FRONTEND_URL` / `CORS_ORIGINS` | `https://jobs.tritechhelp.com` |
| `SECRET_KEY` / `ENCRYPTION_KEY` / `ORS_API_KEY` | See `backend/.env.example` |

5. Point the VPS frontend `.env.local` `NEXT_PUBLIC_SWEEPS_API_URL` at the Railway URL and rebuild (`npm run build` + `systemctl restart commute-frontend`)
6. Add the Railway callback URI to Google OAuth redirect URIs

---

## Cost estimate

| Service | Cost |
|---------|------|
| Contabo VPS | ~$5–7/mo (shared with other projects) |
| Railway (alternative) | ~$5/mo |
| ORS API | Free tier |
| Google APIs | Free for personal use |
