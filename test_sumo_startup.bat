@echo off
echo Testing SUMO Startup
echo ==================
cd /d "%~dp0AddisAbabaSumo"
echo Current directory: %CD%

echo.
echo Checking SUMO installation...
sumo-gui --version
if %errorlevel% neq 0 (
    echo ERROR: SUMO is not installed or not in PATH
    pause
    exit /b 1
)

echo.
echo Checking required files...
if not exist "AddisAbaba.net.xml" (
    echo ERROR: Network file not found
    pause
    exit /b 1
)
if not exist "routes.xml" (
    echo ERROR: Routes file not found
    pause
    exit /b 1
)
if not exist "AddisAbaba.sumocfg" (
    echo ERROR: Config file not found
    pause
    exit /b 1
)

echo All files found.
echo.
echo Starting SUMO with TraCI...
echo Command: sumo-gui -c AddisAbaba.sumocfg --remote-port 8813 --step-length 1.0
echo.

sumo-gui -c AddisAbaba.sumocfg --remote-port 8813 --step-length 1.0

echo.
echo SUMO has closed. Press any key to continue...
pause