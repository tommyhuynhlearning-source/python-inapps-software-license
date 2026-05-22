# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Software license management web app for InApps. Four main tabs: **License**, **Device**, **Security**, **ODC**.

- **Backend:** Python 3.13 (FastAPI) — REST API, runs on port 8000
- **Frontend:** React + Vite — SPA, runs on port 5173
- **Database/Auth:** Firebase (Firestore + Firebase Auth), authenticated via Firebase CLI (no service account keys)
- **Odoo integration:** ODC tab connects to Odoo 19 ERP via MCP HTTP endpoint (`https://erp.inapps.net/mcp/`)

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
│   │   ├── firebase.py      # Firebase Admin SDK init (uses ADC, not service account)
│   │   └── odoo_client.py   # Odoo MCP adapter — _mcp_call(), list_tasks(), create_task()
│   ├── routers/
│   │   ├── license.py       # /api/licenses — CRUD
│   │   ├── device.py        # /api/devices  — CRUD
│   │   ├── security.py      # /api/security — CRUD
│   │   └── odoo.py          # /api/odoo/tasks — GET list, POST create
│   ├── models/              # Pydantic request/response schemas
│   ├── requirements.txt
│   └── .env                 # local env (not committed)
├── frontend/
│   ├── src/
│   │   ├── main.jsx         # React entry, router setup
│   │   ├── App.jsx          # Tab layout shell (License / Device / Security / ODC)
│   │   ├── pages/
│   │   │   ├── License.jsx
│   │   │   ├── Device.jsx
│   │   │   ├── Security.jsx
│   │   │   └── ODC.jsx      # ODC tab — tạo task Odoo (task list ẩn tạm, chỉ dùng test)
│   │   ├── components/      # Shared UI components
│   │   └── hooks/           # Custom React hooks (API calls, Firebase)
│   ├── vite.config.js       # proxy /api → http://localhost:8000
│   └── package.json
└── .claude/
    └── settings.json        # Project-level MCP servers (GitHub + Firebase + Vercel + AWS)
```

## Key Patterns

**API proxy:** Vite is configured to proxy `/api/*` to the FastAPI backend at `localhost:8000`, so the frontend uses relative paths like `fetch('/api/licenses')`.

**Firebase auth (no service account):** Firebase Admin SDK in the backend uses Application Default Credentials (`firebase login --reauth` or `GOOGLE_APPLICATION_CREDENTIALS` env pointing to a user credential file). Never use service account JSON keys — key creation is restricted by org policy.

**Router structure:** Each tab maps 1-to-1 with a FastAPI router and a React page component. Add new features by extending the corresponding router + page pair.

**Python 3.13 typing:** Use native syntax — `str | None`, `int | None`, `list[str]` — not `Optional[str]`, `List[str]`. Keep `from typing import Any` when needed (no native equivalent).

**Odoo MCP integration:** All Odoo calls go through `_mcp_call()` in `backend/core/odoo_client.py`. It wraps HTTP POST to `https://erp.inapps.net/mcp/` with JSON-RPC 2.0 format and Basic auth (`odoo_user:odoo_api_key` from `.env`). Available tools: `odoo_search`, `odoo_create`, `odoo_write`, `odoo_get`, `odoo_count`, `odoo_fields`. Add new Odoo operations by calling `_mcp_call("odoo_<tool>", {...})`.

**ODC page (current state):** Task list is hidden — only the create-task form is shown for testing the Odoo connection. `ODOO_PROJECT_IT_SERVICE = 72` is the Odoo project ID for "IT Service".

## MCP Servers (project-scoped)

Configured in `.claude/settings.json` — applies **only to this project**. Do not read or modify `~/.claude/settings.json` (global config); no global permissions are granted here.

- **GitHub MCP:** Set `GITHUB_PERSONAL_ACCESS_TOKEN` in `.claude/settings.json` before use. Generate a PAT from GitHub → Settings → Developer settings → Personal access tokens.
- **Firebase MCP:** Requires `firebase login` to be run first in the terminal. Uses Firebase CLI session — no service account key needed (org policy blocks key creation).
- **Vercel MCP:** Remote MCP via OAuth at `https://mcp.vercel.com`. First use: run `/mcp` inside Claude Code to trigger the OAuth flow and authorize with your Vercel account. Supports monitoring deployments, projects, and logs. Docs: [vercel.com/docs/agent-resources/vercel-mcp](https://vercel.com/docs/agent-resources/vercel-mcp)
- **AWS MCP:** Uses `@yawlabs/aws-mcp` (25 tools, calls any AWS API). Credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`) are set directly in `.claude/settings.json` — no AWS CLI required. Region: `ap-southeast-1`.

## Allowed Actions

Claude được phép thực hiện các actions sau **mà không cần hỏi lại**:

### Code & Files
- Đọc, chỉnh sửa, tạo file trong project
- Chạy `pytest` (backend tests)
- Chạy `npm run lint` (frontend lint)
- Chạy `uvicorn` hoặc `npm run dev` để start dev server

### MCP — Firebase
- Đọc/ghi Firestore collections (licenses, devices, security)
- Kiểm tra Firebase Auth users
- Xem Firebase project config

### MCP — GitHub
- Đọc issues, PRs, commits
- Tạo PR, comment trên PR
- Xem repo file content

### MCP — Vercel
- Xem danh sách deployments và trạng thái
- Đọc build logs và runtime logs
- Kiểm tra project config

### MCP — AWS
- Gọi AWS APIs đọc (List*, Describe*, Get*)
- Xem S3 buckets, EC2 instances, Lambda functions
- Kiểm tra IAM permissions, CloudWatch logs

### MCP — Odoo
- Tìm kiếm và đọc records Odoo
- Tạo task trong project IT Service (project ID 72)
- Cập nhật task status/fields

---

Claude **phải hỏi trước** khi:
- Push code lên git hoặc merge PR
- Xóa dữ liệu trong Firestore hoặc Odoo
- Tạo/xóa AWS resources (S3 bucket, EC2, v.v.)
- Thay đổi `.env` files
- Deploy lên Vercel production
