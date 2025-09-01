@echo off
echo =============================================
echo Traffic Flow Management System - Integrated Startup
echo =============================================
echo.

REM Check if Python bridge is already running
echo Checking Python bridge status...
netstat -an | findstr :8814 >nul
if %errorlevel% == 0 (
    echo Python bridge is already running on port 8814
) else (
    echo Starting Python bridge...
    cd backend\python-bridge
    start "Python Bridge" cmd /c "python sumo_bridge.py"
    cd ..\..
    timeout /t 5 /nobreak >nul
    echo Python bridge started
)

echo.
echo Starting Backend Server...
cd backend
start "Backend Server" cmd /c "npm run dev"
cd ..
timeout /t 5 /nobreak >nul

echo.
echo Starting Frontend...
start "Frontend" cmd /c "npm run dev"

echo.
echo =============================================
echo All services starting up...
echo =============================================
echo.
echo Services:
echo - Python Bridge:  http://localhost:8814/health
echo - Backend Server: http://localhost:3001/health
echo - Frontend:       http://localhost:5173
echo - WebSocket:      ws://localhost:3001/ws
echo.
echo Press any key to open the dashboard in your browser...
pause >nul
start http://localhost:5173

echo.
echo System is running. Close this window to keep services running.
echo To stop all services, close the individual command windows.
pause
