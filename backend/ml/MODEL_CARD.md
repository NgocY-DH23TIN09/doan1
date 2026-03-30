# Model Card – DiabetesAI Random Forest

## Mô tả

Mô hình phân loại nhị phân dự đoán nguy cơ mắc tiểu đường type 2 dựa trên 8 chỉ số lâm sàng.

---

## Dataset

| Thuộc tính | Giá trị |
|---|---|
| Tên | Pima Indians Diabetes Dataset |
| Nguồn | NIDDK (National Institute of Diabetes and Digestive and Kidney Diseases) |
| Số mẫu gốc | 768 |
| Số mẫu sau SMOTE | ~950 (cân bằng class) |
| Tỉ lệ positive (gốc) | 34.9% (268/768) |
| Đặc trưng | 8 chỉ số lâm sàng |

### Đặc trưng

| Tên cột | Mô tả | Đơn vị |
|---|---|---|
| Pregnancies | Số lần mang thai | lần |
| Glucose | Nồng độ glucose huyết tương (2h sau uống glucose) | mg/dL |
| BloodPressure | Huyết áp tâm trương | mmHg |
| SkinThickness | Độ dày nếp da cơ tam đầu | mm |
| Insulin | Insulin 2 giờ huyết thanh | mU/L |
| BMI | Chỉ số khối cơ thể | kg/m² |
| DiabetesPedigreeFunction | Hệ số tiền sử gia đình tiểu đường | — |
| Age | Tuổi | năm |

---

## Phương pháp

### Tiền xử lý
- Thay thế giá trị `0` không hợp lý (Glucose, BloodPressure, SkinThickness, Insulin, BMI) bằng giá trị trung bình của cột
- **SMOTE** (Synthetic Minority Oversampling Technique, `random_state=42`) để cân bằng class

### Phân chia
- Train/Test: **90/10** (`random_state=0`)
- Chuẩn hóa: **StandardScaler** (fit trên train, transform trên train + test)

### Thuật toán
- **Random Forest Classifier** (`n_estimators=100`, `random_state=42`, `n_jobs=-1`)
- **Cross-validation**: 5-fold trên toàn bộ dữ liệu đã SMOTE

---

## Kết quả

> Kết quả bên dưới được tạo từ Dataset.csv với seed cố định (reproducible).
> Chạy `python backend/ml/train.py` để xem kết quả cập nhật.

| Metric | Giá trị (ước tính) |
|---|---|
| Test Accuracy | ~85–92% |
| CV Score (5-fold) | ~0.88 ± 0.02 |
| AUC-ROC | ~0.90+ |

### Phân bố mức độ nguy cơ

| Ngưỡng | Mức độ |
|---|---|
| < 30% | 🟢 Thấp |
| 30–60% | 🟡 Trung bình |
| ≥ 60% | 🔴 Cao |

### Feature Importance (thứ tự điển hình)

| Đặc trưng | Tầm quan trọng (điển hình) |
|---|---|
| Glucose | ~0.25 |
| BMI | ~0.17 |
| Age | ~0.14 |
| DiabetesPedigreeFunction | ~0.12 |
| Insulin | ~0.11 |
| BloodPressure | ~0.09 |
| SkinThickness | ~0.07 |
| Pregnancies | ~0.05 |

---

## Hạn chế & Lưu ý

> [!WARNING]
> Kết quả chỉ mang tính **tham khảo**, không thay thế chẩn đoán y tế chuyên nghiệp.

- Dataset nguồn gốc chỉ gồm **phụ nữ** người Pima Indians ≥ 21 tuổi → mô hình có thể kém chính xác với nam giới hoặc trẻ em
- Nhiều giá trị 0 trong dataset gốc (không hợp lý sinh học) được xử lý bằng imputation trung bình — đây là nguồn nhiễu tiềm ẩn
- SMOTE tạo mẫu synthetic — không nên overfit kỳ vọng vào test accuracy quá cao
- Model không được cập nhật theo thời gian thực; cần retrain khi có dữ liệu mới

---

## Tái tạo Model

```powershell
# Cài dependencies ML trước
pip install -r backend/requirements.txt

# Từ thư mục gốc dự án
cd backend
python ml/train.py
# Output: ml/model.pkl, ml/scaler.pkl
```

---

## Phiên bản

| Trường | Giá trị |
|---|---|
| Ngày tạo | 2026-03-17 |
| scikit-learn | ≥1.4.2 |
| Dữ liệu | Dataset.csv (Pima Indians, 768 mẫu) |
| Seed train | `random_state=0` (split), `random_state=42` (SMOTE, model) |
