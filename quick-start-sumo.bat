@echo off
REM Quick SUMO Starter - Run this from the project root
echo Starting SUMO GUI with correct configuration...
cd /d "%~dp0AddisAbabaSumo"
echo Working in: %CD%
echo Using working_config.sumocfg (tested and working)
sumo-gui -c working_config.sumocfg --remote-port 8813 --step-length 1.0
if %errorlevel% neq 0 (
    echo Trying with basic configuration...
    sumo-gui -c AddisAbaba.sumocfg --remote-port 8813 --step-length 1.0
)
pause