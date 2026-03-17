from fastapi import APIRouter, HTTPException
from models import PatientInput, PredictionResult
import joblib
import numpy as np
import os
from google import genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

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
async def predict(patient: PatientInput):
    """
    Nhận các chỉ số sức khỏe của bệnh nhân và trả về nguy cơ mắc tiểu đường.
    """
    if _model is None or _scaler is None:
        raise HTTPException(status_code=503, detail="Model chưa được tải. Hãy train model trước.")

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

    # Sinh lời khuyên từ Gemini AI nếu có key
    if api_key:
        try:
            client = genai.Client(api_key=api_key)
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
            
            response = client.models.generate_content(
                model='gemini-2.0-flash',
                contents=prompt
            )
            if response and response.text:
                recommendation = "🤖 [AI Tư Vấn]\n\n" + response.text.strip()
        except Exception as e:
            print("Error calling Gemini API:", e)
            recommendation = RECOMMENDATIONS[risk_level] + "\n\n*(Lưu ý: Hệ thống AI Gemini hiện đang hết hạn mức API hoặc quá tải. Đây là lời khuyên dự phòng cơ bản)*"

    return PredictionResult(
        risk_score=round(risk_probability, 4),
        risk_level=risk_level,
        risk_percentage=risk_percentage,
        recommendation=recommendation,
        features_importance=importances
    )
