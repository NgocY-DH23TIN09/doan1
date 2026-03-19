
import logging
import os
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from database import connect_to_mongo, close_mongo_connection
from routes.predict import router as predict_router, load_model
from routes.records import router as records_router
from routes.auth import router as auth_router
from routes.users import router as users_router
from database import get_database
from utils.auth_utils import get_password_hash
from models import UserRole
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from utils.limiter import limiter

logger = logging.getLogger(__name__)
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"


# ── Rate limiter ──────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    load_model()

    # Khởi tạo Admin mặc định nếu chưa có
    db = get_database()
    admin_exists = await db["users"].find_one({"role": UserRole.ADMIN})
    if not admin_exists:
        admin_user = {
            "phone_number": "0123456789",
            "full_name": "System Administrator",
            "age": 30,
            "gender": "Nam",
            "password_hash": get_password_hash("admin123"),
            "role": UserRole.ADMIN,
            "created_at": datetime.now(UTC)
        }
        await db["users"].insert_one(admin_user)
        print("[INIT] Default Admin created: 0123456789 / admin123")

    yield
    await close_mongo_connection()




app = FastAPI(
    title="🩺 Hệ thống Dự đoán Tiểu đường",
    description="API dự đoán nguy cơ mắc bệnh tiểu đường sử dụng Machine Learning",
    version="1.0.0",
    lifespan=lifespan
)

# ── Rate limiter middleware ───────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS – Whitelist specific origins (security improved)
allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://localhost:5000,http://localhost:5500,http://127.0.0.1:3000,http://127.0.0.1:5000,http://127.0.0.1:5500,null"
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ── Mount routes ─────────────────────────────────────────
app.include_router(auth_router, prefix="/api/auth", tags=["Xác thực"])
app.include_router(users_router, prefix="/api/users", tags=["Người dùng"])
app.include_router(predict_router, prefix="/api", tags=["Dự đoán"])
app.include_router(records_router, prefix="/api", tags=["Lịch sử"])

if FRONTEND_DIR.exists():
    app.mount("/web", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="web")


@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "Diabetes Prediction API đang hoạt động 🚀",
        "docs": "/docs",
        "version": "1.0.0",
        "web": "/web/"
    }


@app.get("/app", include_in_schema=False)
async def frontend_app_redirect():
    return RedirectResponse(url="/web/", status_code=307)


@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {"status": "ok"}
