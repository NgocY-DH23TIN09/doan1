"""
🩺 DiabetesAI - Streamlit App
Ứng dụng dự đoán nguy cơ tiểu đường
"""

import streamlit as st
import numpy as np
import pandas as pd
import joblib
import os
from datetime import datetime
import json

# ═════════════════════════════════════════════════════════════
# PAGE CONFIG
# ═════════════════════════════════════════════════════════════

st.set_page_config(
    page_title="🩺 DiabetesAI",
    page_icon="🩺",
    layout="wide",
    initial_sidebar_state="expanded"
)

# ═════════════════════════════════════════════════════════════
# LOAD MODEL
# ═════════════════════════════════════════════════════════════

@st.cache_resource
def load_model():
    """Load ML model"""
    try:
        model_path = os.path.join('backend', 'ml', 'model.pkl')
        scaler_path = os.path.join('backend', 'ml', 'scaler.pkl')
        
        model = joblib.load(model_path)
        scaler = joblib.load(scaler_path)
        return model, scaler, None
    except Exception as e:
        return None, None, str(e)

model, scaler, model_error = load_model()

# ═════════════════════════════════════════════════════════════
# STYLING
# ═════════════════════════════════════════════════════════════

st.markdown("""
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
""", unsafe_allow_html=True)

# ═════════════════════════════════════════════════════════════
# HEADER
# ═════════════════════════════════════════════════════════════

st.markdown('<p class="header-title">🩺 DiabetesAI</p>', unsafe_allow_html=True)
st.markdown("### Hệ thống Dự đoán Nguy cơ Tiểu đường")
st.markdown("Sử dụng Machine Learning để đánh giá nguy cơ mắc bệnh tiểu đường")

st.divider()

# ═════════════════════════════════════════════════════════════
# SIDEBAR
# ═════════════════════════════════════════════════════════════

with st.sidebar:
    st.markdown("### ⚙️ Navigation")
    page = st.radio(
        "Chọn trang:",
        ["🩺 Dự đoán", "📊 Thống kê", "ℹ️ Thông tin", "📚 Hướng dẫn"]
    )

# ═════════════════════════════════════════════════════════════
# PAGE: PREDICTION
# ═════════════════════════════════════════════════════════════

if page == "🩺 Dự đoán":
    st.markdown("## Dự đoán Nguy cơ Tiểu đường")
    
    if model_error:
        st.error(f"❌ Lỗi load model: {model_error}")
    else:
        st.success("✅ Model đã load thành công")
    
    # Input form
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
        bmi = st.slider("Chỉ số BMI (kg/m²)", 0, 70, 28.5, step=0.1)
        diabetes_pedigree = st.slider("Hệ số di truyền", 0.0, 3.0, 0.45, step=0.01)
        age = st.slider("Tuổi", 1, 120, 35)
    
    # Predict button
    col1, col2, col3 = st.columns(3)
    
    with col1:
        if st.button("🔍 Phân tích nguy cơ", use_container_width=True):
            if model and scaler:
                # Prepare data
                features = np.array([[
                    pregnancies,
                    glucose,
                    blood_pressure,
                    skin_thickness,
                    insulin,
                    bmi,
                    diabetes_pedigree,
                    age
                ]])
                
                # Predict
                features_scaled = scaler.transform(features)
                prediction = model.predict(features_scaled)[0]
                probability = model.predict_proba(features_scaled)[0][1]
                
                # Risk level
                if probability < 0.35:
                    risk_level = "Thấp"
                    risk_class = "risk-low"
                    emoji = "🟢"
                elif probability < 0.65:
                    risk_level = "Trung bình"
                    risk_class = "risk-medium"
                    emoji = "🟡"
                else:
                    risk_level = "Cao"
                    risk_class = "risk-high"
                    emoji = "🔴"
                
                # Store in session
                st.session_state.last_prediction = {
                    'risk_level': risk_level,
                    'probability': probability,
                    'input': {
                        'pregnancies': pregnancies,
                        'glucose': glucose,
                        'blood_pressure': blood_pressure,
                        'skin_thickness': skin_thickness,
                        'insulin': insulin,
                        'bmi': bmi,
                        'diabetes_pedigree': diabetes_pedigree,
                        'age': age
                    },
                    'timestamp': datetime.now()
                }
                
                # Display result
                st.divider()
                st.markdown(f"### {emoji} Kết quả Dự đoán")
                
                col1, col2, col3 = st.columns(3)
                with col1:
                    st.metric("Mức Độ Nguy Cơ", risk_level)
                with col2:
                    st.metric("Xác Suất", f"{probability*100:.1f}%")
                with col3:
                    st.metric("Dự Đoán", "Nguy cơ" if prediction == 1 else "Bình thường")
                
                # Recommendation
                st.markdown(f'<div class="{risk_class}">', unsafe_allow_html=True)
                if risk_level == "Thấp":
                    st.markdown("""
                    **💚 Nguy cơ Thấp**
                    
                    Duy trì lối sống lành mạnh:
                    - Ăn uống cân bằng
                    - Tập thể dục đều đặn 30 phút/ngày
                    - Kiểm tra sức khỏe định kỳ
                    """)
                elif risk_level == "Trung bình":
                    st.markdown("""
                    **🟡 Nguy cơ Trung bình**
                    
                    Cần chú ý kiểm soát:
                    - Hạn chế đường và tinh bột
                    - Tăng cường vận động
                    - Kiểm tra đường huyết định kỳ 6 tháng/lần
                    """)
                else:
                    st.markdown("""
                    **🔴 Nguy cơ Cao**
                    
                    Cần hành động ngay:
                    - Đến gặp bác sĩ chuyên khoa
                    - Xét nghiệm chuyên sâu
                    - Kiểm soát nghiêm ngặt chế độ ăn
                    - Theo dõi đường huyết thường xuyên
                    """)
                st.markdown('</div>', unsafe_allow_html=True)
                
                # Feature importance
                st.markdown("### 📊 Tầm Quan Trọng Đặc Trưng")
                if hasattr(model, 'feature_importances_'):
                    feature_names = [
                        'Pregnancies', 'Glucose', 'BloodPressure', 'SkinThickness',
                        'Insulin', 'BMI', 'DiabetesPedigreeFunction', 'Age'
                    ]
                    importances = model.feature_importances_
                    
                    df_imp = pd.DataFrame({
                        'Feature': feature_names,
                        'Importance': importances
                    }).sort_values('Importance', ascending=True)
                    
                    st.bar_chart(df_imp.set_index('Feature'))
            else:
                st.error("❌ Model chưa load được")
    
    with col2:
        if st.button("📊 Dữ liệu Mẫu", use_container_width=True):
            st.info("Click vào input trên để thử dữ liệu mẫu")
    
    with col3:
        if st.button("↺ Xóa", use_container_width=True):
            st.rerun()

