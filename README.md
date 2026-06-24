# Gas In This Economy

Calculate whether driving somewhere is worth your money and time in this economy.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- [OpenRouteService](https://openrouteservice.org/) for geocoding & driving directions
- Deployed on Vercel (API routes keep the ORS key server-side)
- User preferences in `localStorage` only — no database

## Setup

1. Clone and install:

```bash
npm install
```

2. Get a free API key from [openrouteservice.org](https://openrouteservice.org/)

3. Create `.env.local`:

```
ORS_API_KEY=your_key_here
```

4. Run dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

1. Push to GitHub and import in Vercel
2. Add `ORS_API_KEY` under Project → Settings → Environment Variables
3. Deploy
