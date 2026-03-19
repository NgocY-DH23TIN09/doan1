# 🧠 AI Prediction System

## 📌 Giới thiệu

Dự án sử dụng Machine Learning để dự đoán dựa trên dữ liệu đầu vào từ người dùng.

## 🚀 Công nghệ

- FastAPI (Backend)
- MongoDB (Database)
- Machine Learning (Scikit-learn)
- Streamlit + HTML/CSS/JS (Frontend)

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
pip install -r requirements-streamlit.txt
```
### 3. Tạo file .env
```bash
cp backend/.env.example backend/.env
```

Sau đó mở `backend/.env` và điền giá trị thật cho:

```env
MONGODB_URL=mongodb+srv://your_db_user:your_db_password@cluster0.example.mongodb.net/diabetes_db?retryWrites=true&w=majority&appName=Cluster0
GROQ_API_KEY=your-groq-api-key
SECRET_KEY=your-secret-key
```

Nếu bạn dùng MongoDB local thay vì Atlas, có thể đổi `MONGODB_URL` thành:

```env
MONGODB_URL=mongodb://localhost:27017
```
### 4. Chạy backend
```bash
cd backend
uvicorn main:app --reload
```

### 5. Chạy Streamlit frontend

Frontend Streamlit chính nằm tại [frontend/app.py](frontend/app.py).

```bash
python -m streamlit run frontend/app.py
```

Bạn vẫn có thể chạy qua [app.py](app.py) ở root, đây là launcher tương thích:

```bash
python -m streamlit run app.py
```

### 6. Mở HTML frontend

Không nên mở `frontend/index.html` trực tiếp bằng `file:///` vì trình duyệt sẽ chặn request sang FastAPI do CORS.

Hãy chạy frontend bằng một HTTP server cục bộ, ví dụ:

```bash
cd frontend
python -m http.server 5500
```

Sau đó mở `http://localhost:5500`.

Nếu dùng VS Code Live Server, cổng mặc định `5500` đã được backend cho phép sẵn.

### 7. Backend online

Repo hiện đã được cấu hình để frontend có thể dùng backend Render:

```text
https://doan1-ymhe.onrender.com
```

Trong môi trường local:
- HTML frontend ưu tiên backend local nếu chạy trên `localhost`
- Streamlit frontend gọi backend Render theo mặc định và có fallback về model local

## 🤖 API Example
```http
POST /api/predict
{
  "pregnancies": 1,
  "glucose": 100,
  "blood_pressure": 70,
  "skin_thickness": 20,
  "insulin": 80,
  "bmi": 25,
  "diabetes_pedigree": 0.5,
  "age": 30
}
```

## 📊 Model

- Model: Random Forest
- Dataset: Dataset.csv
- Output: Prediction + Probability
- Accuracy: ~0.79 - 0.85 tùy pipeline/model đang dùng

## 📌 Tác giả

NgocY