# ═════════════════════════════════════════════════════════════
# PAGE: STATISTICS
# ═════════════════════════════════════════════════════════════

elif page == "📊 Thống kê":
    st.markdown("## Thống kê & Lịch sử")
    
    if 'last_prediction' in st.session_state:
        st.success("✅ Có kết quả dự đoán")
        
        pred = st.session_state.last_prediction
        
        col1, col2, col3, col4 = st.columns(4)
        with col1:
            st.metric("Mức Độ Nguy Cơ", pred['risk_level'])
        with col2:
            st.metric("Xác Suất", f"{pred['probability']*100:.1f}%")
        with col3:
            st.metric("Tuổi", pred['input']['age'])
        with col4:
            st.metric("BMI", f"{pred['input']['bmi']:.1f}")
        
        st.markdown("### Chi tiết dự đoán")
        df = pd.DataFrame([pred['input']])
        st.dataframe(df)
        
        st.markdown("### Lịch sử")
        st.info("💾 Để lưu lịch sử, cần backend API. Hiện tại chỉ lưu trong session.")
    else:
        st.info("ℹ️ Chưa có dự đoán nào. Vui lòng thực hiện dự đoán ở trang đầu.")

# ═════════════════════════════════════════════════════════════
# PAGE: INFO
# ═════════════════════════════════════════════════════════════

elif page == "ℹ️ Thông tin":
    st.markdown("## Thông tin Dự án")
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("### 🤖 Model ML")
        st.markdown("""
        - **Thuật toán**: Random Forest
        - **Dataset**: Pima Indians (768 mẫu)
        - **Features**: 8 đặc trưng lâm sàn
        - **Độ chính xác**: 79.22%
        - **Cross-validation**: 5-fold
        """)
    
    with col2:
        st.markdown("### 📊 Đặc Trưng")
        st.markdown("""
        1. Pregnancies - Số lần mang thai
        2. Glucose - Glucose huyết tương (mg/dL)
        3. BloodPressure - Huyết áp tâm trương (mmHg)
        4. SkinThickness - Độ dày nếp da (mm)
        5. Insulin - Insulin 2 giờ (mU/L)
        6. BMI - Chỉ số khối cơ thể
        7. DiabetesPedigreeFunction - Hệ số di truyền
        8. Age - Tuổi
        """)
    
    st.divider()
    
    st.markdown("### 📈 Phân Loại Nguy Cơ")
    
    risk_df = pd.DataFrame({
        'Mức Độ': ['Thấp', 'Trung bình', 'Cao'],
        'Xác Suất': ['< 35%', '35% - 65%', '> 65%'],
        'Khuyến cáo': [
            'Duy trì lối sống lành mạnh',
            'Kiểm soát chế độ ăn',
            'Liên hệ bác sĩ ngay'
        ]
    })
    st.table(risk_df)

# ═════════════════════════════════════════════════════════════
# PAGE: GUIDE
# ═════════════════════════════════════════════════════════════

elif page == "📚 Hướng dẫn":
    st.markdown("## Hướng dẫn Sử dụng")
    
    st.markdown("### 🎯 Bước 1: Nhập Dữ Liệu")
    st.markdown("""
    - Điền các chỉ số sức khỏe từ kết quả khám sàng lọc
    - Hoặc sử dụng dữ liệu mẫu để test
    """)
    
    st.markdown("### 🔍 Bước 2: Phân Tích")
    st.markdown("""
    - Click nút "Phân tích nguy cơ"
    - Chờ kết quả
    """)
    
    st.markdown("### 📊 Bước 3: Xem Kết Quả")
    st.markdown("""
    - Mức độ nguy cơ (Thấp/Trung bình/Cao)
    - Xác suất % (khả năng mắc tiểu đường)
    - Khuyến cáo theo mức độ
    - Biểu đồ tầm quan trọng đặc trưng
    """)
    
    st.divider()
    
    st.markdown("### ⚠️ Lưu Ý Quan Trọng")
    st.warning("""
    - Kết quả chỉ mang tính tham khảo
    - Không thay thế chẩn đoán y tế chuyên nghiệp
    - Hãy liên hệ bác sĩ để được tư vấn chi tiết
    """)
    
    st.markdown("### 📞 Liên Hệ")
    st.markdown("""
    - Email: support@diabetesai.com
    - Điện thoại: 1800-0000
    - Website: www.diabetesai.com
    """)

# ═════════════════════════════════════════════════════════════
# FOOTER
# ═════════════════════════════════════════════════════════════

st.divider()
st.markdown("""
---
🩺 **DiabetesAI v1.0** | 2024 | Made with ❤️ using Streamlit
""")
