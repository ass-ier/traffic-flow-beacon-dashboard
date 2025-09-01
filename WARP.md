# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Repository Overview

This is a **SUMO Traffic Management Dashboard** - a real-time traffic management system that integrates with SUMO (Simulation of Urban Mobility) to provide live traffic visualization, monitoring, and control capabilities for Addis Ababa, Ethiopia. The system features an interactive web dashboard with real-time traffic data, emergency vehicle tracking, and traffic light control.

## Architecture

The system follows a multi-tier architecture:

```
SUMO Simulation (Port 8813) ←→ Python Bridge (Port 8814) ←→ Node.js Backend (Port 3001) ←→ React Frontend (Port 8080)
```

### Key Components

1. **Frontend (React/TypeScript)**: Interactive dashboard with Leaflet maps and real-time UI
2. **Backend (Node.js/Express)**: WebSocket server and data processing with TypeScript
3. **Python Bridge**: TraCI interface that connects to SUMO simulation
4. **SUMO Simulation**: Urban mobility simulation with Addis Ababa road network

## Common Development Commands

### Frontend Development
```bash
# Start frontend development server
npm run dev

# Build for production
npm run build

# Build for development with debugging
npm run build:dev

# Lint code
npm run lint

# Preview production build
npm run preview
```

### Backend Development
```bash
# Navigate to backend directory
cd backend

# Start backend development server with auto-reload
npm run dev:watch

# Start backend development server
npm run dev

# Build TypeScript to JavaScript
npm run build

# Start production server
npm start

# Run tests
npm test
```

### SUMO Integration
```bash
# Start SUMO with GUI and TraCI enabled
cd AddisAbabaSumo
sumo-gui -c AddisAbaba.sumocfg --remote-port 8813

# Start SUMO headless (for production)
sumo -c AddisAbaba.sumocfg --remote-port 8813 --start

# Start Python bridge
cd backend/python-bridge
python sumo_bridge.py

# Connect Python bridge to SUMO
curl -X POST http://localhost:8814/connect
```

### Full System Startup
```bash
# Terminal 1: Start SUMO simulation
cd AddisAbabaSumo && sumo-gui -c AddisAbaba.sumocfg --remote-port 8813

# Terminal 2: Start Python bridge
cd backend/python-bridge && python sumo_bridge.py

# Terminal 3: Start backend server
cd backend && npm run dev

# Terminal 4: Start frontend
npm run dev

# Then connect bridge to SUMO:
curl -X POST http://localhost:8814/connect
```

### Testing Commands
```bash
# Test SUMO bridge health
curl http://localhost:8814/health

# Test backend health
curl http://localhost:3001/health

# Test vehicle data flow
curl http://localhost:8814/vehicles

# Test traffic light override
curl -X POST http://localhost:8814/command/traffic-light \
  -H "Content-Type: application/json" \
  -d '{"intersectionId": "cluster_1", "phase": "green", "duration": 30}'
```

## Code Architecture

### Data Flow Architecture
The system implements a **reactive data pipeline**:
1. SUMO simulation generates traffic data via TraCI protocol
2. Python bridge (`backend/python-bridge/sumo_bridge.py`) polls SUMO every second and exposes REST API
3. Node.js backend (`backend/src/services/SUMOService.ts`) fetches data from Python bridge and broadcasts via WebSocket
4. React frontend (`src/services/SUMODataService.ts`) subscribes to WebSocket streams and updates UI reactively

### State Management Pattern
- **Backend**: Uses service-oriented architecture with `ConfigManager`, `SUMOService`, `WebSocketService`
- **Frontend**: Uses React Context (`src/contexts/SUMOContext.tsx`) for global SUMO connection state
- **Data Services**: Frontend uses subscription-based data service (`src/services/SUMODataService.ts`) with callback pattern
- **UI State**: React hooks and component state for local UI state management

### Component Architecture
The frontend follows a **component composition** pattern:
- **Layout Components**: `TrafficMap.tsx`, `ControlPanel.tsx`, `StatisticsPanel.tsx`
- **UI Components**: Located in `src/components/ui/` (shadcn/ui components)
- **Business Logic**: Separated into custom hooks (`src/hooks/`) and services (`src/services/`)
- **Context Providers**: Global state management via React Context

### Backend Service Architecture
- **SUMOService**: Main orchestrator that manages connection to Python bridge and mock data fallback
- **WebSocketService**: Handles real-time data broadcasting to connected clients
- **PythonBridgeClient**: HTTP client for communicating with Python TraCI bridge
- **MockDataService**: Provides sample data when SUMO is not available (fallback mode)

### Environment Configuration
- **Frontend**: Uses Vite with environment-based builds, TypeScript path aliases (`@/`)
- **Backend**: Environment-driven configuration via `.env` files with validation
- **Development**: Supports hot reload for both frontend (Vite) and backend (nodemon)

## Key Files and Their Purpose

### Frontend Critical Files
- `src/contexts/SUMOContext.tsx` - Global connection state management
- `src/services/SUMODataService.ts` - WebSocket client and data subscriptions
- `src/components/TrafficMap.tsx` - Main Leaflet map component
- `src/pages/Index.tsx` - Main dashboard layout

### Backend Critical Files
- `backend/src/services/SUMOService.ts` - Main SUMO integration service
- `backend/src/services/WebSocketService.ts` - Real-time communication layer
- `backend/src/services/PythonBridgeClient.ts` - Bridge communication client
- `backend/src/config/ConfigManager.ts` - Environment configuration management

### SUMO Integration Files
- `backend/python-bridge/sumo_bridge.py` - Python TraCI interface
- `AddisAbabaSumo/AddisAbaba.sumocfg` - SUMO simulation configuration
- `AddisAbabaSumo/routes.xml` - Vehicle routes for simulation

## Development Notes

### Mock Data Mode
The system automatically falls back to mock data if SUMO is not available. This allows frontend development without running the full simulation stack. The `MockDataService` generates realistic sample data for all components.

### Real-time Data Subscription Pattern
The frontend uses a subscription-based pattern where components subscribe to specific data types (vehicles, intersections, roads, emergency vehicles). The WebSocket connection automatically handles reconnection and data caching.

### TypeScript Integration
Both frontend and backend use strict TypeScript with shared type definitions in `backend/src/types/` for SUMO data structures. The frontend has additional UI-specific types.

### Error Handling Strategy
- **Connection Failures**: Automatic reconnection with exponential backoff
- **Data Processing Errors**: Graceful degradation to cached data
- **UI Errors**: React Error Boundaries prevent crashes

### Performance Considerations
- **Vehicle Clustering**: Map uses clustering to handle large numbers of vehicles
- **Data Throttling**: Backend throttles updates to prevent UI overload
- **WebSocket Compression**: Enabled for bandwidth efficiency
- **Component Optimization**: Uses React 18 concurrent features for smooth updates

## Environment Setup

### Required Dependencies
- **Node.js 18+** and npm
- **Python 3.8+** with packages: `traci`, `sumolib`, `flask`, `flask-cors`
- **SUMO simulation software** (for full functionality)

### Port Configuration
- Frontend: `8080` (Vite dev server)
- Backend: `3001` (Express server and WebSocket)
- Python Bridge: `8814` (Flask API)
- SUMO TraCI: `8813` (SUMO simulation)

### Environment Files
- `backend/.env` - Backend configuration (copy from `.env.example`)
- Frontend uses Vite's built-in environment handling

The system is designed to work both with and without SUMO for development flexibility. When SUMO is not available, it automatically uses mock data to allow full frontend development and testing.
