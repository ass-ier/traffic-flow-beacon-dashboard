@echo off
echo Starting Traffic Flow Beacon Dashboard...

echo.
echo [1/4] Starting SUMO with Addis Ababa configuration...
start "SUMO" cmd /k "cd AddisAbabaSumo && sumo-gui -c working_config.sumocfg"

echo.
echo [2/4] Waiting for SUMO to initialize...
timeout /t 5

echo.
echo [3/4] Starting Backend Server...
start "Backend" cmd /k "cd backend && npm run dev"

echo.
echo [4/4] Waiting for backend to start...
timeout /t 8

echo.
echo [5/5] Starting Frontend...
start "Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo All services started successfully!
echo ========================================
echo SUMO GUI: Running with TraCI on port 8813
echo Backend: http://localhost:3001
echo Frontend: http://localhost:8080
echo ========================================
echo.
echo Press any key to exit...
pause >nul