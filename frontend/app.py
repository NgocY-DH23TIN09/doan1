"""
🩺 DiabetesAI - Streamlit App
Ứng dụng dự đoán nguy cơ tiểu đường
"""

from pathlib import Path
from datetime import datetime
import os

import joblib
import numpy as np
import pandas as pd
import requests
import streamlit as st


BASE_DIR = Path(__file__).resolve().parent.parent
MODEL_DIR = BASE_DIR / "backend" / "ml"
API_BASE_URL = os.getenv("API_BASE_URL", "https://doan1-ymhe.onrender.com/api")


st.set_page_config(
    page_title="🩺 DiabetesAI",
    page_icon="🩺",
    layout="wide",
    initial_sidebar_state="expanded"
)


@st.cache_resource
def load_model():
    """Load local ML model as a fallback when the API is unavailable."""
    try:
        model = joblib.load(MODEL_DIR / "model.pkl")
        scaler = joblib.load(MODEL_DIR / "scaler.pkl")
        return model, scaler, None
    except Exception as exc:
        return None, None, str(exc)


def predict_via_api(payload: dict):
    response = requests.post(f"{API_BASE_URL}/predict", json=payload, timeout=20)
    response.raise_for_status()
    return response.json()


model, scaler, model_error = load_model()


st.markdown(
    """
    <style>
    .header-title {
        color: #7c3aed;
        font-size: 2.5em;
        margin-bottom: 0.5em;
    }
    .risk-high {
        background-color: #fee2e2;
        padding: 1em;
        border-radius: 0.5em;
        border-left: 4px solid #dc2626;
    }
    .risk-medium {
        background-color: #fef3c7;
        padding: 1em;
        border-radius: 0.5em;
        border-left: 4px solid #d97706;
    }
    .risk-low {
        background-color: #dcfce7;
        padding: 1em;
        border-radius: 0.5em;
        border-left: 4px solid #059669;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

st.markdown('<p class="header-title">🩺 DiabetesAI</p>', unsafe_allow_html=True)
st.markdown("### Hệ thống Dự đoán Nguy cơ Tiểu đường")
st.markdown("Sử dụng Machine Learning để đánh giá nguy cơ mắc bệnh tiểu đường")

st.divider()

with st.sidebar:
    st.markdown("### ⚙️ Navigation")
    page = st.radio(
        "Chọn trang:",
        ["🩺 Dự đoán", "📊 Thống kê", "ℹ️ Thông tin", "📚 Hướng dẫn"],
    )


if page == "🩺 Dự đoán":
    st.markdown("## Dự đoán Nguy cơ Tiểu đường")
    st.caption(f"Backend API: {API_BASE_URL}")

    if model_error:
        st.warning(f"⚠️ Không load được model local: {model_error}")
    else:
        st.success("✅ Model local sẵn sàng làm phương án dự phòng")

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("### Thông tin từ bệnh nhân")
        pregnancies = st.slider("Số lần mang thai", 0, 20, 2)
        glucose = st.slider("Glucose huyết tương (mg/dL)", 0, 300, 120)
        blood_pressure = st.slider("Huyết áp tâm trương (mmHg)", 0, 200, 72)
        skin_thickness = st.slider("Độ dày nếp da (mm)", 0, 100, 25)

    with col2:
        st.markdown("### Chỉ số khác")
        insulin = st.slider("Insulin 2 giờ (mU/L)", 0, 900, 80)
        bmi = st.slider("Chỉ số BMI (kg/m²)", 0.0, 70.0, 28.5, step=0.1)
        diabetes_pedigree = st.slider("Hệ số di truyền", 0.0, 3.0, 0.45, step=0.01)
        age = st.slider("Tuổi", 1, 120, 35)

    col1, col2, col3 = st.columns(3)

    with col1:
        if st.button("🔍 Phân tích nguy cơ", use_container_width=True):
            payload = {
                "pregnancies": pregnancies,
                "glucose": glucose,
                "blood_pressure": blood_pressure,
                "skin_thickness": skin_thickness,
                "insulin": insulin,
                "bmi": bmi,
                "diabetes_pedigree": diabetes_pedigree,
                "age": age,
            }

            result = None

            try:
                result = predict_via_api(payload)
                st.success("✅ Đã nhận kết quả từ backend online")
            except requests.RequestException as exc:
                if model is not None and scaler is not None:
                    st.warning(f"⚠️ Backend online lỗi, chuyển sang model local: {exc}")
                    features = np.array([[pregnancies, glucose, blood_pressure, skin_thickness, insulin, bmi, diabetes_pedigree, age]])
                    features_scaled = scaler.transform(features)
                    risk_score = float(model.predict_proba(features_scaled)[0][1])
                    risk_percentage = round(risk_score * 100, 2)
                    if risk_percentage < 30:
                        risk_level = "Thấp"
                        recommendation = "🟢 Nguy cơ thấp. Duy trì lối sống lành mạnh và kiểm tra sức khỏe định kỳ."
                    elif risk_percentage < 60:
                        risk_level = "Trung bình"
                        recommendation = "🟡 Nguy cơ trung bình. Hạn chế đường, tăng vận động và theo dõi định kỳ."
                    else:
                        risk_level = "Cao"
                        recommendation = "🔴 Nguy cơ cao. Hãy đến cơ sở y tế để được tư vấn và xét nghiệm chuyên sâu."

                    feature_names = [
                        "Pregnancies",
                        "Glucose",
                        "BloodPressure",
                        "SkinThickness",
                        "Insulin",
                        "BMI",
                        "DiabetesPedigreeFunction",
                        "Age",
                    ]
                    result = {
                        "risk_score": risk_score,
                        "risk_level": risk_level,
                        "risk_percentage": risk_percentage,
                        "recommendation": recommendation,
                        "features_importance": dict(zip(feature_names, [float(v) for v in model.feature_importances_])),
                    }
                else:
                    st.error(f"❌ Không gọi được backend online và cũng không có model local: {exc}")

            if result:
                risk_level = result["risk_level"]
                probability = float(result["risk_score"])
                risk_percentage = float(result["risk_percentage"])
                recommendation = result["recommendation"]
                features_importance = result.get("features_importance", {})
                risk_class = {
                    "Thấp": "risk-low",
                    "Trung bình": "risk-medium",
                    "Cao": "risk-high",
                }.get(risk_level, "risk-medium")
                emoji = {
                    "Thấp": "🟢",
                    "Trung bình": "🟡",
                    "Cao": "🔴",
                }.get(risk_level, "⚪")

                st.session_state.last_prediction = {
                    "risk_level": risk_level,
                    "probability": probability,
                    "risk_percentage": risk_percentage,
                    "recommendation": recommendation,
                    "features_importance": features_importance,
                    "input": payload,
                    "timestamp": datetime.now(),
                }

                st.divider()
                st.markdown(f"### {emoji} Kết quả Dự đoán")

                metric_col1, metric_col2, metric_col3 = st.columns(3)
                with metric_col1:
                    st.metric("Mức Độ Nguy Cơ", risk_level)
                with metric_col2:
                    st.metric("Xác Suất", f"{risk_percentage:.1f}%")
                with metric_col3:
                    st.metric("Dự Đoán", "Nguy cơ" if probability >= 0.5 else "Bình thường")

                st.markdown(f'<div class="{risk_class}">', unsafe_allow_html=True)
                st.markdown(recommendation)
                st.markdown("</div>", unsafe_allow_html=True)

                if features_importance:
                    st.markdown("### 📊 Tầm Quan Trọng Đặc Trưng")
                    df_imp = pd.DataFrame(
                        {
                            "Feature": list(features_importance.keys()),
                            "Importance": list(features_importance.values()),
                        }
                    ).sort_values("Importance", ascending=True)
                    st.bar_chart(df_imp.set_index("Feature"))

    with col2:
        if st.button("📊 Dữ liệu Mẫu", use_container_width=True):
            st.info("Các thanh kéo hiện đã chứa sẵn dữ liệu mẫu mặc định.")

    with col3:
        if st.button("↺ Xóa", use_container_width=True):
            st.rerun()

elif page == "📊 Thống kê":
    st.markdown("## Thống kê & Lịch sử")

    if "last_prediction" in st.session_state:
        st.success("✅ Có kết quả dự đoán")

        pred = st.session_state.last_prediction

        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Mức Độ Nguy Cơ", pred["risk_level"])
        with col2:
            st.metric("Xác Suất", f"{pred['risk_percentage']:.1f}%")
        with col3:
            st.metric("Tuổi", pred["input"]["age"])
        with col4:
            st.metric("BMI", f"{pred['input']['bmi']:.1f}")

        st.markdown("### Chi tiết dự đoán")
        df = pd.DataFrame([pred["input"]])
        st.dataframe(df)

        st.markdown("### Lịch sử")
        st.info("💾 Để lưu lịch sử, hãy dùng frontend HTML/JS hoặc mở rộng thêm luồng gọi API records.")
    else:
        st.info("ℹ️ Chưa có dự đoán nào. Vui lòng thực hiện dự đoán ở trang đầu.")

elif page == "ℹ️ Thông tin":
    st.markdown("## Thông tin Dự án")

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("### 🤖 Model ML")
        st.markdown(
            """
            - **Thuật toán**: Random Forest
            - **Dataset**: Pima Indians (768 mẫu)
            - **Features**: 8 đặc trưng lâm sàng
            - **Backend API**: FastAPI triển khai trên Render
            - **Fallback**: Model local nếu API không phản hồi
            """
        )

    with col2:
        st.markdown("### 📊 Đặc Trưng")
        st.markdown(
            """
            1. Pregnancies - Số lần mang thai
            2. Glucose - Glucose huyết tương (mg/dL)
            3. BloodPressure - Huyết áp tâm trương (mmHg)
            4. SkinThickness - Độ dày nếp da (mm)
            5. Insulin - Insulin 2 giờ (mU/L)
            6. BMI - Chỉ số khối cơ thể
            7. DiabetesPedigreeFunction - Hệ số di truyền
            8. Age - Tuổi
            """
        )

    st.divider()

    st.markdown("### 📈 Phân Loại Nguy Cơ")

    risk_df = pd.DataFrame(
        {
            "Mức Độ": ["Thấp", "Trung bình", "Cao"],
            "Xác Suất": ["< 30%", "30% - 60%", "> 60%"],
            "Khuyến cáo": [
                "Duy trì lối sống lành mạnh",
                "Kiểm soát chế độ ăn",
                "Liên hệ bác sĩ ngay",
            ],
        }
    )
    st.table(risk_df)

elif page == "📚 Hướng dẫn":
    st.markdown("## Hướng dẫn Sử dụng")

    st.markdown(
        """
        ### 🎯 Bước 1: Nhập Dữ Liệu
        - Điền các chỉ số sức khỏe từ kết quả khám sàng lọc
        - Hoặc dùng giá trị mặc định trên các thanh kéo

        ### 🔍 Bước 2: Phân Tích
        - Click nút `Phân tích nguy cơ`
        - Ứng dụng sẽ ưu tiên gọi backend online trên Render
        - Nếu backend lỗi, ứng dụng sẽ thử dùng model local

        ### 📊 Bước 3: Xem Kết Quả
        - Mức độ nguy cơ (Thấp/Trung bình/Cao)
        - Xác suất phần trăm
        - Khuyến nghị tương ứng
        - Biểu đồ tầm quan trọng đặc trưng
        """
    )

    st.divider()

    st.warning(
        """
        - Kết quả chỉ mang tính tham khảo
        - Không thay thế chẩn đoán y tế chuyên nghiệp
        - Hãy liên hệ bác sĩ để được tư vấn chi tiết
        """
    )


st.divider()
st.markdown(
    """
    ---
    🩺 **DiabetesAI v1.0** | 2024 | Streamlit frontend
    """
)