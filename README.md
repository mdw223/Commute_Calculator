# Gas In This Economy

Calculate whether driving somewhere is worth your money and time in this economy.

Includes a **Sweeps Job Dashboard** (`/sweeps`) that ingests labeled Gmail notifications, shows jobs on a map, checks calendar conflicts, and computes drive-time worth-it analysis.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- [OpenRouteService](https://openrouteservice.org/) for geocoding & driving directions
- **Sweeps automation:** Python FastAPI backend + PostgreSQL (Gmail + Google Calendar)
- Deployed on Vercel (frontend) + Railway/VPS (backend)

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

## Deploy to Vercel

1. Push to GitHub and import in Vercel
2. Add environment variables:
   - `ORS_API_KEY`
   - `NEXT_PUBLIC_SWEEPS_API_URL` (your backend URL)
3. Deploy

Backend deployment: [backend/docs/DEPLOYMENT.md](backend/docs/DEPLOYMENT.md)
