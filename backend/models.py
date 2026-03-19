from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import UTC, datetime
from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    USER = "user"


class UserBase(BaseModel):
    phone_number: str = Field(..., pattern=r'^\d{10,11}$', description="Số điện thoại")
    full_name: str = Field(..., min_length=2, description="Họ và tên")
    age: int = Field(..., ge=1, le=120, description="Tuổi")
    gender: str = Field(..., description="Giới tính (Nam/Nữ/Khác)")


class UserCreate(UserBase):
    password: str = Field(..., min_length=6, description="Mật khẩu")


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    role: Optional[UserRole] = None


class UserResponse(UserBase):
    id: str
    role: UserRole
    created_at: datetime

    model_config = ConfigDict(populate_by_name=True)


class UserInDB(UserBase):
    id: Optional[str] = None
    role: UserRole = UserRole.USER
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    model_config = ConfigDict(populate_by_name=True)


class PatientInput(BaseModel):
    pregnancies: float = Field(..., ge=0, le=20, description="Số lần mang thai")
    glucose: float = Field(..., ge=0, le=300, description="Nồng độ glucose (mg/dL)")
    blood_pressure: float = Field(..., ge=0, le=200, description="Huyết áp tâm trương (mmHg)")
    skin_thickness: float = Field(..., ge=0, le=100, description="Độ dày nếp da (mm)")
    insulin: float = Field(..., ge=0, le=900, description="Insulin 2 giờ (mU/L)")
    bmi: float = Field(..., ge=0, le=70, description="Chỉ số khối cơ thể (BMI)")
    diabetes_pedigree: float = Field(..., ge=0, le=3, description="Hệ số di truyền tiểu đường")
    age: float = Field(..., ge=1, le=120, description="Tuổi")

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "pregnancies": 2,
                "glucose": 120,
                "blood_pressure": 70,
                "skin_thickness": 25,
                "insulin": 80,
                "bmi": 28.5,
                "diabetes_pedigree": 0.45,
                "age": 35
            }
        }
    )


class PredictionResult(BaseModel):
    risk_score: float
    risk_level: str  # "Thấp", "Trung bình", "Cao"
    risk_percentage: float
    recommendation: str
    features_importance: dict


class PredictionRecord(BaseModel):
    user_id: Optional[str] = None
    patient_name: Optional[str] = "Ẩn danh"
    input_data: PatientInput
    prediction: PredictionResult
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))


class PredictionRecordDB(PredictionRecord):
    id: Optional[str] = None

    model_config = ConfigDict(populate_by_name=True)


class StatsResponse(BaseModel):
    total_records: int
    risk_distribution: dict
    avg_age: float
    avg_bmi: float
    avg_glucose: float
    high_risk_percentage: float
