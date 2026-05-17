import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import time

from app.config import settings
from app.routers import goals, checkins, admin, reports, escalations, analytics

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("atomquest")

app = FastAPI(title="AtomQuest Goal Portal API", version="1.0.0")


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    ms = round((time.time() - start) * 1000)
    logger.info(f"{request.method} {request.url.path} → {response.status_code} ({ms}ms)")
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(goals.router,       prefix="/api/goals",       tags=["Goals"])
app.include_router(checkins.router,    prefix="/api/checkins",    tags=["Check-ins"])
app.include_router(admin.router,       prefix="/api/admin",       tags=["Admin"])
app.include_router(reports.router,     prefix="/api/reports",     tags=["Reports"])
app.include_router(escalations.router, prefix="/api/escalations", tags=["Escalations"])
app.include_router(analytics.router,   prefix="/api/analytics",   tags=["Analytics"])


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "AtomQuest Goal Portal API"}
