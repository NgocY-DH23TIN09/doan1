from fastapi import APIRouter, HTTPException, Request
from models import PatientInput, PredictionResult
import joblib
import pandas as pd
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


def model_ready() -> bool:
    return _model is not None and _scaler is not None


FEATURE_NAMES = [
    'Pregnancies', 'Glucose', 'BloodPressure', 'SkinThickness',
    'Insulin', 'BMI', 'DiabetesPedigreeFunction', 'Age'
]

def build_indicator_assessment(patient: PatientInput, risk_level: str, risk_percentage: float) -> list[str]:
    findings = [
        f"- Mức nguy cơ tiểu đường hiện tại là {risk_level.lower()} ({risk_percentage}%), đây là cơ sở để ưu tiên mức độ theo dõi và can thiệp."
    ]

    if patient.glucose >= 126:
        findings.append(
            f"- Glucose máu {patient.glucose} mg/dL đang vượt ngưỡng cảnh báo rõ, cần được theo dõi sát và nên cân nhắc kiểm tra thêm HbA1c."
        )
    elif patient.glucose >= 100:
        findings.append(
            f"- Glucose máu {patient.glucose} mg/dL cao hơn mức lý tưởng, phù hợp với giai đoạn cần điều chỉnh ăn uống và tái kiểm tra định kỳ."
        )
    else:
        findings.append(
            f"- Glucose máu {patient.glucose} mg/dL đang ở mức tương đối ổn định so với ngưỡng cảnh báo thường gặp."
        )

    if patient.bmi >= 30:
        findings.append(
            f"- BMI {patient.bmi} thuộc nhóm béo phì, đây là yếu tố làm tăng đáng kể nguy cơ đề kháng insulin và rối loạn chuyển hóa."
        )
    elif patient.bmi >= 25:
        findings.append(
            f"- BMI {patient.bmi} thuộc nhóm thừa cân, nên ưu tiên giảm cân nặng theo hướng bền vững."
        )
    else:
        findings.append(
            f"- BMI {patient.bmi} chưa cho thấy tình trạng thừa cân rõ rệt, đây là điểm tương đối thuận lợi trong đánh giá tổng thể."
        )

    if patient.blood_pressure >= 90:
        findings.append(
            f"- Huyết áp tâm trương {patient.blood_pressure} mmHg đang tăng, cần theo dõi song song nguy cơ tim mạch và chuyển hóa."
        )
    elif patient.blood_pressure <= 60:
        findings.append(
            f"- Huyết áp tâm trương {patient.blood_pressure} mmHg khá thấp, nên đối chiếu thêm triệu chứng lâm sàng thực tế nếu có mệt, chóng mặt hoặc choáng váng."
        )
    else:
        findings.append(
            f"- Huyết áp tâm trương {patient.blood_pressure} mmHg hiện chưa nằm trong nhóm bất thường nổi bật."
        )

    if patient.insulin >= 180:
        findings.append(
            f"- Insulin {patient.insulin} mU/L tăng cao, có thể gợi ý rối loạn đáp ứng insulin và cần được bác sĩ đánh giá thêm theo bối cảnh xét nghiệm."
        )
    elif patient.insulin <= 25:
        findings.append(
            f"- Insulin {patient.insulin} mU/L khá thấp, nên xem cùng glucose máu và các xét nghiệm khác để tránh bỏ sót bất thường chuyển hóa."
        )
    else:
        findings.append(
            f"- Insulin {patient.insulin} mU/L hiện chưa phải là tín hiệu bất thường mạnh nếu xét riêng lẻ."
        )

    if patient.diabetes_pedigree >= 0.5:
        findings.append(
            f"- Hệ số di truyền {patient.diabetes_pedigree} cho thấy tiền sử gia đình có thể góp phần nâng nguy cơ nền."
        )
    else:
        findings.append(
            f"- Hệ số di truyền {patient.diabetes_pedigree} tương đối thấp, chưa gợi ý ảnh hưởng di truyền nổi bật."
        )

    if patient.age >= 45:
        findings.append(
            f"- Tuổi {patient.age} là nhóm tuổi cần theo dõi nguy cơ chuyển hóa chặt hơn so với người trẻ hơn."
        )

    return findings


