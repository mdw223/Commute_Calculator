# Sweeps Automation Backend

FastAPI service for Gmail ingestion, job parsing, and Google Calendar integration.

## Local development

```bash
# Start Postgres + backend
docker compose up -d db
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in Google OAuth + ORS keys
uvicorn app.main:app --reload --port 8000
```

## Tests

```bash
cd backend && .venv/bin/python -m pytest tests/ -v
```

## Google Cloud setup

See [docs/GOOGLE_CLOUD_SETUP.md](docs/GOOGLE_CLOUD_SETUP.md).

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
