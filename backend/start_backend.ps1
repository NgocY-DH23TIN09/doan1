# ============================================================
#  KHOI DONG BACKEND - DiabetesAI
# ============================================================
# Chay file nay bang:  .\start_backend.ps1
# ============================================================

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  DiabetesAI - Khoi dong Backend" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# 1. Kiem tra MongoDB
$mongodRunning = Get-Process mongod -ErrorAction SilentlyContinue
$mongoService  = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue

if ($mongodRunning) {
    Write-Host "[OK] MongoDB dang chay (process 'mongod' tim thay)" -ForegroundColor Green
} elseif ($mongoService -and $mongoService.Status -eq 'Running') {
    Write-Host "[OK] MongoDB Service dang chay" -ForegroundColor Green
} else {
    Write-Host "[!!] MongoDB CHUA CHAY hoac chua cai dat!" -ForegroundColor Red
    Write-Host ""
    Write-Host "--- Cach khac phuc ---" -ForegroundColor Yellow
    Write-Host "  1. Tai MongoDB tại: https://www.mongodb.com/try/download/community" -ForegroundColor Yellow
    Write-Host "  2. Sau khi cai, khoi dong service:" -ForegroundColor Yellow
    Write-Host "       net start MongoDB" -ForegroundColor White
    Write-Host "  3. Hoac dung MongoDB Atlas (cloud) va cap nhat .env:" -ForegroundColor Yellow
    Write-Host "       MONGODB_URL=mongodb+srv://user:pass@cluster.mongodb.net" -ForegroundColor White
    Write-Host ""

    # Thu khoi dong service neu co
    if ($mongoService) {
        Write-Host "Dang thu khoi dong MongoDB service..." -ForegroundColor Cyan
        Start-Service -Name "MongoDB" -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        $mongoService = Get-Service -Name "MongoDB" -ErrorAction SilentlyContinue
        if ($mongoService.Status -eq 'Running') {
            Write-Host "[OK] Da khoi dong MongoDB service thanh cong!" -ForegroundColor Green
        }
    }
}

Write-Host ""
Write-Host "Khoi dong FastAPI backend tai http://localhost:8000 ..." -ForegroundColor Cyan
Write-Host "Swagger UI: http://localhost:8000/docs" -ForegroundColor Gray
Write-Host "(Nhan Ctrl+C de dung)" -ForegroundColor Gray
Write-Host ""

# 2. Khoi dong uvicorn
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
