@echo off
echo ========================================
echo SUMO Traffic Management Dashboard
echo ========================================
echo.
echo Starting services...
echo.

REM Start backend server
echo Starting backend server...
start "Backend Server" cmd /k "cd backend && npm run dev"
timeout /t 3 /nobreak > NUL

REM Start Python bridge
echo Starting Python bridge...
start "Python Bridge" cmd /k "cd backend\python-bridge && python sumo_bridge.py"
timeout /t 2 /nobreak > NUL

REM Start frontend
echo Starting frontend...
start "Frontend" cmd /k "npm run dev"
timeout /t 5 /nobreak > NUL

REM Wait for services to start
echo.
echo Waiting for services to initialize...
timeout /t 8 /nobreak > NUL

REM Open application in browser
echo.
echo Opening SUMO Traffic Dashboard in browser...
start http://localhost:8080

echo.
echo ========================================
echo Dashboard is starting up!
echo ========================================
echo.
echo Access points:
echo   Frontend:      http://localhost:8080
echo   Backend API:   http://localhost:3001
echo   Python Bridge: http://localhost:8814
echo.
echo Press any key to close this window...
pause > NUL
