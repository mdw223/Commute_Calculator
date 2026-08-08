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

## Environment variables

See [.env.example](.env.example). You'll need:

- A Google OAuth 2.0 Client (Web) — can reuse the same Google Cloud project
  as Sweeps, just add `http://localhost:8001/auth/google/callback` (and your
  production callback URL) as an additional authorized redirect URI.
- A free [Gemini API key](https://aistudio.google.com/apikey).
- A Cloudflare R2 bucket + API token (Account → R2 → Manage API Tokens).
