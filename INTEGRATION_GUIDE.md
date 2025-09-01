# Complete SUMO Integration Guide

## System Architecture

```
SUMO Simulation (Port 8813) ←→ Python Bridge (Port 8814) ←→ Node.js Backend (Port 3001) ←→ React Frontend (Port 8081)
```

## Step-by-Step Integration

### 1. Start SUMO with TraCI (Manual)

**Option A: Using SUMO GUI (Recommended)**

```bash
cd AddisAbabaSumo
sumo-gui -c AddisAbaba.sumocfg
```

- In SUMO GUI: File → Open Simulation → Select `AddisAbaba.sumocfg`
- Click the Play button (▶️) to start simulation
- SUMO will automatically start TraCI server on port 8813

**Option B: Command Line**

```bash
cd AddisAbabaSumo
sumo -c AddisAbaba.sumocfg --remote-port 8813 --start
```

### 2. Start Python Bridge

**Install Python Dependencies:**

```bash
cd backend/python-bridge
pip install -r requirements.txt
```

**Start the Bridge:**

```bash
cd backend/python-bridge
python sumo_bridge.py
```

**Expected Output:**

```
INFO:__main__:Starting SUMO Bridge API server on port 8814
* Running on all addresses (0.0.0.0)
* Running on http://127.0.0.1:8814
* Running on http://[::1]:8814
```

### 3. Your Backend is Already Running ✅

Your Node.js backend should already be running on port 3001.

### 4. Connect Python Bridge to SUMO

**Test Connection:**

```bash
curl -X POST http://localhost:8814/connect
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Connected to SUMO"
}
```

### 5. Your Frontend is Already Running ✅

Your React frontend is running on http://localhost:8081

## Verification Steps

### 1. Check SUMO Connection

```bash
curl http://localhost:8814/health
```

Should return:

```json
{
  "status": "healthy",
  "connected": true,
  "simulation_running": true,
  "timestamp": 1692345678.123
}
```

### 2. Check Backend Connection

```bash
curl http://localhost:3001/health
```

Should return:

```json
{
  "status": "healthy",
  "timestamp": "2025-08-18T...",
  "sumoConnected": true
}
```

### 3. Check Frontend

- Open http://localhost:8081
- SUMO Connection Status (bottom-left) should show "Connected" (green)
- Map should display real-time vehicle data

## Testing Data Flow

### 1. Test Vehicle Data

```bash
curl http://localhost:8814/vehicles
```

### 2. Test Intersection Data

```bash
curl http://localhost:8814/intersections
```

### 3. Test All Data

```bash
curl http://localhost:8814/all-data
```

### 4. Test Traffic Light Override

```bash
curl -X POST http://localhost:8814/command/traffic-light \
  -H "Content-Type: application/json" \
  -d '{"intersectionId": "cluster_1", "phase": "green", "duration": 30}'
```

## Troubleshooting

### SUMO Issues

- **SUMO not starting**: Check if routes.xml has valid routes
- **TraCI port busy**: Kill existing SUMO processes: `taskkill /F /IM sumo-gui.exe`
- **No vehicles**: Ensure routes.xml contains vehicle definitions

### Python Bridge Issues

- **Connection failed**: Ensure SUMO is running with TraCI on port 8813
- **Import errors**: Install requirements: `pip install traci sumolib flask flask-cors`
- **Port conflicts**: Change API_PORT environment variable

### Backend Issues

- **Can't connect to Python bridge**: Ensure bridge is running on port 8814
- **WebSocket errors**: Check if port 3001 is available

### Frontend Issues

- **No real-time data**: Check browser console for WebSocket connection errors
- **Connection status red**: Verify all services are running and connected

## Configuration Files

### SUMO Configuration (AddisAbabaSumo/AddisAbaba.sumocfg)

```xml
<configuration>
    <input>
        <net-file value="AddisAbaba.net.xml"/>
        <route-files value="routes.xml"/>
    </input>
    <time>
        <begin value="0"/>
        <end value="3600"/>
        <step-length value="1.0"/>
    </time>
    <traci_server>
        <remote-port value="8813"/>
    </traci_server>
    <processing>
        <ignore-route-errors value="true"/>
    </processing>
    <gui_only>
        <start value="true"/>
    </gui_only>
</configuration>
```

### Backend Environment (.env)

```env
SUMO_HOST=localhost
SUMO_PORT=8813
SERVER_PORT=3001
WEBSOCKET_PORT=3001
```

### Python Bridge Environment

```env
SUMO_HOST=localhost
SUMO_PORT=8813
API_PORT=8814
```

## Expected Behavior When Fully Connected

### SUMO GUI

- Shows Addis Ababa road network
- Vehicles moving on roads
- Traffic lights changing states
- Simulation time advancing

### Python Bridge Logs

```
INFO:SUMOBridge:Connected to SUMO at simulation time: 123.0
INFO:SUMOBridge:Successfully connected to SUMO
INFO:SUMOBridge:Started data update thread
```

### Backend Logs

```
[INFO] [SUMOService] Successfully connected to SUMO via Python bridge
[INFO] [WebSocketService] Broadcasting data to 1 clients
```

### Frontend Dashboard

- Green "Connected" status in bottom-left
- Real-time vehicle markers moving on map
- Traffic light colors updating
- Statistics showing live data
- Intersection controls working

## Quick Start Commands Summary

```bash
# Terminal 1: Start SUMO
cd AddisAbabaSumo
sumo-gui -c AddisAbaba.sumocfg
# Then manually start simulation in GUI

# Terminal 2: Start Python Bridge
cd backend/python-bridge
python sumo_bridge.py

# Terminal 3: Connect Bridge to SUMO
curl -X POST http://localhost:8814/connect

# Terminal 4: Backend (Already Running)
# Your backend is already running on port 3001

# Terminal 5: Frontend (Already Running)
# Your frontend is already running on port 8081

# Open Browser
# http://localhost:8081
```

## Performance Tips

1. **SUMO Performance**: Use `--step-length 0.1` for smoother animation
2. **Data Updates**: Python bridge updates every 1 second by default
3. **Frontend**: Vehicle clustering prevents map overload
4. **Network**: WebSocket compression reduces bandwidth

The system should now be fully integrated with real-time data flowing from SUMO through the Python bridge to your backend and frontend!
