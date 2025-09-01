@echo off
cd /d "%~dp0"
echo Starting SUMO Python Bridge...
echo Working directory: %CD%
echo Target SUMO port: 8813
echo Bridge API port: 8814
echo.
echo Checking Python installation...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)
echo.
echo Installing/Updating Python dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies
    pause
    exit /b 1
)
echo.
echo Starting bridge server...
echo Bridge will connect to SUMO on port 8813
echo Bridge API will be available on port 8814
echo Press Ctrl+C to stop the bridge
echo.
python sumo_bridge.py
pause