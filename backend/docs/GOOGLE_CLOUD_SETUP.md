# Google Cloud Setup for Sweeps Automation

One-time setup to enable Gmail and Calendar integration.

## 1. Create a project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (e.g. `sweeps-automation`)
3. Note the **Project ID**

## 2. Enable APIs

In **APIs & Services → Library**, enable:

- **Gmail API**
- **Google Calendar API**

## 3. OAuth consent screen

1. **APIs & Services → OAuth consent screen**
2. Choose **External** (or **Internal** if using Google Workspace for a small group)
3. App name: `Sweeps Dashboard`
4. Add scopes:
   - `openid`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/calendar.events`
5. Add your email as a test user (required while app is in Testing mode)

## 4. OAuth 2.0 credentials

1. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Application type: **Web application**
3. Authorized redirect URIs:
   - `http://localhost:8000/auth/google/callback` (local backend)
   - `https://YOUR-RAILWAY-URL/auth/google/callback` (production backend)
4. Copy **Client ID** and **Client Secret** into `backend/.env`

## 5. Environment variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```env
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:8000/auth/google/callback
FRONTEND_URL=http://localhost:3000
```

## 6. Gmail filter (per user)

After signing in, each user should create a Gmail filter:

- **From:** `newjob@sweeps.jobs`
- **Apply label:** `Sweeps`
- Optionally skip inbox if desired

The backend polls only messages with the `Sweeps` label.

## 7. Production checklist

- [ ] Add production redirect URI to OAuth client
- [ ] Set `FRONTEND_URL` to your Vercel domain
- [ ] Generate a strong `SECRET_KEY` and `ENCRYPTION_KEY`
- [ ] Submit OAuth app for verification if opening to public users (sensitive scopes)
