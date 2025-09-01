@echo off
echo ================================================
echo  Traffic Flow Beacon Dashboard - SUMO Startup
echo ================================================
echo.

REM Get the script directory
set SCRIPT_DIR=%~dp0
cd /d "%SCRIPT_DIR%"

echo Current working directory: %CD%
echo.

echo Step 1: Starting Python Bridge...
echo --------------------------------
cd /d "%SCRIPT_DIR%backend\python-bridge"
echo Changed to: %CD%
start "Python Bridge" cmd /k "start_bridge.bat"
echo Python Bridge starting in new window...
echo.

echo Waiting 3 seconds for Python Bridge to initialize...
timeout /t 3 /nobreak >nul

echo Step 2: Starting SUMO GUI...
echo ----------------------------
cd /d "%SCRIPT_DIR%AddisAbabaSumo"
echo Changed to: %CD%
start "SUMO GUI" cmd /k "start_sumo.bat"
echo SUMO GUI starting in new window...
echo.

echo ================================================
echo  Both services are starting in separate windows
echo ================================================
echo.
echo Services launched:
echo 1. Python Bridge (Port 8814) - Connects to SUMO
echo 2. SUMO GUI (Port 8813) - Using working_config.sumocfg
echo.
echo Configuration Details:
echo - Network: AddisAbaba.net.xml
echo - Routes: simple_routes.xml (tested and working)
echo - TraCI Port: 8813
echo.
echo Next steps:
echo 1. Wait for both windows to finish loading
echo 2. In SUMO GUI window, click Play button to start simulation
echo 3. Check your dashboard for connection status
echo.
echo Press any key to close this window...
pause >nul