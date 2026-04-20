@echo off
echo ========================================
echo Multi-Agent Trading Ecosystem
echo ========================================
echo.
echo Starting Backend and Frontend...
echo.

start "Backend Server" cmd /k "cd backend && python api.py"
timeout /t 3 /nobreak >nul
start "Frontend Server" cmd /k "cd frontend && if not exist node_modules (npm install) && npm run dev"

echo.
echo ========================================
echo Backend: http://localhost:8000
echo Frontend: http://localhost:3000
echo ========================================
echo.
echo Press any key to exit...
pause >nul

