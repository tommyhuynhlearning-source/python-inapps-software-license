# InApps Software License Manager

Web app quản lý software licenses, devices, và security cho InApps. Tích hợp Odoo ERP để tạo IT service tasks.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite (port 5173) |
| Backend | Python 3.13 + FastAPI (port 8000) |
| Database | Firebase Firestore |
| Auth | Firebase Auth |
| ERP | Odoo 19 (via MCP HTTP) |
| Deploy | Vercel (serverless) |

## Tabs

- **License** — Quản lý software licenses, group by service
- **Device** — Quản lý thiết bị
- **Security** — Quản lý security records
- **ODC** — Tạo IT service tasks trên Odoo ERP

## Quick Start

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

# Frontend (terminal khác)
cd frontend
npm install
npm run dev
```

Mở [http://localhost:5173](http://localhost:5173)

## Environment Variables

**backend/.env**
```
FIREBASE_PROJECT_ID=...
ODOO_USER=...
ODOO_API_KEY=...
GMAIL_USER=...
GMAIL_APP_PASSWORD=...
```

**frontend/.env**
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
```

Xem `.env.example` trong mỗi thư mục để biết đầy đủ các biến cần thiết.

## Deploy

Project deploy trên Vercel. Frontend build tại `frontend/dist/`, backend chạy qua `api/index.py` (serverless function).

```bash
# Build production
cd frontend && npm run build
```

Push lên `main` branch → Vercel tự động deploy.
