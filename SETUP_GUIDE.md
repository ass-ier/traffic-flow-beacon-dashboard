# SUMO Traffic Management Dashboard - Setup Guide

## Current Status ✅

- ✅ Backend server running on port 3001
- ✅ WebSocket server available at ws://localhost:3001/ws
- ✅ SUMO configuration files present
- ✅ Network and route files available

## Complete System Startup

### 1. Start SUMO Simulation

Open a new terminal and run SUMO with TraCI enabled:

```bash
# Navigate to project root
cd D:\Hilcoe\4th3rd\Senior_Project\Traffic_Management_System\traffic-flow-beacon-dashboard\traffic-flow-beacon-dashboard

# Start SUMO with GUI and TraCI
sumo-gui -c AddisAbaba.sumocfg --remote-port 8813

# OR start SUMO without GUI (headless)
sumo -c AddisAbaba.sumocfg --remote-port 8813
```

### 2. Backend Server (Already Running ✅)

Your backend is already running with:

- Server: http://localhost:3001
- WebSocket: ws://localhost:3001/ws
- TraCI connection will be established automatically when SUMO starts

### 3. Start Frontend Development Server

Open another terminal:

```bash
# In project root directory
npm run dev
```

This will start the frontend on http://localhost:8080

## System Architecture Flow

```
SUMO Simulation (Port 8813) ←→ Backend Server (Port 3001) ←→ Frontend (Port 8080)
```

## Verification Steps

### 1. Check SUMO Connection

- SUMO should show "TraCI server started" message
- Backend logs should show successful TraCI connection

### 2. Check Frontend Connection

- Open http://localhost:8080
- SUMO Connection Status should show "Connected" (green)
- Map should display real-time vehicle data

### 3. Test Features

- **Map Views**: Switch between congestion, traffic lights, and vehicle views
- **Intersection Control**: Click on intersections to override traffic lights
- **Real-time Updates**: Vehicles should move in real-time on the map

## Troubleshooting

### SUMO Connection Issues

```bash
# Check if SUMO is running with TraCI
netstat -an | findstr 8813

# Restart SUMO with verbose output
sumo -c AddisAbaba.sumocfg --remote-port 8813 --verbose
```

### Backend Connection Issues

```bash
# Check backend server status
curl http://localhost:3001/health

# Check WebSocket connection
# Should see WebSocket upgrade in browser dev tools
```

### Frontend Issues

```bash
# Clear cache and restart
npm run build:dev
npm run dev
```

## Configuration Files

### SUMO Configuration (AddisAbaba.sumocfg)

```xml
<configuration>
    <input>
        <net-file value="AddisAbaba.net.xml"/>
        <route-files value="AddisAbabaSumo/routes.xml"/>
    </input>
    <time>
        <begin value="0"/>
        <end value="10800"/> <!-- 3 hours simulation -->
        <step-length value="1.0"/>
    </time>
    <traci_server>
        <remote-port value="8813"/>
    </traci_server>
</configuration>
```

### Backend Environment (.env)

```env
PORT=3001
SUMO_HOST=localhost
SUMO_PORT=8813
WEBSOCKET_PORT=3001
```

## Expected Behavior

### When Everything is Connected:

1. **SUMO GUI**: Shows Addis Ababa road network with moving vehicles
2. **Backend Logs**: Shows real-time data processing messages
3. **Frontend Dashboard**:
   - Green connection status
   - Live vehicle markers moving on map
   - Interactive traffic light controls
   - Real-time statistics updates

### Sample Backend Logs (Success):

```
[INFO] [TraCIClient] Connected to SUMO at localhost:8813
[INFO] [DataProcessor] Processing 45 vehicles, 12 intersections
[INFO] [WebSocketService] Broadcasting data to 1 clients
```

### Sample Frontend Behavior:

- Vehicle markers update every second
- Traffic light colors change based on SUMO simulation
- Intersection queue lengths update in real-time
- Connection status shows latency and last update time

## Performance Tips

1. **SUMO Performance**:

   - Use `--step-length 0.1` for smoother animation
   - Add `--delay 100` to slow down simulation for better visualization

2. **Frontend Performance**:

   - Vehicle clustering is enabled for better map performance
   - Data throttling prevents UI overload

3. **Backend Performance**:
   - WebSocket compression enabled
   - Data filtering reduces bandwidth usage

## Next Steps

1. Start SUMO simulation: `sumo-gui -c AddisAbaba.sumocfg --remote-port 8813`
2. Start frontend: `npm run dev`
3. Open http://localhost:8080
4. Verify all components are connected and working

## Development Mode

For development with sample data (no SUMO required):

- Frontend will automatically use sample data if SUMO is not connected
- All UI features work with mock data
- Perfect for frontend development and testing
