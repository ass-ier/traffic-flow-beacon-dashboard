@echo off
cd /d "%~dp0"
echo =======================================
echo Starting Frontend Dashboard
echo =======================================
echo.

REM Check if Node.js is available
echo Checking Node.js installation...
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js/npm is not installed or not in PATH
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)
echo Node.js found.

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing frontend dependencies...
    npm install
)

REM Start frontend development server
echo Starting frontend development server...
echo.
echo Frontend will be available at: http://localhost:8080
echo Backend should be running at: http://localhost:3001  
echo Python Bridge should be at: http://localhost:8814
echo.
echo Use Ctrl+C to stop the frontend server
echo.

npm run dev