# Run script for Zen Research Agent
Write-Host "Launching High-Performance Zen Backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "uvicorn api:app --host 0.0.0.0 --port 8000 --reload" -WindowStyle Normal

Write-Host "Launching Optimized Zen Frontend..." -ForegroundColor Cyan
cd frontend
npm run dev
