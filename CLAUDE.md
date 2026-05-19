# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Software license management web app for InApps. Three main tabs: **License**, **Device**, **Security**.

- **Backend:** Python (FastAPI) — REST API, runs on port 8000
- **Frontend:** React + Vite — SPA, runs on port 5173
- **Database/Auth:** Firebase (Firestore + Firebase Auth), authenticated via Firebase CLI (no service account keys)

## Commands

### Backend (FastAPI)

```bash
cd backend
python -m venv venv && source venv/bin/activate  # first time only
pip install -r requirements.txt
uvicorn main:app --reload                          # dev server, port 8000
uvicorn main:app --reload --port 8000             # explicit port
pytest                                             # run all tests
pytest tests/test_license.py                      # run single test file
pytest -k "test_create_license"                   # run single test by name
```

### Frontend (React + Vite)

```bash
cd frontend
npm install        # first time only
npm run dev        # dev server, port 5173
npm run build      # production build → dist/
npm run preview    # preview production build
npm run lint       # ESLint check
```

### Firebase

```bash
firebase login                          # authenticate CLI (required before using Firebase MCP)
firebase use --add                      # select/link Firebase project
firebase emulators:start                # run Firestore + Auth emulators locally
```

## Architecture

```
python-inapps-software-license/
├── backend/
│   ├── main.py              # FastAPI app entry, mounts all routers
│   ├── core/
│   │   ├── config.py        # env vars / settings (pydantic BaseSettings)
│   │   └── firebase.py      # Firebase Admin SDK init (uses ADC, not service account)
│   ├── routers/
│   │   ├── license.py       # /api/licenses — CRUD
│   │   ├── device.py        # /api/devices  — CRUD
│   │   └── security.py      # /api/security — CRUD
│   ├── models/              # Pydantic request/response schemas
│   ├── requirements.txt
│   └── .env                 # local env (not committed)
├── frontend/
│   ├── src/
│   │   ├── main.jsx         # React entry, router setup
│   │   ├── App.jsx          # Tab layout shell (License / Device / Security)
│   │   ├── pages/
│   │   │   ├── License.jsx
│   │   │   ├── Device.jsx
│   │   │   └── Security.jsx
│   │   ├── components/      # Shared UI components
│   │   └── hooks/           # Custom React hooks (API calls, Firebase)
│   ├── vite.config.js       # proxy /api → http://localhost:8000
│   └── package.json
└── .claude/
    └── settings.json        # Project-level MCP servers (GitHub + Firebase)
```

## Key Patterns

**API proxy:** Vite is configured to proxy `/api/*` to the FastAPI backend at `localhost:8000`, so the frontend uses relative paths like `fetch('/api/licenses')`.

**Firebase auth (no service account):** Firebase Admin SDK in the backend uses Application Default Credentials (`firebase login --reauth` or `GOOGLE_APPLICATION_CREDENTIALS` env pointing to a user credential file). Never use service account JSON keys — key creation is restricted by org policy.

**Router structure:** Each tab maps 1-to-1 with a FastAPI router and a React page component. Add new features by extending the corresponding router + page pair.

## MCP Servers (project-scoped)

Configured in `.claude/settings.json` — applies **only to this project**. Do not read or modify `~/.claude/settings.json` (global config); no global permissions are granted here.

- **GitHub MCP:** Set `GITHUB_PERSONAL_ACCESS_TOKEN` in `.claude/settings.json` before use. Generate a PAT from GitHub → Settings → Developer settings → Personal access tokens.
- **Firebase MCP:** Requires `firebase login` to be run first in the terminal. Uses Firebase CLI session — no service account key needed (org policy blocks key creation).
- **Vercel MCP:** Remote MCP via OAuth at `https://mcp.vercel.com`. First use: run `/mcp` inside Claude Code to trigger the OAuth flow and authorize with your Vercel account. Supports monitoring deployments, projects, and logs. Docs: [vercel.com/docs/agent-resources/vercel-mcp](https://vercel.com/docs/agent-resources/vercel-mcp)
