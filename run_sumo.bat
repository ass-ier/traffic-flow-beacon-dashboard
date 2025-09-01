@echo off
echo Starting SUMO with Addis Ababa configuration...
cd /d "%~dp0AddisAbabaSumo"

echo Checking if SUMO is installed...
sumo-gui --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: SUMO is not installed or not in PATH
    echo Please install SUMO and add it to your system PATH
    pause
    exit /b 1
)

echo Starting SUMO GUI with TraCI enabled...
echo Configuration: working_config.sumocfg
echo TraCI Port: 8813
echo.
sumo-gui -c working_config.sumocfg --start --quit-on-end