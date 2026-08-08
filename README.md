# Gas In This Economy

Calculate whether driving somewhere is worth your money and time in this economy.

Includes a **Sweeps Job Dashboard** (`/sweeps`) that ingests labeled Gmail notifications, shows jobs on a map, checks calendar conflicts, and computes drive-time worth-it analysis.

Also includes **Cover Letter Studio** (`/cover-letters`), an AI chat that writes a tailored cover letter from a pasted job description — using your uploaded resume(s) as context — and generates a downloadable `.docx`. See [coverletter-backend/README.md](coverletter-backend/README.md).

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- [OpenRouteService](https://openrouteservice.org/) for geocoding & driving directions
- **Sweeps automation:** Python FastAPI backend + PostgreSQL (Gmail + Google Calendar)
- **Cover Letter Studio:** separate Python FastAPI backend + PostgreSQL + [Gemini API](https://ai.google.dev/gemini-api) + [Cloudflare R2](https://developers.cloudflare.com/r2/) (own accounts, not shared with Sweeps — built to become a paid product)
- Deployed on Vercel (frontend) + Railway/VPS (backends)

## Setup

### Commute calculator

1. Clone and install:

```bash
npm install
```

2. Get a free API key from [openrouteservice.org](https://openrouteservice.org/)

3. Create `.env.local`:

```
ORS_API_KEY=your_key_here
NEXT_PUBLIC_SWEEPS_API_URL=http://localhost:8000
```

4. Run dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Sweeps automation (local)

```bash
docker compose up -d db
cd backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # configure Google OAuth + ORS
uvicorn app.main:app --reload --port 8000
```

See [backend/docs/GOOGLE_CLOUD_SETUP.md](backend/docs/GOOGLE_CLOUD_SETUP.md) for Google OAuth setup.

### Cover Letter Studio (local)

```bash
docker compose up -d coverletter_db
cd coverletter-backend && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # configure Google OAuth, Gemini API key, and R2 credentials
uvicorn app.main:app --reload --port 8001
```

See [coverletter-backend/README.md](coverletter-backend/README.md) and
[coverletter-backend/docs/SETUP.md](coverletter-backend/docs/SETUP.md) (Google OAuth,
Gemini API key, Cloudflare R2 — including how to reuse the same Google OAuth
client as Sweeps) for details.

## Deploy to Vercel

1. Push to GitHub and import in Vercel
2. Add environment variables:
   - `ORS_API_KEY`
   - `NEXT_PUBLIC_SWEEPS_API_URL` (your Sweeps backend URL)
   - `NEXT_PUBLIC_COVER_LETTER_API_URL` (your Cover Letter Studio backend URL)
3. Deploy

Backend deployment: [backend/docs/DEPLOYMENT.md](backend/docs/DEPLOYMENT.md)
