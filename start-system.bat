@echo off
cd /d "%~dp0"
echo ======================================
echo SUMO Traffic Management System Startup
echo ======================================
echo.
echo Starting services in correct order...
echo.

REM Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

REM Check if Python is available
echo [1/4] Checking Python installation...
py --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python and add it to your system PATH
    pause
    exit /b 1
)
echo Python found.

REM Check if SUMO is available
echo [2/4] Checking SUMO installation...
sumo --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: SUMO is not installed or not in PATH
    echo Please install SUMO and add it to your system PATH
    echo Download from: https://eclipse.dev/sumo/
    pause
    exit /b 1
)
echo SUMO found.

REM Start Python Bridge Service
echo [3/4] Starting Python Bridge Service...
start "SUMO Python Bridge" cmd /k "cd backend\python-bridge && echo Starting Python Bridge... && py sumo_bridge.py"

REM Wait for Python bridge to initialize
echo Waiting for Python Bridge to initialize (5 seconds)...
timeout /t 5 /nobreak >nul

REM Start Backend Server (if not already running)
echo [4/4] Starting Backend Server...
start "Backend Server" cmd /k "cd backend && echo Starting Backend Server... && npm run dev"

echo.
echo ===============================================
echo System Startup Complete!
echo ===============================================
echo.
echo Services Status:
echo - Python Bridge:  http://localhost:8814
echo - Backend Server: http://localhost:3001
echo.
echo To start SUMO simulation:
echo 1. Open frontend at: http://localhost:8080
echo 2. Click the START button in the dashboard
echo 3. The system will automatically start SUMO with TraCI
echo.
echo Log files are available in the 'logs' directory
echo To stop all services, close the opened terminal windows
echo.

pause