def build_nutrition_guidance(patient: PatientInput, risk_level: str) -> list[str]:
    guidance = [
        "- Ưu tiên bữa ăn có rau xanh, đạm nạc, ngũ cốc nguyên cám và chất béo tốt từ cá, hạt, dầu ô liu.",
        "- Hạn chế nước ngọt, trà sữa, bánh kẹo, cơm trắng quá nhiều và các món ăn nhanh nhiều tinh bột tinh chế.",
        "- Chia khẩu phần hợp lý, tránh ăn quá no vào buổi tối và không bỏ bữa kéo dài rồi ăn bù."
    ]

    if patient.glucose >= 100:
        guidance.append(
            "- Với đường huyết đang tăng, nên giảm mạnh lượng đường đơn và theo dõi đáp ứng sau ăn nếu có điều kiện."
        )

    if patient.bmi >= 25:
        guidance.append(
            "- Mục tiêu dinh dưỡng nên hướng tới giảm cân từ từ, bền vững, thay vì ăn kiêng quá mức trong thời gian ngắn."
        )

    if risk_level == "Cao":
        guidance.append(
            "- Ở nhóm nguy cơ cao, nên cân nhắc được bác sĩ hoặc chuyên gia dinh dưỡng cá thể hóa khẩu phần ăn càng sớm càng tốt."
        )

    return guidance


def build_activity_guidance(patient: PatientInput, risk_level: str) -> list[str]:
    guidance = [
        "- Duy trì vận động ít nhất 30 phút mỗi ngày như đi bộ nhanh, đạp xe chậm, tập kháng lực nhẹ hoặc bơi.",
        "- Hạn chế ngồi lâu liên tục; nên đứng dậy đi lại sau mỗi 45-60 phút làm việc.",
        "- Ưu tiên ngủ đủ giấc và giữ giờ sinh hoạt ổn định để hỗ trợ kiểm soát chuyển hóa."
    ]

    if patient.bmi >= 25:
        guidance.append(
            "- Nếu đang thừa cân hoặc béo phì, nên kết hợp cả cardio và tập sức bền nhẹ để cải thiện tiêu hao năng lượng."
        )

    if risk_level in {"Trung bình", "Cao"}:
        guidance.append(
            "- Giai đoạn này nên duy trì vận động đều hàng tuần thay vì tập nặng ngắt quãng để đạt hiệu quả ổn định hơn."
        )

    return guidance


def build_medical_guidance(risk_level: str) -> list[str]:
    guidance = [
        "- Nên theo dõi định kỳ đường huyết, huyết áp, cân nặng và vòng bụng để phát hiện thay đổi sớm.",
        "- Nếu xuất hiện mệt nhiều, khát nước nhiều, tiểu nhiều, sụt cân hoặc nhìn mờ, nên đi khám sớm hơn kế hoạch."
    ]

    if risk_level == "Cao":
        guidance.append(
            "- Nên khám bác sĩ chuyên khoa nội tiết trong thời gian sớm để được chỉ định xét nghiệm xác nhận và tư vấn điều trị phù hợp."
        )
    elif risk_level == "Trung bình":
        guidance.append(
            "- Nên tái kiểm tra định kỳ trong khoảng 3-6 tháng hoặc sớm hơn nếu các chỉ số tiếp tục tăng."
        )
    else:
        guidance.append(
            "- Có thể duy trì kiểm tra sức khỏe định kỳ theo mốc thường quy, đồng thời tiếp tục giữ lối sống dự phòng."
        )

    return guidance


def build_structured_recommendation(patient: PatientInput, risk_level: str, risk_percentage: float) -> str:
    sections = [
        "🩺 [Tư vấn hệ thống]",
        "",
        "**Đánh giá sơ bộ về các chỉ số**",
        *build_indicator_assessment(patient, risk_level, risk_percentage),
        "",
        "**Chế độ dinh dưỡng**",
        *build_nutrition_guidance(patient, risk_level),
        "",
        "**Chế độ vận động & sinh hoạt**",
        *build_activity_guidance(patient, risk_level),
        "",
        "**Lời khuyên thăm khám y tế**",
        *build_medical_guidance(risk_level)
    ]
    return "\n".join(sections)


@router.post("/predict", response_model=PredictionResult, summary="Dự đoán nguy cơ tiểu đường")
@limiter.limit("180/minute")
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
    features = pd.DataFrame([[
        patient.pregnancies,
        patient.glucose,
        patient.blood_pressure,
        patient.skin_thickness,
        patient.insulin,
        patient.bmi,
        patient.diabetes_pedigree,
        patient.age
    ]], columns=FEATURE_NAMES)

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

    recommendation = build_structured_recommendation(patient, risk_level, risk_percentage)

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
            recommendation = recommendation + "\n\n*(Lưu ý: Hệ thống AI Groq hiện không khả dụng. Đây là lời khuyên dự phòng từ hệ thống.)*"

    return PredictionResult(
        risk_score=round(risk_probability, 4),
        risk_level=risk_level,
        risk_percentage=risk_percentage,
        recommendation=recommendation,
        features_importance=importances
    )
