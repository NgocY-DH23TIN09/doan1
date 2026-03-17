FROM python:3.11-slim

# Tránh chạy với root trong production
WORKDIR /app

# Cài dependencies trước (cache layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Port mặc định
EXPOSE 8000

# Entrypoint
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
