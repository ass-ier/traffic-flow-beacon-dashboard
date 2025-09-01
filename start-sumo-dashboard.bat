@echo off
echo ===============================================
echo Traffic Flow Beacon Dashboard - SUMO Integration
echo ===============================================
echo.

:: Check if SUMO is installed
if not defined SUMO_HOME (
    echo ERROR: SUMO_HOME environment variable not set
    echo Please install SUMO and set SUMO_HOME environment variable
    echo Visit: https://eclipse.org/sumo/
    pause
    exit /b 1
)

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    echo Please install Python from https://python.org/
    pause
    exit /b 1
)

echo Starting Traffic Flow Beacon Dashboard System...
echo.

:: Create logs directory
if not exist "logs" mkdir logs

:: Start SUMO simulation in background
echo [1/4] Starting SUMO Simulation...
start "SUMO Simulation" /MIN cmd /c "cd AddisAbabaSumo && %SUMO_HOME%\bin\sumo-gui.exe -c AddisAbaba.sumocfg --remote-port 8813 --start > ..\logs\sumo.log 2>&1"

:: Wait for SUMO to start
echo Waiting for SUMO to initialize...
timeout /t 5 /nobreak >nul

:: Start Python Bridge
echo [2/4] Starting Python Bridge Service...
start "Python Bridge" /MIN cmd /c "cd backend\python-bridge && python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt && python sumo_bridge.py > ..\..\logs\python-bridge.log 2>&1"

:: Wait for Python Bridge to start
echo Waiting for Python Bridge to initialize...
timeout /t 10 /nobreak >nul

:: Start Backend Server
echo [3/4] Starting Backend Server...
start "Backend Server" /MIN cmd /c "cd backend && npm install && npm run dev > ..\logs\backend.log 2>&1"

:: Wait for Backend to start
echo Waiting for Backend to initialize...
timeout /t 10 /nobreak >nul

:: Start Frontend Development Server
echo [4/4] Starting Frontend Dashboard...
start "Frontend Dashboard" cmd /c "npm install && npm run dev > logs\frontend.log 2>&1"

echo.
echo ===============================================
echo System Startup Complete!
echo ===============================================
echo.
echo Services Status:
echo - SUMO Simulation:     http://localhost:8813 (TraCI)
echo - Python Bridge API:  http://localhost:8814
echo - Backend Server:      http://localhost:3002
echo - Frontend Dashboard:  http://localhost:5173
echo.
echo The dashboard should open automatically in your browser.
echo If not, visit: http://localhost:5173
echo.
echo Log files are available in the 'logs' directory:
echo - sumo.log: SUMO simulation logs
echo - python-bridge.log: Python bridge service logs  
echo - backend.log: Backend server logs
echo - frontend.log: Frontend development server logs
echo.
echo To stop all services, close this window or press Ctrl+C
echo.

:: Wait for user input before closing
pause
