
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
from routes.predict import router as predict_router, load_model, model_ready
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


def get_bootstrap_admin_config():
    phone_number = os.getenv("BOOTSTRAP_ADMIN_PHONE", "").strip()
    password = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "").strip()

    if not phone_number and not password:
        return None

    if not phone_number or not password:
        logger.warning(
            "Skipping bootstrap admin because BOOTSTRAP_ADMIN_PHONE and "
            "BOOTSTRAP_ADMIN_PASSWORD must both be set."
        )
        return None

    return {
        "phone_number": phone_number,
        "full_name": os.getenv("BOOTSTRAP_ADMIN_NAME", "System Administrator").strip() or "System Administrator",
        "age": int(os.getenv("BOOTSTRAP_ADMIN_AGE", "30")),
        "gender": os.getenv("BOOTSTRAP_ADMIN_GENDER", "Nam").strip() or "Nam",
        "password": password,
    }


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_to_mongo()
    load_model()

    # Khởi tạo Admin bootstrap nếu được cấu hình qua biến môi trường
    db = get_database()
    admin_exists = await db["users"].find_one({"role": UserRole.ADMIN})
    bootstrap_admin = get_bootstrap_admin_config()
    if not admin_exists and bootstrap_admin:
        existing_user = await db["users"].find_one({"phone_number": bootstrap_admin["phone_number"]})
        if existing_user:
            logger.warning(
                "Skipping bootstrap admin creation because phone number %s already exists.",
                bootstrap_admin["phone_number"],
            )
        else:
            admin_user = {
                "phone_number": bootstrap_admin["phone_number"],
                "full_name": bootstrap_admin["full_name"],
                "age": bootstrap_admin["age"],
                "gender": bootstrap_admin["gender"],
                "password_hash": get_password_hash(bootstrap_admin["password"]),
                "role": UserRole.ADMIN,
                "created_at": datetime.now(UTC)
            }
            await db["users"].insert_one(admin_user)
            logger.info(
                "Bootstrap admin account created for phone number %s.",
                bootstrap_admin["phone_number"],
            )

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
allowed_origin_regex = os.getenv(
    "ALLOWED_ORIGIN_REGEX",
    r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$|^https://[a-z0-9-]+\.onrender\.com$"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=allowed_origin_regex,
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


@app.get("/", include_in_schema=False)
async def root():
    if FRONTEND_DIR.exists():
        return RedirectResponse(url="/web/", status_code=307)
    return RedirectResponse(url="/docs", status_code=307)


@app.get("/api-info", tags=["Health"])
async def api_info():
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
    db_ready = get_database() is not None
    model_is_ready = model_ready()
    frontend_ready = FRONTEND_DIR.exists()

    overall_status = "ok" if db_ready and model_is_ready else "degraded"

    return {
        "status": overall_status,
        "services": {
            "database": "ok" if db_ready else "unavailable",
            "model": "ok" if model_is_ready else "unavailable",
            "frontend": "ok" if frontend_ready else "missing",
        },
    }
