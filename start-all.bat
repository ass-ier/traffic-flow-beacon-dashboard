@echo off
echo Starting Traffic Flow Beacon Dashboard...

echo Starting Backend...
start "Backend" cmd /k "cd backend && npm run dev"

timeout /t 3

echo Starting Frontend...
start "Frontend" cmd /k "npm run dev"

timeout /t 3

echo Starting SUMO...
start "SUMO" cmd /k "cd AddisAbabaSumo && sumo -c addis_alt_port.sumocfg"

echo All services started!
pause