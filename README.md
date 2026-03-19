# 🧠 AI Prediction System

## 📌 Giới thiệu

Dự án sử dụng Machine Learning để dự đoán dựa trên dữ liệu đầu vào từ người dùng.

## 🚀 Công nghệ

- FastAPI (Backend)
- MongoDB (Database)
- Machine Learning (Scikit-learn)
- HTML/CSS/JS (Frontend)

## 📸 Demo

*(Ảnh trang nhập dữ liệu & trang kết quả sẽ được cập nhật trên Repo)*

## ⚙️ Cách chạy
### 1. Clone project
```bash
git clone https://github.com/NgocY-DH23TIN09/doan1
cd doan1
```
### 2. Cài thư viện
```bash
pip install -r backend/requirements.txt
```
### 3. Tạo file .env
```bash
cp backend/.env.example backend/.env
```
### 4. Chạy backend
```bash
cd backend
uvicorn main:app --reload
```
### 5. Mở frontend

Không nên mở `frontend/index.html` trực tiếp bằng `file:///` vì trình duyệt sẽ chặn request sang FastAPI do CORS.

Hãy chạy frontend bằng một HTTP server cục bộ, ví dụ:

```bash
cd frontend
python -m http.server 5500
```

Sau đó mở `http://localhost:5500`.

Nếu dùng VS Code Live Server, cổng mặc định `5500` đã được backend cho phép sẵn.

## 🤖 API Example
```http
POST /predict
{
  "feature1": 1,
  "feature2": 0.5
}
```

## 📊 Model

- Model: Random Forest
- Dataset: Dataset.csv
- Output: Prediction + Probability
- Accuracy: 0.7922

## 📌 Tác giả

NgocY
