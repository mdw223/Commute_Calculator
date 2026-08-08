# Cover Letter Studio — Google, Gemini & Cloudflare Setup

This walks through everything needed to run Cover Letter Studio for real:
Google OAuth (sign-in), a Gemini API key (the writing AI), and a Cloudflare
R2 bucket (resume + `.docx` storage). It also covers running this backend
**alongside** the Sweeps backend locally, since they are two separate
services (see [../README.md](../README.md) for why).

## 1. Google OAuth

Cover Letter Studio uses its own `users` table and JWTs, but you can reuse
the **same Google Cloud project and OAuth Client** you already created for
Sweeps — you don't need a second OAuth client, and you don't need to run
this backend on the same port as Sweeps. A single OAuth Client supports
multiple registered redirect URIs.

### If you already have a Google Cloud OAuth Client (from Sweeps)

1. Go to [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials)
2. Open the OAuth 2.0 Client ID you use for Sweeps (`backend/.env`'s `GOOGLE_CLIENT_ID`)
3. Under **Authorized redirect URIs**, click **Add URI** and add:
   - Local dev: `http://localhost:8001/auth/google/callback`
   - Production: `https://YOUR-COVER-LETTER-API-DOMAIN/auth/google/callback`
4. Save. Both `http://localhost:8000/auth/google/callback` (Sweeps) and
   `http://localhost:8001/auth/google/callback` (Cover Letter Studio) can
   coexist on the same client — Google routes each login attempt to
   whichever `redirect_uri` your app actually sends.
5. Copy the same **Client ID** and **Client Secret** into
   `coverletter-backend/.env`:

   ```env
   GOOGLE_CLIENT_ID=...        # same value as backend/.env
   GOOGLE_CLIENT_SECRET=...    # same value as backend/.env
   GOOGLE_REDIRECT_URI=http://localhost:8001/auth/google/callback
   ```

That's the whole fix for "I see localhost" errors during sign-in — the
port never needs to match Sweeps, it just needs to be **registered**.

### If you're starting from scratch (no Sweeps OAuth client yet)

Follow [`../../backend/docs/GOOGLE_CLOUD_SETUP.md`](../../backend/docs/GOOGLE_CLOUD_SETUP.md)
steps 1–4, except:

- App name can be `Cover Letter Studio`
- Scopes only need: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`
  (no Gmail/Calendar scopes — this app never touches Gmail or Calendar)
- Authorized redirect URI: `http://localhost:8001/auth/google/callback`

## 2. Gemini API key (free tier)

1. Go to [Google AI Studio → API keys](https://aistudio.google.com/apikey)
2. Sign in and click **Create API key** (choose an existing or new Google
   Cloud project — it can be the same project as your OAuth client, or a
   different one, it doesn't matter)
3. Copy the key into `coverletter-backend/.env`:

   ```env
   GEMINI_API_KEY=your_key_here
   GEMINI_MODEL=gemini-2.5-flash
   ```

`gemini-2.5-flash` is the default because it has the most generous free-tier
daily quota. No credit card is required for the free tier.

## 3. Cloudflare R2 (object storage)

1. Go to the [Cloudflare dashboard](https://dash.cloudflare.com/) → **R2 Object Storage**
2. Click **Create bucket** — name it e.g. `cover-letter-studio`
3. Go to **R2 → Manage API Tokens → Create API Token**
   - Permissions: **Object Read & Write**
   - Scope it to the bucket you just created
4. Copy the generated **Access Key ID**, **Secret Access Key**, and your
   **Account ID** (shown on the R2 overview page) into
   `coverletter-backend/.env`:

   ```env
   R2_ACCOUNT_ID=your_cloudflare_account_id
   R2_ACCESS_KEY_ID=your_access_key_id
   R2_SECRET_ACCESS_KEY=your_secret_access_key
   R2_BUCKET_NAME=cover-letter-studio
   ```

R2's free tier (10 GB storage, no egress fees) is more than enough for
resumes and generated cover letters.

## 4. Running both backends locally at the same time

You do **not** need to deploy anything to test sign-in and generation —
everything below runs on `localhost`, using the second redirect URI you
registered in step 1.

```bash
# 1. Start both Postgres databases
docker compose up -d db coverletter_db

# 2. Sweeps backend (port 8000) — only needed if you're also testing /sweeps
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in Google OAuth + ORS
uvicorn app.main:app --reload --port 8000

# 3. Cover Letter Studio backend (port 8001) — separate terminal
cd coverletter-backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in Google OAuth (same client, step 1), Gemini, R2
uvicorn app.main:app --reload --port 8001

# 4. Frontend — separate terminal, from the repo root
echo 'NEXT_PUBLIC_SWEEPS_API_URL=http://localhost:8000' >> .env.local
echo 'NEXT_PUBLIC_COVER_LETTER_API_URL=http://localhost:8001' >> .env.local
npm run dev
```

Then visit `http://localhost:3000/cover-letters` and click **Sign in with
Google** — it will round-trip through `localhost:8001` and back, exactly
like Sweeps does through `localhost:8000`.

You only need to deploy the backend (see below) once you want a live URL
other people (or a Vercel preview deployment) can reach — local `npm run
dev` + local `uvicorn` is enough for your own testing.

## 5. Deploying (when you're ready)

Follow the same pattern as [`../../backend/docs/DEPLOYMENT.md`](../../backend/docs/DEPLOYMENT.md)
(Vercel for the frontend + a VPS/Railway for the API), substituting:

- A new subdomain/port for this API (e.g. `api-coverletters.tritechhelp.com`
  → `127.0.0.1:8001`, one more nginx site file, same pattern as the
  "Future automations" section of that doc)
- `coverletter-backend/.env` instead of `backend/.env`
- Add the production callback URL as a **third** entry on the same Google
  OAuth Client: `https://api-coverletters.tritechhelp.com/auth/google/callback`
- Set `NEXT_PUBLIC_COVER_LETTER_API_URL` in Vercel to that production URL
  (this is almost certainly why you saw `localhost` in a deployed preview —
  that env var wasn't set there yet)
