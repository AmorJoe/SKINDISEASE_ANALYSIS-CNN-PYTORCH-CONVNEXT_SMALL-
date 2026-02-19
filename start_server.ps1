# SkinScan AI - Server Startup Script
Write-Host "Starting SkinScan AI Backend..." -ForegroundColor Green

# 1. Stop any existing Python processes to free up port 8000
Write-Host "Stopping existing Python processes..." -ForegroundColor Yellow
Get-Process -Name "python" -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Activate Virtual Environment
$VenvPath = ".\venv\Scripts\Activate.ps1"
if (Test-Path $VenvPath) {
    Write-Host "Activating virtual environment..." -ForegroundColor Cyan
    . $VenvPath
} else {
    Write-Host "Virtual environment not found at $VenvPath! Please check your setup." -ForegroundColor Red
    exit 1
}

# 3. Navigate to Backend Directory
Set-Location ".\skinscan-backend"

# 4. Run Migrations (Safe to run every time)
Write-Host "Checking database migrations..." -ForegroundColor Cyan
python manage.py migrate

# 5. Start Server
Write-Host "Starting Django Server on 0.0.0.0:8000..." -ForegroundColor Green
Write-Host "You can access the backend at http://localhost:8000" -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server." -ForegroundColor Yellow

python manage.py runserver 0.0.0.0:8000
