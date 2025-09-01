# SUMO Traffic Management System - Complete Startup Guide

## Quick Start (Recommended)

### Option 1: Complete System Startup
Run this command from the project root directory:
```batch
start-system.bat
```

This will start:
1. Python Bridge Service (port 8814)
2. Backend Server (port 3001)

Then manually run:
```batch
start-frontend.bat
```

### Option 2: Manual Step-by-Step Startup

#### Step 1: Start Python Bridge
```batch
cd backend\python-bridge
py sumo_bridge.py
```
- Wait for: "Starting SUMO Bridge API server on port 8814"
- Keep this terminal open

#### Step 2: Start Backend Server
```batch
cd backend
npm run dev
```
- Wait for: Server running on port 3001
- Keep this terminal open

#### Step 3: Start Frontend
```batch
npm run dev
```
- Wait for: Frontend available at http://localhost:8080
- Keep this terminal open

#### Step 4: Start SUMO via Frontend
1. Open browser to: http://localhost:8080
2. Click the **START** button in the dashboard
3. System will automatically:
   - Start SUMO simulation with TraCI
   - Connect Python bridge to SUMO
   - Begin streaming vehicle data
   - Show real-time traffic on the map

## System Architecture

```
Frontend (React) → Backend (Node.js) → Python Bridge → SUMO Simulation
    :8080              :3001              :8814          :8813 (TraCI)
```

## Verification Steps

### Check Services Status
1. **Python Bridge**: http://localhost:8814/health
2. **Backend API**: http://localhost:3001/health  
3. **Frontend**: http://localhost:8080
4. **System Info**: http://localhost:8814/system-info

### Expected Behavior
- ✅ Python Bridge shows "healthy" status
- ✅ Backend API responds
- ✅ Frontend loads dashboard
- ✅ START button initiates SUMO connection
- ✅ Vehicle data appears on map after clicking START

## Troubleshooting

### Common Issues

#### "Python Bridge not responding"
- Ensure Python is installed and in PATH
- Check if port 8814 is available
- Restart: `cd backend\python-bridge && py sumo_bridge.py`

#### "Backend server error"  
- Ensure Node.js is installed
- Run: `cd backend && npm install && npm run dev`

#### "SUMO connection failed"
- Ensure SUMO is installed and in PATH
- Check if port 8813 is available
- Try fallback: System automatically uses simple routes

#### "No vehicles in simulation"
- Wait 10-15 seconds after clicking START
- Check browser console for errors
- Try refreshing the page and clicking START again

### Log Files
- Python Bridge: Check terminal output
- Backend: Check terminal output  
- SUMO: Automatic logging enabled
- Frontend: Check browser developer console (F12)

## Configuration Files

### Main SUMO Config
- **File**: `AddisAbabaSumo/AddisAbaba.sumocfg`
- **Routes**: `AddisAbabaSumo/routes.xml` (29,682 vehicles)
- **Network**: `AddisAbabaSumo/AddisAbaba.net.xml`

### Fallback Config (Auto-created)
- **File**: `AddisAbabaSumo/simple_working.sumocfg`  
- **Routes**: `AddisAbabaSumo/simple_routes.xml` (Flow-based)
- **Purpose**: Guaranteed working simulation

## Success Indicators

When everything works correctly:
1. ✅ All terminals show successful startup
2. ✅ Dashboard shows "Connected" status (green)
3. ✅ Vehicle count > 0 in dashboard
4. ✅ Moving vehicle markers on map
5. ✅ Real-time statistics updating

## Manual SUMO Testing (Optional)

To test SUMO independently:
```batch
cd AddisAbabaSumo
sumo-gui -c AddisAbaba.sumocfg --remote-port 8813
```

Then check connection:
- http://localhost:8814/system-info

## Support

For issues:
1. Check each service terminal for error messages
2. Verify all prerequisites are installed
3. Try restarting services in order
4. Use fallback configuration if main config fails