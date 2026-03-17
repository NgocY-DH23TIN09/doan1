from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from datetime import datetime
from database import connect_to_mongo, close_mongo_connection
from routes.predict import router as predict_router, load_model
from routes.records import router as records_router
from routes.auth import router as auth_router
from routes.users import router as users_router
from database import get_database
from utils.auth_utils import get_password_hash
from models import UserRole


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
            "password_hash": get_password_hash("admin123"), # Mật khẩu mặc định
            "role": UserRole.ADMIN,
            "created_at": datetime.utcnow()
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

# CORS – cho phép frontend truy cập
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(auth_router, prefix="/api/auth", tags=["Xác thực"])
app.include_router(users_router, prefix="/api/users", tags=["Người dùng"])
app.include_router(predict_router, prefix="/api", tags=["Dự đoán"])
app.include_router(records_router, prefix="/api", tags=["Lịch sử"])


@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "Diabetes Prediction API đang hoạt động 🚀",
        "docs": "/docs",
        "version": "1.0.0"
    }

@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}
