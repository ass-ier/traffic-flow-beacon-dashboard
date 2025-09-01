@echo off
echo Starting SUMO Traffic Management System...
echo.
echo This will start both the Python bridge and frontend development server.
echo Press Ctrl+C to stop all services.
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies...
    npm install
    echo.
)

REM Start both services using npm script
echo Starting services...
npm run dev:full

pause