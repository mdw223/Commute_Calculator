# Cover Letter Studio backend

Python FastAPI service powering the `/cover-letters` feature: per-user resume
storage, an AI chat that writes tailored cover letters from a pasted job
description, and `.docx` generation.

This intentionally follows the same auth pattern as `../backend` (the Sweeps
service) — Google OAuth login issuing a first-party JWT — but keeps its own
database and `users` table. Accounts are **not** shared with Sweeps, since
this product is expected to become an independently-billed paid service.

## Stack

- FastAPI + SQLAlchemy (async) + PostgreSQL
- Google OAuth for sign-in (identity only — no Gmail/Calendar scopes needed)
- [Cloudflare R2](https://developers.cloudflare.com/r2/) for storing uploaded
  resumes and generated `.docx` files (S3-compatible API via `boto3`)
- [Gemini API](https://ai.google.dev/gemini-api) (`google-genai` SDK) for the
  cover-letter writing chat, using function calling to finalize a letter
- [`docxtpl`](https://docxtpl.readthedocs.io/) to render the model's output
  into `app/templates/cover_letter_default.docx`

## How a cover letter gets generated

1. User uploads resume(s) (PDF/DOCX/TXT) via `POST /documents`. The original
   file is stored in R2; the extracted plain text is cached in Postgres.
2. One resume is flagged `is_default` and is automatically attached (as
   text) to every new conversation — no manual re-attaching per chat.
3. `POST /conversations` (with a pasted job description) or
   `POST /conversations/{id}/messages` sends the full chat history plus the
   candidate's resume/profile text to Gemini with a `generate_cover_letter`
   function tool.
4. Once the model has enough information, it calls that tool with the
   letter's structured fields (company, role, paragraphs). The backend
   never lets the model emit a document directly — it renders those fields
   into the `.docx` template with `docxtpl`, uploads the result to R2, and
   returns a download link.

## Local development

```bash
docker compose up -d coverletter_db
cd coverletter-backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # configure Google OAuth, Gemini, and R2 credentials
uvicorn app.main:app --reload --port 8001
```

Regenerating the default template (only needed if you change its layout):

```bash
python scripts/generate_template.py
```

## Full setup guide (Google OAuth, Gemini, Cloudflare R2)

**Start here:** [docs/SETUP.md](docs/SETUP.md) — step-by-step instructions for:

- Reusing the **same Google Cloud OAuth Client** as the Sweeps backend
  (just register a second redirect URI — no need for a new client, and no
  need to run this service on the same port as Sweeps)
- Getting a free [Gemini API key](https://aistudio.google.com/apikey)
- Creating a Cloudflare R2 bucket + API token
- Running this backend **and** the Sweeps backend **and** the Next.js
  frontend together on `localhost` for full local testing (sign-in
  included) — you do not need to deploy anything to test this locally

## Environment variables

See [.env.example](.env.example) for the full list, or
[docs/SETUP.md](docs/SETUP.md) for how to obtain each value.
