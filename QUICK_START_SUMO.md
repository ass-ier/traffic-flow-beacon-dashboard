# Quick Start Guide - Real-Time SUMO Integration

This guide will help you set up and run the Traffic Flow Beacon Dashboard with real SUMO simulation data.

## Prerequisites

### 1. SUMO Installation
- **Download SUMO**: Visit [https://eclipse.org/sumo/](https://eclipse.org/sumo/)
- **Install SUMO**: Follow the installation guide for your operating system
- **Set Environment Variable**: Set `SUMO_HOME` to point to your SUMO installation directory
  - **Windows**: `set SUMO_HOME=C:\Program Files (x86)\Eclipse\Sumo` (adjust path as needed)
  - **Linux/Mac**: `export SUMO_HOME=/usr/share/sumo` (adjust path as needed)

### 2. Node.js
- Download and install from [https://nodejs.org/](https://nodejs.org/)
- Recommended version: Node.js 18+ and npm 9+

### 3. Python
- Install Python 3.8+ from [https://python.org/](https://python.org/)
- Ensure `pip` is available

## Quick Start

### For Windows Users
1. **Open Command Prompt as Administrator**
2. **Navigate to project directory**:
   ```cmd
   cd path\to\traffic-flow-beacon-dashboard
   ```
3. **Run the startup script**:
   ```cmd
   start-sumo-dashboard.bat
   ```

### For Linux/Mac Users
1. **Open Terminal**
2. **Navigate to project directory**:
   ```bash
   cd path/to/traffic-flow-beacon-dashboard
   ```
3. **Make script executable** (if needed):
   ```bash
   chmod +x start-sumo-dashboard.sh
   ```
4. **Run the startup script**:
   ```bash
   ./start-sumo-dashboard.sh
   ```

## Manual Setup (Alternative)

If the automated scripts don't work, you can start each service manually:

### 1. Start SUMO Simulation
```bash
# Navigate to SUMO configuration directory
cd AddisAbabaSumo

# Start SUMO with GUI (recommended for first-time users)
sumo-gui -c AddisAbaba.sumocfg --remote-port 8813 --start

# OR start SUMO headless (without GUI)
sumo -c AddisAbaba.sumocfg --remote-port 8813 --start
```

### 2. Start Python Bridge Service
```bash
# Navigate to Python bridge directory
cd backend/python-bridge

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the bridge
python sumo_bridge.py
```

### 3. Start Backend Server
```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start development server
npm run dev
```

### 4. Start Frontend Dashboard
```bash
# In project root directory
npm install

# Start development server
npm run dev
```

## Service Endpoints

Once all services are running, you can access:

- **Frontend Dashboard**: [http://localhost:5173](http://localhost:5173)
- **Backend API**: [http://localhost:3002](http://localhost:3002)
- **Python Bridge API**: [http://localhost:8814](http://localhost:8814)
- **SUMO TraCI Server**: `localhost:8813` (TCP connection)

## What You'll See

1. **SUMO GUI Window**: Shows the traffic simulation with vehicles moving through Addis Ababa roads
2. **Web Dashboard**: Real-time traffic visualization with:
   - Live vehicle positions on the map
   - Traffic statistics (vehicle count, waiting times, throughput)
   - Intersection status and queue lengths
   - Emergency vehicle tracking
   - Road congestion levels

## Features in Action

### Real-Time Data Flow
1. **SUMO** simulates traffic with the enhanced routes file
2. **Python Bridge** connects to SUMO via TraCI and collects data
3. **Backend** receives data from Python bridge and broadcasts via WebSocket
4. **Frontend** displays real-time updates on the dashboard

### Enhanced Traffic Patterns
The simulation includes:
- **Realistic Vehicle Types**: Cars, buses, trucks, motorcycles, taxis
- **Rush Hour Traffic**: Higher vehicle density during peak hours
- **Emergency Vehicles**: Ambulances and police with priority routing
- **Public Transportation**: Buses and minibuses on regular routes
- **Commercial Traffic**: Delivery trucks and service vehicles

### Interactive Features
- **Live Map**: See vehicles moving in real-time
- **Statistics Panel**: Real-time metrics calculated from actual simulation data
- **Connection Status**: Monitor the health of all system components
- **Traffic Light Control**: Override traffic signals (if needed)

## Troubleshooting

### SUMO Not Starting
- Verify `SUMO_HOME` environment variable is set correctly
- Check that SUMO binaries exist in `$SUMO_HOME/bin/`
- Ensure port 8813 is not in use by another application

### Python Bridge Connection Issues
- Verify SUMO is running and TraCI server is active
- Check Python dependencies are installed correctly
- Look at logs in `logs/python-bridge.log`

### Frontend Not Showing Data
- Ensure all services are running (SUMO, Python Bridge, Backend)
- Check browser console for WebSocket connection errors
- Verify backend is accessible at `http://localhost:3002`

### Performance Issues
- Reduce simulation time step in SUMO configuration
- Limit the number of vehicles in the routes file
- Close unnecessary browser tabs/applications

## Log Files

All services create log files in the `logs/` directory:
- `sumo.log`: SUMO simulation logs
- `python-bridge.log`: Python bridge service logs
- `backend.log`: Backend server logs
- `frontend.log`: Frontend development server logs

## Stopping Services

### Using Startup Scripts
- Press `Ctrl+C` in the terminal/command prompt where you ran the startup script

### Manual Shutdown
- Close SUMO GUI window
- Stop Python bridge with `Ctrl+C`
- Stop backend server with `Ctrl+C`
- Stop frontend server with `Ctrl+C`

## Next Steps

Once you have the system running:
1. **Explore the Dashboard**: Navigate through different views and statistics
2. **Modify Routes**: Edit `AddisAbabaSumo/enhanced_routes.xml` to change traffic patterns
3. **Customize Visualization**: Modify frontend components to add new features
4. **Add Data Analysis**: Implement additional metrics and analytics
5. **Scale the Simulation**: Add more roads, intersections, and vehicle types

## Support

If you encounter issues:
1. Check the log files for error messages
2. Verify all prerequisites are installed correctly
3. Ensure all required ports are available
4. Review the console output for any error messages

The system provides a comprehensive real-time traffic monitoring solution with SUMO integration, giving you detailed insights into urban traffic patterns and congestion management.
