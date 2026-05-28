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
GOOGLE_REFRESH_TOKEN=         # tuỳ chọn — tự đọc từ firebase-tools nếu đã firebase login
ODOO_USER=...
ODOO_API_KEY=...
SMTP_USER=...
SMTP_PASSWORD=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-southeast-1
```

**frontend/.env**
```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
```

## Firebase Auth (backend)

Backend dùng Firebase Admin SDK với **Firebase CLI refresh token** — không dùng service account key (bị chặn bởi org policy).

**Local dev:** Chạy `firebase login` một lần. Backend tự đọc token từ `~/.config/configstore/firebase-tools.json`.

**Production (Vercel):** Env var `GOOGLE_REFRESH_TOKEN` phải là token từ `firebase login`, **không phải** từ `gcloud auth application-default login` (loại đó yêu cầu reauth interactive, không hoạt động trong serverless).

Khi token hết hạn (~1 năm), update lại:
```bash
firebase login --reauth
# Lấy token mới từ ~/.config/configstore/firebase-tools.json → tokens.refresh_token
# Update Vercel: npx vercel env rm GOOGLE_REFRESH_TOKEN production --yes
#                cat <token> | npx vercel env add GOOGLE_REFRESH_TOKEN production
```

## Deploy

Project deploy trên Vercel. Frontend build tại `frontend/dist/`, backend chạy qua `api/index.py` (serverless function).

Push lên `main` branch → Vercel tự động deploy.

**Vercel env vars cần thiết:**
```
FIREBASE_PROJECT_ID
GOOGLE_REFRESH_TOKEN          # từ firebase login (xem mục Firebase Auth ở trên)
ODOO_USER / ODOO_API_KEY
SMTP_USER / SMTP_PASSWORD
AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION
VITE_FIREBASE_API_KEY / VITE_FIREBASE_AUTH_DOMAIN / VITE_FIREBASE_PROJECT_ID
```
