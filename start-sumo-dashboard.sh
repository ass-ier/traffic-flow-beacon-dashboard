#!/bin/bash

echo "==============================================="
echo "Traffic Flow Beacon Dashboard - SUMO Integration"
echo "==============================================="
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${RED}ERROR: $1 is not installed or not in PATH${NC}"
        echo "Please install $1 before running this script"
        exit 1
    fi
}

# Function to wait for a port to be available
wait_for_port() {
    local port=$1
    local service=$2
    local max_attempts=30
    local attempt=0
    
    echo -e "${YELLOW}Waiting for $service to start on port $port...${NC}"
    
    while ! nc -z localhost $port 2>/dev/null && [ $attempt -lt $max_attempts ]; do
        sleep 1
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -eq $max_attempts ]; then
        echo -e "${RED}WARNING: $service may not have started properly${NC}"
    else
        echo -e "${GREEN}$service is ready on port $port${NC}"
    fi
}

# Check prerequisites
echo "Checking prerequisites..."

# Check SUMO installation
if [ -z "$SUMO_HOME" ]; then
    echo -e "${RED}ERROR: SUMO_HOME environment variable not set${NC}"
    echo "Please install SUMO and set SUMO_HOME environment variable"
    echo "Visit: https://eclipse.org/sumo/"
    exit 1
fi

# Check if SUMO binaries exist
if [ ! -f "$SUMO_HOME/bin/sumo-gui" ] && [ ! -f "$SUMO_HOME/bin/sumo" ]; then
    echo -e "${RED}ERROR: SUMO binaries not found in $SUMO_HOME/bin/${NC}"
    echo "Please check your SUMO installation"
    exit 1
fi

# Check other commands
check_command "node"
check_command "python3"
check_command "npm"

echo -e "${GREEN}All prerequisites met!${NC}"
echo

# Create logs directory
mkdir -p logs

# Cleanup function
cleanup() {
    echo
    echo -e "${YELLOW}Shutting down services...${NC}"
    
    # Kill all child processes
    jobs -p | xargs -r kill
    
    # Kill processes by port
    lsof -ti:8813 | xargs -r kill -9 2>/dev/null
    lsof -ti:8814 | xargs -r kill -9 2>/dev/null
    lsof -ti:3002 | xargs -r kill -9 2>/dev/null
    lsof -ti:5173 | xargs -r kill -9 2>/dev/null
    
    echo -e "${GREEN}All services stopped.${NC}"
    exit 0
}

# Set trap for cleanup on script exit
trap cleanup EXIT INT TERM

echo "Starting Traffic Flow Beacon Dashboard System..."
echo

# 1. Start SUMO Simulation
echo -e "${BLUE}[1/4] Starting SUMO Simulation...${NC}"
cd AddisAbabaSumo
if [ -f "$SUMO_HOME/bin/sumo-gui" ]; then
    nohup $SUMO_HOME/bin/sumo-gui -c AddisAbaba.sumocfg --remote-port 8813 --start > ../logs/sumo.log 2>&1 &
    echo "SUMO GUI started (simulation will be visible)"
else
    nohup $SUMO_HOME/bin/sumo -c AddisAbaba.sumocfg --remote-port 8813 --start > ../logs/sumo.log 2>&1 &
    echo "SUMO command line started (headless simulation)"
fi
cd ..

# Wait a bit for SUMO to initialize
sleep 5

# 2. Start Python Bridge
echo -e "${BLUE}[2/4] Starting Python Bridge Service...${NC}"
cd backend/python-bridge

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment and install dependencies
source venv/bin/activate
pip install -r requirements.txt > /dev/null 2>&1

# Start the bridge
nohup python sumo_bridge.py > ../../logs/python-bridge.log 2>&1 &
cd ../..

# Wait for Python Bridge
wait_for_port 8814 "Python Bridge"

# 3. Start Backend Server
echo -e "${BLUE}[3/4] Starting Backend Server...${NC}"
cd backend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing backend dependencies..."
    npm install > /dev/null 2>&1
fi

# Start backend
nohup npm run dev > ../logs/backend.log 2>&1 &
cd ..

# Wait for Backend
wait_for_port 3002 "Backend Server"

# 4. Start Frontend
echo -e "${BLUE}[4/4] Starting Frontend Dashboard...${NC}"

# Install frontend dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install > /dev/null 2>&1
fi

# Start frontend (this will keep running in foreground)
npm run dev > logs/frontend.log 2>&1 &

# Wait for Frontend
wait_for_port 5173 "Frontend Dashboard"

echo
echo "==============================================="
echo -e "${GREEN}System Startup Complete!${NC}"
echo "==============================================="
echo
echo "Services Status:"
echo -e "${GREEN}- SUMO Simulation:     TraCI server on port 8813${NC}"
echo -e "${GREEN}- Python Bridge API:  http://localhost:8814${NC}"
echo -e "${GREEN}- Backend Server:      http://localhost:3002${NC}"
echo -e "${GREEN}- Frontend Dashboard:  http://localhost:5173${NC}"
echo
echo -e "${YELLOW}The dashboard is available at: http://localhost:5173${NC}"
echo
echo "Log files are available in the 'logs' directory:"
echo "- sumo.log: SUMO simulation logs"
echo "- python-bridge.log: Python bridge service logs"
echo "- backend.log: Backend server logs"
echo "- frontend.log: Frontend development server logs"
echo
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"

# Keep the script running
wait
