# 🩺 DiabetesAI - Quick Start

## ✅ Dự án sẵn sàng chạy

### 🚀 Cách 1: Streamlit (Dễ nhất - Khuyến nghị)

```bash
python -m streamlit run frontend/app.py
```

✅ Không cần setup  
✅ Mở browser tự động  
✅ Chạy ngay: http://localhost:8501

`app.py` ở root vẫn chạy được nhưng chỉ là launcher trỏ sang `frontend/app.py`.

---

### 🚀 Cách 2: Full Stack (FastAPI + HTML Frontend)

**Terminal 1 - Backend:**
```bash
cd backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend:**
```bash
cd frontend
python -m http.server 5000
```

**Mở browser:**
```
http://localhost:5000/index.html
```

✅ Full features (login, history, MongoDB)  
✅ Cần MongoDB chạy  
✅ Tốt hơn cho demo

---

## 📋 Thông tin dự án

- **App**: Dự đoán nguy cơ tiểu đường
- **Model**: Random Forest (79% accuracy)
- **Dataset**: Pima Indians (768 mẫu)
- **Backend**: FastAPI
- **Frontend**: Streamlit và HTML/JS
- **Database**: MongoDB

---

## ⚡ Nhanh gọn

| | Streamlit | Full Stack |
|---|---|---|
| Setup | 30 sec | 2 min |
| Độ khó | ⭐ | ⭐⭐ |
| Tính năng | Basic | Complete |
| Demo | ✅ Tốt | ✅ Rất tốt |

**👉 Chọn Streamlit để nhanh!**

---

## 🔍 Test

```bash
# Kiểm tra syntax Python
python -m py_compile app.py

# Cài dependencies
pip install -r requirements-streamlit.txt

# Chạy
python -m streamlit run frontend/app.py
```

---

## 📂 Cấu trúc

```
├── app.py                    ✅ Launcher tới frontend/app.py
├── requirements-streamlit.txt
├── QUICKSTART.md            ✅ (file này)
├── backend/
│   ├── main.py              ✅ FastAPI
│   ├── ml/
│   │   ├── model.pkl        ✅ Model
│   │   └── scaler.pkl       ✅ Scaler
│   └── routes/              ✅ API endpoints
└── frontend/
    ├── app.py               ✅ Streamlit app chính
    ├── index.html           ✅ Form
    ├── history.html         ✅ History
    ├── js/
    └── css/
```

---

## 🎯 Một dòng để chạy

```bash
python -m streamlit run frontend/app.py
```

Xong! 🎉
