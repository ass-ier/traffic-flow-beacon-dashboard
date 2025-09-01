# SUMO Traffic Simulation Testing Instructions

## Overview
You have successfully implemented a frontend start button to connect to SUMO and integrated the TraCI bridge. Here's how to test everything:

## Prerequisites
- Frontend running on port 8080
- Backend running on port 3001
- SUMO installed and available in system PATH

## Testing Steps

### 1. Start SUMO Simulation
Navigate to the AddisAbabaSumo directory and start SUMO GUI:

```bash
cd "d:\Hilcoe\4th3rd\Senior_Project\Traffic_Management_System\traffic-flow-beacon-dashboard (4)\traffic-flow-beacon-dashboard (3)\traffic-flow-beacon-dashboard\traffic-flow-beacon-dashboard\traffic-flow-beacon-dashboard\AddisAbabaSumo"
sumo-gui -c AddisAbaba.sumocfg --remote-port 8813 --start
```

**Important Notes:**
- SUMO will start and wait for TraCI connection on port 8813 
- The simulation should show "Starting server on port 8813" and pause - this is normal
- Do NOT start the simulation manually in SUMO GUI yet

### 2. Start Python Bridge
In a new terminal, navigate to the python-bridge directory:

```bash
cd "d:\Hilcoe\4th3rd\Senior_Project\Traffic_Management_System\traffic-flow-beacon-dashboard (4)\traffic-flow-beacon-dashboard (3)\traffic-flow-beacon-dashboard\traffic-flow-beacon-dashboard\traffic-flow-beacon-dashboard\backend\python-bridge"
py sumo_bridge.py
```

The bridge should start and listen on port 8814.

### 3. Connect from Frontend
1. Open the frontend at http://localhost:8080
2. Look for the "System Control Panel" section
3. You should see a "SUMO Connection" section with a "Connect" button
4. Click the "Connect" button
5. You should see the status change to "Connected" with a vehicle count

### 4. Start Simulation in SUMO GUI
1. Once connected, go back to the SUMO GUI window
2. Click the "Play" button (▶) in SUMO GUI to start the simulation
3. You should see vehicles starting to appear and move

### 5. Verify Data Flow
- The frontend should show real-time vehicle count updates
- Check the browser console for any errors
- The Python bridge terminal should show vehicle data being fetched

## Troubleshooting

### No Vehicles Appearing
1. **Check if simulation is running**: In SUMO GUI, make sure you clicked the play button after connecting
2. **Verify time advancement**: Look at the simulation time counter in SUMO GUI - it should be increasing
3. **Check configuration**: Ensure routes.xml has vehicles with depart times starting from 0

### Connection Issues
1. **Port conflicts**: Make sure ports 8813 and 8814 are not in use by other applications
2. **SUMO not found**: Verify SUMO is in system PATH by running `sumo --version`
3. **Python dependencies**: Ensure traci and flask libraries are installed: `pip install traci flask flask-cors`

### Alternative Test Configuration
If the main routes.xml isn't working, try the minimal test configuration:

```bash
# In AddisAbabaSumo directory
sumo-gui -c minimal_test.sumocfg --remote-port 8813 --start
```

This uses a simpler configuration with fewer vehicles that should be easier to debug.

## Expected Behavior

### Frontend ControlPanel
- Shows "SUMO Connection" section
- Status badge shows "Connected" when connected
- Vehicle count badge shows current number of vehicles
- Real-time updates every 2 seconds

### SUMO GUI
- Shows the Addis Ababa road network
- Vehicles appear and move along roads when simulation is running
- Time counter advances when simulation is playing

### Python Bridge
- Logs connection events
- Logs vehicle count and simulation data
- Serves HTTP API on port 8814

## Data Flow
1. SUMO GUI runs the simulation and manages time
2. Python Bridge connects via TraCI and reads simulation state
3. Frontend polls Python Bridge API for updates
4. ControlPanel displays real-time vehicle count and status

## Files Modified
- `src/components/ControlPanel.tsx` - Added SUMO connection UI
- `src/services/sumoConnectionService.ts` - New service for SUMO API communication  
- `backend/python-bridge/sumo_bridge.py` - Fixed API responses and simulation stepping

The implementation correctly separates concerns: SUMO GUI controls simulation time, Python Bridge reads data via TraCI, and Frontend displays real-time updates.