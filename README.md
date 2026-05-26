# InApps Software License Manager

Web app quản lý software licenses, devices, và security cho InApps. Tích hợp Odoo ERP và AWS.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite (port 5173) |
| Backend | Python 3.13 + FastAPI (port 8000) |
| Database | Firebase Firestore |
| Auth | Firebase Auth |
| ERP | Odoo 19 (via MCP HTTP) |
| Cloud | AWS (S3, EC2, Lambda, DynamoDB, API Gateway, CloudFront) |
| Deploy | Vercel (serverless) |

## Sidebar Navigation

App dùng dark sidebar (220px, collapsible về 56px) — click nút `‹/›` để toggle.

| Tab | Chức năng |
|-----|-----------|
| 🔑 Licenses | Quản lý software licenses, group by service |
| 🖥️ Devices | Quản lý thiết bị nhân sự |
| 👥 ODC | Tạo alias mail mới · Quản lý ODC/Non-ODC config (Firestore) |
| 🛡️ Security | Quản lý security records & credentials |
| ☁️ AWS | Billing card · S3 · EC2 · Lambda · DynamoDB · API Gateway · CloudFront |

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
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
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
