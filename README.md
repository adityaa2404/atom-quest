# AtomQuest — Goal Setting & Tracking Portal

A full-stack performance management portal built for the AtomQuest Hackathon. Employees set quarterly goals, managers approve and review them, and HR admins oversee the entire organization.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS + shadcn/ui |
| Backend | FastAPI (Python) |
| Database | Supabase (PostgreSQL + Auth) |
| Charts | Recharts |
| Export | openpyxl |

---

## Features

### Employee
- Create and manage a quarterly goal sheet (up to 8 goals)
- Set goals with 6 UoM types: numeric, percentage, timeline, zero-based
- Submit for manager approval
- Log quarterly achievements — scores computed automatically server-side
- View return feedback from manager

### Manager
- Review team goal sheets, approve or return with feedback
- Inline edit goal targets and weightages (audit logged)
- Conduct quarterly check-ins with structured comments
- View team achievement progress with color-coded score bars

### Admin / HR
- Manage performance cycles and thrust areas
- View all goal sheets across the org, unlock locked sheets
- Push shared goals to multiple employees at once
- Run escalation checks (overdue submissions, approvals, check-ins)
- View full audit trail of all changes
- Export achievement report as styled Excel (.xlsx)
- Analytics: QoQ trends, completion heatmap, goal distribution, manager effectiveness

---

## Local Development

### Prerequisites
- Node.js 18+
- Python 3.11+
- A Supabase project

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt

# Create backend/.env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
FRONTEND_ORIGIN=http://localhost:5173

uvicorn app.main:app --reload
# Swagger UI: http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install

# Create frontend/.env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_BASE_URL=http://localhost:8000

npm run dev
# App: http://localhost:5173
```

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Employee | employee@atomquest.com | Password123! |
| Manager | manager@atomquest.com | Password123! |
| Admin / HR | admin@atomquest.com | Password123! |

---

## Deployment

### Backend → Render
- Root directory: `backend`
- Build command: `pip install -r requirements.txt`
- Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Add all 4 env vars from `backend/.env`

### Frontend → Vercel
- Root directory: `frontend`
- Framework preset: Vite (auto-detected)
- Add `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_BASE_URL` (your Render URL)

---

## Project Structure

```
atom-quest/
├── frontend/
│   └── src/
│       ├── pages/          # All page components
│       ├── components/     # Layout, UI components
│       ├── context/        # AuthContext
│       ├── hooks/          # useGoals
│       └── lib/            # supabase.js, api.js
├── backend/
│   └── app/
│       ├── routers/        # goals, checkins, admin, reports, escalations, analytics
│       ├── services/       # score_engine, audit_service, escalation_service
│       ├── models/         # Pydantic schemas
│       ├── middleware/     # JWT auth
│       └── main.py
└── supabase/
    └── seed.sql            # Full schema + seed data
```
