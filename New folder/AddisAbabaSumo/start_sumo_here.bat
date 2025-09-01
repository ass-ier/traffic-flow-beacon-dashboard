@echo off
echo Starting SUMO from AddisAbabaSumo directory...
echo Current directory: %CD%

echo Killing existing SUMO processes...
taskkill /F /IM sumo-gui.exe 2>nul
taskkill /F /IM sumo.exe 2>nul
timeout /t 2 /nobreak >nul

echo Checking required files...
if not exist "AddisAbaba.net.xml" (
    echo ERROR: AddisAbaba.net.xml not found in current directory
    pause
    exit /b 1
)

if not exist "routes.xml" (
    echo ERROR: routes.xml not found in current directory
    pause
    exit /b 1
)

echo Starting SUMO with TraCI server on port 8813...
sumo-gui -c AddisAbaba.sumocfg --remote-port 8813 --start

if %ERRORLEVEL% NEQ 0 (
    echo Failed to start SUMO.
    echo Please check that SUMO is installed and in your PATH.
    pause
    exit /b 1
)

echo SUMO is running with TraCI server on port 8813
pause