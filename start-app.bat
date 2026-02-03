@echo off
echo ========================================
echo   Transit Flow AI - Full Stack Startup
echo ========================================
echo.

echo Starting Python Backend Server...
start cmd /k "cd backend && python server.py"

timeout /t 3 /nobreak >nul

echo Starting React Frontend...
start cmd /k "npm run dev"

echo.
echo ========================================
echo   Both servers are starting!
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo ========================================
