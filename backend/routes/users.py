from fastapi import APIRouter, HTTPException, Depends, status
from models import UserResponse, UserUpdate, UserRole
from database import get_database
from bson import ObjectId
from utils.auth_utils import decode_access_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter()
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token không hợp lệ hoặc đã hết hạn",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    db = get_database()
    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="Người dùng không tồn tại")
    
    return user

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bạn không có quyền thực hiện hành động này"
        )
    return current_user

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    current_user["id"] = str(current_user["_id"])
    return current_user

@router.patch("/{user_id}/role", summary="Cấp quyền cho người dùng (Admin only)")
async def update_user_role(
    user_id: str, 
    role_update: UserUpdate, 
    admin: dict = Depends(get_admin_user)
):
    db = get_database()
    try:
        obj_id = ObjectId(user_id)
    except:
        raise HTTPException(status_code=400, detail="ID người dùng không hợp lệ")
    
    if not role_update.role:
        raise HTTPException(status_code=400, detail="Thiếu thông tin quyền (role)")

    result = await db["users"].update_one(
        {"_id": obj_id},
        {"$set": {"role": role_update.role}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")
        
    return {"message": f"Đã cập nhật quyền thành {role_update.role} thành công"}

@router.get("/", summary="Danh sách người dùng (Admin only)")
async def list_users(admin: dict = Depends(get_admin_user)):
    db = get_database()
    cursor = db["users"].find()
    users = []
    async for user in cursor:
        user["id"] = str(user["_id"])
        users.append(user)
    return users
