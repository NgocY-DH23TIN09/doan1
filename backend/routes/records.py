from fastapi import APIRouter, HTTPException, Query, Depends
from models import PredictionRecord, PredictionRecordDB, UserRole
from database import require_database
from bson import ObjectId
from datetime import datetime
from typing import Optional
import math
from routes.users import get_current_user

router = APIRouter()


def record_helper(record) -> dict:
    """Chuyển MongoDB document sang dict serializable"""
    return {
        "id": str(record["_id"]),
        "patient_name": record.get("patient_name", "Ẩn danh"),
        "input_data": record["input_data"],
        "prediction": record["prediction"],
        "created_at": record["created_at"].isoformat() if isinstance(record["created_at"], datetime) else record["created_at"]
    }


@router.post("/records", summary="Lưu kết quả dự đoán")
async def save_record(record: PredictionRecord, current_user: dict = Depends(get_current_user)):
    db = require_database()
    record_dict = record.model_dump()
    record_dict["user_id"] = str(current_user["_id"])
    if not record.patient_name or record.patient_name == "Ẩn danh":
        record_dict["patient_name"] = current_user["full_name"]
    else:
        record_dict["patient_name"] = record.patient_name
    result = await db["predictions"].insert_one(record_dict)
    return {"id": str(result.inserted_id), "message": "Đã lưu kết quả thành công!"}


@router.get("/records", summary="Lấy danh sách kết quả")
async def get_records(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    risk_level: Optional[str] = Query(None, description="Lọc theo: Thấp, Trung bình, Cao"),
    current_user: dict = Depends(get_current_user)
):
    db = require_database()
    query = {}
    
    # Phân quyền: User chỉ xem của mình, Admin xem hết
    if current_user.get("role") != UserRole.ADMIN:
        query["user_id"] = str(current_user["_id"])
        
    if risk_level:
        query["prediction.risk_level"] = risk_level

    total = await db["predictions"].count_documents(query)
    skip = (page - 1) * limit

    cursor = db["predictions"].find(query).sort("created_at", -1).skip(skip).limit(limit)
    records = []
    async for record in cursor:
        records.append(record_helper(record))

    return {
        "records": records,
        "total": total,
        "page": page,
        "pages": math.ceil(total / limit) if total > 0 else 1
    }


@router.get("/records/{record_id}", summary="Xem chi tiết bản ghi")
async def get_record(record_id: str, current_user: dict = Depends(get_current_user)):
    db = require_database()
    try:
        obj_id = ObjectId(record_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID không hợp lệ")

    query = {"_id": obj_id}
    if current_user.get("role") != UserRole.ADMIN:
        query["user_id"] = str(current_user["_id"])

    record = await db["predictions"].find_one(query)
    if not record:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi hoặc không có quyền xem")

    return record_helper(record)


@router.delete("/records/{record_id}", summary="Xóa bản ghi")
async def delete_record(record_id: str, current_user: dict = Depends(get_current_user)):
    db = require_database()
    try:
        obj_id = ObjectId(record_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID không hợp lệ")

    query = {"_id": obj_id}
    if current_user.get("role") != UserRole.ADMIN:
        query["user_id"] = str(current_user["_id"])

    result = await db["predictions"].delete_one(query)
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Không tìm thấy bản ghi hoặc không có quyền xóa")

    return {"message": "Đã xóa bản ghi thành công!"}


@router.get("/stats", summary="Thống kê tổng hợp")
async def get_stats(current_user: dict = Depends(get_current_user)):
    db = require_database()
    
    query = {}
    if current_user.get("role") != UserRole.ADMIN:
        query["user_id"] = str(current_user["_id"])

    total = await db["predictions"].count_documents(query)

    if total == 0:
        return {
            "total_records": 0,
            "risk_distribution": {"Thấp": 0, "Trung bình": 0, "Cao": 0},
            "avg_age": 0,
            "avg_bmi": 0,
            "avg_glucose": 0,
            "high_risk_percentage": 0
        }

    # Phân bố risk level
    risk_pipeline = [
        {"$match": query},
        {"$group": {"_id": "$prediction.risk_level", "count": {"$sum": 1}}}
    ]
    risk_dist = {"Thấp": 0, "Trung bình": 0, "Cao": 0}
    async for doc in db["predictions"].aggregate(risk_pipeline):
        if doc["_id"] in risk_dist:
            risk_dist[doc["_id"]] = doc["count"]

    # Trung bình các chỉ số
    avg_pipeline = [
        {"$match": query},
        {"$group": {
            "_id": None,
            "avg_age": {"$avg": "$input_data.age"},
            "avg_bmi": {"$avg": "$input_data.bmi"},
            "avg_glucose": {"$avg": "$input_data.glucose"}
        }}
    ]
    
    avgs = {"avg_age": 0.0, "avg_bmi": 0.0, "avg_glucose": 0.0}
    async for doc in db["predictions"].aggregate(avg_pipeline):
        # Explicit type conversion to help linters and ensure safety
        raw_age = doc.get("avg_age", 0.0) or 0.0
        raw_bmi = doc.get("avg_bmi", 0.0) or 0.0
        raw_glucose = doc.get("avg_glucose", 0.0) or 0.0
        
        avgs = {
            "avg_age": round(float(raw_age), 1),
            "avg_bmi": round(float(raw_bmi), 1),
            "avg_glucose": round(float(raw_glucose), 1)
        }

    high_risk_pct = round((risk_dist["Cao"] / total) * 100, 1) if total > 0 else 0

    return {
        "total_records": total,
        "risk_distribution": risk_dist,
        "avg_age": avgs["avg_age"],
        "avg_bmi": avgs["avg_bmi"],
        "avg_glucose": avgs["avg_glucose"],
        "high_risk_percentage": high_risk_pct
    }
