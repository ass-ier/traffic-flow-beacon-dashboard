@echo off
echo Starting SUMO (headless) with Addis Ababa configuration...
cd /d "%~dp0AddisAbabaSumo"

echo Checking if SUMO is installed...
sumo --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: SUMO is not installed or not in PATH
    echo Please install SUMO and add it to your system PATH
    pause
    exit /b 1
)

echo Starting SUMO (headless) with TraCI enabled...
echo Configuration: working_config.sumocfg
echo TraCI Port: 8813
echo Press Ctrl+C to stop the simulation
echo.
sumo -c working_config.sumocfg