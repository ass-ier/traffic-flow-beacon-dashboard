@echo off
REM Quick Python Bridge Starter - Run this from the project root
echo Starting Python Bridge...
cd /d "%~dp0backend\python-bridge"
echo Working in: %CD%
echo Installing dependencies if needed...
pip install -r requirements.txt --quiet
echo Starting bridge server (connects to SUMO:8813, serves on :8814)...
python sumo_bridge.py
pause