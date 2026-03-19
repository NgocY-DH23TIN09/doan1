from fastapi import APIRouter, HTTPException, Request
from models import PatientInput, PredictionResult
import joblib
import numpy as np
import os
from groq import Groq
from dotenv import load_dotenv
from utils.limiter import limiter

load_dotenv()
api_key = os.getenv("GROQ_API_KEY")

router = APIRouter()

# Load model khi khởi động
MODEL_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'ml')
_model = None
_scaler = None


def load_model():
    global _model, _scaler
    model_path = os.path.join(MODEL_DIR, 'model.pkl')
    scaler_path = os.path.join(MODEL_DIR, 'scaler.pkl')

    if not os.path.exists(model_path):
        raise FileNotFoundError(
            "model.pkl không tìm thấy. Hãy chạy: python ml/train.py"
        )

    _model = joblib.load(model_path)
    _scaler = joblib.load(scaler_path)
    print("[OK] Model loaded successfully.")


FEATURE_NAMES = [
    'Pregnancies', 'Glucose', 'BloodPressure', 'SkinThickness',
    'Insulin', 'BMI', 'DiabetesPedigreeFunction', 'Age'
]

RECOMMENDATIONS = {
    "Thấp": (
        "🟢 Nguy cơ thấp. Duy trì lối sống lành mạnh: ăn uống cân bằng, "
        "tập thể dục đều đặn ít nhất 30 phút/ngày và kiểm tra sức khỏe định kỳ."
    ),
    "Trung bình": (
        "🟡 Nguy cơ trung bình. Cần chú ý kiểm soát chế độ ăn uống, hạn chế đường và tinh bột. "
        "Tăng cường vận động và theo dõi chỉ số đường huyết định kỳ 6 tháng/lần."
    ),
    "Cao": (
        "🔴 Nguy cơ cao. Hãy đến gặp bác sĩ chuyên khoa ngay để được tư vấn và xét nghiệm chuyên sâu. "
        "Kiểm soát nghiêm ngặt chế độ ăn uống, tập thể dục hàng ngày và theo dõi đường huyết thường xuyên."
    )
}


@router.post("/predict", response_model=PredictionResult, summary="Dự đoán nguy cơ tiểu đường")
@limiter.limit("20/minute")
async def predict(request: Request, patient: PatientInput):
    """
    Nhận các chỉ số sức khỏe của bệnh nhân và trả về nguy cơ mắc tiểu đường.
    """
    if _model is None or _scaler is None:
        try:
            load_model()
        except FileNotFoundError as exc:
            raise HTTPException(
                status_code=503,
                detail="Model chưa được tải. Hãy train model trước."
            ) from exc

    # Tạo feature vector
    features = np.array([[
        patient.pregnancies,
        patient.glucose,
        patient.blood_pressure,
        patient.skin_thickness,
        patient.insulin,
        patient.bmi,
        patient.diabetes_pedigree,
        patient.age
    ]])

    features_scaled = _scaler.transform(features)
    prob = _model.predict_proba(features_scaled)[0]
    risk_probability = float(prob[1])
    risk_percentage = round(risk_probability * 100, 2)

    # Phân loại mức độ nguy cơ
    if risk_percentage < 30:
        risk_level = "Thấp"
    elif risk_percentage < 60:
        risk_level = "Trung bình"
    else:
        risk_level = "Cao"

    # Feature importance
    importances = dict(zip(FEATURE_NAMES, [round(float(v), 4) for v in _model.feature_importances_]))

    recommendation = RECOMMENDATIONS[risk_level]

    # Sinh lời khuyên từ Groq AI nếu có key
    if api_key:
        try:
            client = Groq(api_key=api_key)
            prompt = f"""Là một chuyên gia tư vấn y tế (bác sĩ nội tiết), hãy phân tích cụ thể và đưa ra lời khuyên chi tiết, tận tình bằng tiếng Việt cho bệnh nhân:
- Mức nguy cơ tiểu đường: {risk_level} ({risk_percentage}%)
- Tuổi: {patient.age}, BMI: {patient.bmi}
- Đường huyết lúc đói: {patient.glucose} mg/dL, Huyết áp: {patient.blood_pressure} mmHg
- Insulin: {patient.insulin}, Tiền sử bệnh di truyền: {patient.diabetes_pedigree}

Cấu trúc trả lời:
1. Đánh giá sơ bộ về các chỉ số (nêu rõ chỉ số nào bất thường).
2. Chế độ dinh dưỡng (nên ăn gì, kiêng gì).
3. Chế độ vận động & sinh hoạt.
4. Lời khuyên thăm khám y tế.
Lưu ý: Không chào hỏi. Trình bày rõ ràng, có xuống dòng hợp lý."""
            
            response = client.chat.completions.create(
                model='llama-3.1-8b-instant',
                messages=[
                    {"role": "system", "content": "Bạn là một chuyên gia tư vấn y tế nội tiết"},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1024,
                temperature=0.7
            )
            if response and response.choices:
                recommendation = "🤖 [AI Tư Vấn]\n\n" + response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Lỗi gọi Groq API: {e}")
            recommendation = RECOMMENDATIONS[risk_level] + "\n\n*(Lưu ý: Hệ thống AI Groq hiện không khả dụng. Đây là lời khuyên dự phòng cơ bản)*"

    return PredictionResult(
        risk_score=round(risk_probability, 4),
        risk_level=risk_level,
        risk_percentage=risk_percentage,
        recommendation=recommendation,
        features_importance=importances
    )
