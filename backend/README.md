# SUMO Traffic Backend

Backend service for integrating SUMO (Simulation of Urban Mobility) traffic simulation data with the frontend traffic management dashboard.

## Features

- Real-time WebSocket communication with frontend
- SUMO TraCI API integration
- Configurable data streaming and performance settings
- Automatic reconnection and error handling
- RESTful API for configuration management

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment configuration:
```bash
cp .env.example .env
```

3. Configure your SUMO connection in `.env`:
```env
SUMO_HOST=localhost
SUMO_PORT=8813
SUMO_UPDATE_INTERVAL=1000
```

4. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Health Check
- `GET /health` - Server health and SUMO connection status

### Configuration
- `GET /api/config` - Get current configuration
- `POST /api/config` - Update configuration

### SUMO Connection
- `POST /api/sumo/connect` - Connect to SUMO simulation
- `POST /api/sumo/disconnect` - Disconnect from SUMO simulation

## WebSocket Events

### Client to Server
- `subscribe` - Subscribe to data type (vehicles, intersections, roads, emergency-vehicles)
- `unsubscribe` - Unsubscribe from data type
- `ping` - Connection health check

### Server to Client
- `connection-established` - Welcome message with available subscriptions
- `vehicles` - Real-time vehicle data
- `intersections` - Traffic light and intersection data
- `roads` - Road congestion and traffic flow data
- `emergency-vehicles` - Emergency vehicle tracking data
- `sumo-connection-status` - SUMO connection status updates

## Development

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm test` - Run tests

## Configuration

The service can be configured through environment variables or the REST API. Key configuration options:

- **SUMO Connection**: Host, port, update intervals
- **Performance**: Max vehicles tracked, data retention, throttling
- **Server**: Port, logging level

See `.env.example` for all available options.