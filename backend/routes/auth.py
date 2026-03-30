from fastapi import APIRouter, HTTPException, status, Depends, Request
from models import UserCreate, UserInDB, UserResponse, UserRole
from database import require_database
from utils.auth_utils import get_password_hash, verify_password, create_access_token
from datetime import UTC, datetime
from pydantic import BaseModel
from utils.limiter import limiter

router = APIRouter()


class LoginRequest(BaseModel):
    phone_number: str
    password: str


@router.post("/register", response_model=UserResponse, summary="Đăng ký tài khoản mới")
@limiter.limit("10/hour")
async def register(request: Request, user_in: UserCreate):
    db = require_database()
    
    # Kiểm tra số điện thoại đã tồn tại chưa
    existing_user = await db["users"].find_one({"phone_number": user_in.phone_number})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Số điện thoại này đã được đăng ký"
        )
    
    # Mã hóa mật khẩu
    hashed_password = get_password_hash(user_in.password)
    
    # Tạo user mới
    user_dict = user_in.model_dump(exclude={"password"})
    user_dict["password_hash"] = hashed_password
    user_dict["role"] = UserRole.USER
    user_dict["created_at"] = datetime.now(UTC)
    
    result = await db["users"].insert_one(user_dict)
    user_dict["id"] = str(result.inserted_id)
    
    return user_dict


@router.post("/login", summary="Đăng nhập")
@limiter.limit("10/minute")
async def login(request: Request, login_data: LoginRequest):
    db = require_database()
    
    user = await db["users"].find_one({"phone_number": login_data.phone_number})
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Số điện thoại hoặc mật khẩu không chính xác",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = create_access_token(
        data={"sub": str(user["_id"]), "role": user["role"]}
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": str(user["_id"]),
            "full_name": user["full_name"],
            "phone_number": user["phone_number"],
            "role": user["role"]
        }
    }
