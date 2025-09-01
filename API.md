# SUMO Traffic Management Dashboard - API Documentation

## Overview

This document describes the REST API and WebSocket endpoints for the SUMO Traffic Management Dashboard. The system provides real-time traffic monitoring and control capabilities through integration with SUMO simulation software.

## Base URLs

- **Backend API**: `http://localhost:3001/api`
- **WebSocket**: `ws://localhost:3001/ws`
- **Python Bridge**: `http://localhost:8814`

## Authentication

Currently, the API does not require authentication for development. In production environments, you should implement appropriate authentication mechanisms.

## REST API Endpoints

### Health and Status

#### GET /health

Returns the overall system health status.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "sumoConnected": true
}
```

#### GET /api/sumo/stats

Returns detailed SUMO service statistics.

**Response:**
```json
{
  "connected": true,
  "processingStats": {
    "vehiclesProcessed": 150,
    "intersectionsProcessed": 25,
    "roadsProcessed": 100,
    "emergencyVehiclesProcessed": 3,
    "usingMockData": false,
    "timestamp": 1705742400000
  },
  "timestamp": 1705742400000
}
```

### Configuration Management

#### GET /api/config

Returns current system configuration.

**Response:**
```json
{
  "sumo": {
    "host": "localhost",
    "port": 8813,
    "updateInterval": 1000,
    "maxReconnectAttempts": 5,
    "reconnectInterval": 5000
  },
  "websocket": {
    "heartbeatInterval": 30000,
    "maxConnections": 100
  },
  "performance": {
    "maxVehiclesTracked": 1000,
    "dataRetentionHours": 24,
    "updateThrottleMs": 100
  }
}
```

#### POST /api/config

Updates system configuration.

**Request Body:**
```json
{
  "sumo": {
    "updateInterval": 2000
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Configuration updated"
}
```

### SUMO Connection Management

#### POST /api/sumo/connect

Initiates connection to SUMO simulation.

**Response:**
```json
{
  "success": true,
  "message": "Connected to SUMO"
}
```

#### POST /api/sumo/disconnect

Disconnects from SUMO simulation.

**Response:**
```json
{
  "success": true,
  "message": "Disconnected from SUMO"
}
```

### WebSocket Monitoring

#### GET /api/websocket/stats

Returns WebSocket server statistics.

**Response:**
```json
{
  "running": true,
  "connectedClients": 3,
  "totalConnections": 25,
  "messagesReceived": 1250,
  "messagesSent": 3750,
  "errorCount": 0,
  "uptime": 3600000
}
```

#### GET /api/websocket/clients

Returns information about connected WebSocket clients.

**Response:**
```json
{
  "clients": [
    {
      "id": "client-uuid-1",
      "connectedAt": "2024-01-20T10:00:00.000Z",
      "lastSeen": "2024-01-20T10:30:00.000Z",
      "subscriptions": ["vehicles", "intersections"],
      "messageCount": 150
    }
  ],
  "totalCount": 1
}
```

## Python Bridge API

The Python Bridge service provides direct interface to SUMO via TraCI protocol.

### Bridge Health

#### GET /health

Returns Python bridge health status.

**Response:**
```json
{
  "status": "healthy",
  "connected": true,
  "simulation_running": true,
  "timestamp": 1705742400.123
}
```

### SUMO Data Endpoints

#### GET /vehicles

Returns current vehicle data from SUMO.

**Response:**
```json
{
  "vehicles": [
    {
      "id": "vehicle_1",
      "type": "car",
      "position": {
        "lat": 9.0331,
        "lng": 38.7500,
        "roadId": "edge_1",
        "laneId": "edge_1_0"
      },
      "speed": 25.5,
      "angle": 90.0,
      "route": ["edge_1", "edge_2", "edge_3"],
      "timestamp": 1705742400000,
      "waitingTime": 0,
      "distance": 1250.5
    }
  ],
  "timestamp": 1705742400.123,
  "count": 1
}
```

#### GET /intersections

Returns traffic intersection data.

**Response:**
```json
{
  "intersections": [
    {
      "id": "junction_1",
      "position": {
        "lat": 9.0335,
        "lng": 38.7505
      },
      "trafficLights": [
        {
          "phase": "green",
          "direction": "north-south",
          "remainingTime": 45,
          "nextPhase": "yellow"
        }
      ],
      "queueLengths": {
        "edge_1": 3,
        "edge_2": 0
      },
      "waitingTimes": {
        "edge_1": 15.5,
        "edge_2": 0
      },
      "congestionLevel": "medium",
      "timestamp": 1705742400000
    }
  ],
  "timestamp": 1705742400.123,
  "count": 1
}
```

#### GET /roads

Returns road network data.

**Response:**
```json
{
  "roads": [
    {
      "id": "edge_1",
      "coordinates": [
        [38.7500, 9.0331],
        [38.7505, 9.0335]
      ],
      "lanes": [
        {
          "id": "edge_1_0",
          "vehicleCount": 5,
          "averageSpeed": 22.3,
          "density": 0.15,
          "flow": 450
        }
      ],
      "congestionLevel": "low",
      "incidents": [],
      "timestamp": 1705742400000
    }
  ],
  "timestamp": 1705742400.123,
  "count": 1
}
```

#### GET /emergency-vehicles

Returns emergency vehicle data.

**Response:**
```json
{
  "emergency_vehicles": [
    {
      "id": "ambulance_1",
      "type": "emergency",
      "emergencyType": "ambulance",
      "priority": "high",
      "status": "responding",
      "position": {
        "lat": 9.0331,
        "lng": 38.7500
      },
      "speed": 45.0,
      "angle": 90.0,
      "destination": {
        "lat": 9.0400,
        "lng": 38.7600,
        "description": "City Hospital"
      },
      "eta": 300,
      "route": ["edge_1", "edge_2", "edge_3"],
      "timestamp": 1705742400000
    }
  ],
  "timestamp": 1705742400.123,
  "count": 1
}
```

#### GET /all-data

Returns all simulation data in a single request.

**Response:**
```json
{
  "vehicles": [...],
  "intersections": [...],
  "roads": [...],
  "emergency_vehicles": [...],
  "stats": {
    "simulationTime": 1250.5,
    "totalVehicles": 150,
    "activeIntersections": 25
  },
  "timestamp": 1705742400.123
}
```

### Traffic Control

#### POST /command/traffic-light

Override traffic light phase at an intersection.

**Request Body:**
```json
{
  "intersectionId": "junction_1",
  "phase": "green",
  "duration": 30
}
```

**Response:**
```json
{
  "success": true,
  "message": "Traffic light junction_1 set to green"
}
```

## WebSocket API

The WebSocket connection provides real-time data streaming to connected clients.

### Connection

Connect to: `ws://localhost:3001/ws`

### Message Types

#### Subscription Management

Subscribe to specific data types:

```json
{
  "type": "subscribe",
  "dataTypes": ["vehicles", "intersections", "roads", "emergency-vehicles"]
}
```

Unsubscribe from data types:

```json
{
  "type": "unsubscribe",
  "dataTypes": ["roads"]
}
```

#### Data Messages

The server broadcasts data messages for subscribed types:

**Vehicle Data:**
```json
{
  "type": "vehicles",
  "data": [...],
  "timestamp": 1705742400000
}
```

**Intersection Data:**
```json
{
  "type": "intersections",
  "data": [...],
  "timestamp": 1705742400000
}
```

**Connection Status:**
```json
{
  "type": "sumo-connection-status",
  "data": {
    "connected": true,
    "usingMockData": false,
    "timestamp": 1705742400000
  }
}
```

#### Heartbeat

Heartbeat messages to keep connection alive:

```json
{
  "type": "ping"
}
```

Client should respond with:

```json
{
  "type": "pong"
}
```

## Data Models

### Vehicle Data Model

```typescript
interface VehicleData {
  id: string;
  type: 'car' | 'bus' | 'truck' | 'motorcycle' | 'bicycle' | 'emergency';
  position: {
    lat: number;
    lng: number;
    roadId?: string;
    laneId?: string;
  };
  speed: number; // km/h
  angle: number; // degrees
  route: string[]; // edge IDs
  timestamp: number;
  waitingTime?: number; // seconds
  distance?: number; // meters traveled
}
```

### Intersection Data Model

```typescript
interface IntersectionData {
  id: string;
  position: {
    lat: number;
    lng: number;
  };
  trafficLights: {
    phase: 'red' | 'yellow' | 'green' | 'red-yellow';
    direction: string;
    remainingTime: number;
    nextPhase: string;
  }[];
  queueLengths: Record<string, number>;
  waitingTimes: Record<string, number>;
  congestionLevel: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
}
```

### Emergency Vehicle Data Model

```typescript
interface EmergencyVehicleData extends VehicleData {
  emergencyType: 'ambulance' | 'police' | 'fire' | 'rescue';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'responding' | 'on-scene' | 'returning' | 'available';
  destination?: {
    lat: number;
    lng: number;
    description: string;
  };
  eta?: number; // seconds
}
```

## Error Handling

### HTTP Error Responses

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-20T10:30:00.000Z"
}
```

### Common Error Codes

- `SUMO_CONNECTION_FAILED`: Cannot connect to SUMO simulation
- `INVALID_REQUEST`: Request validation failed
- `RESOURCE_NOT_FOUND`: Requested resource not found
- `INTERNAL_ERROR`: Internal server error
- `RATE_LIMIT_EXCEEDED`: Too many requests

### WebSocket Error Messages

WebSocket errors are sent as messages:

```json
{
  "type": "error",
  "message": "Error description",
  "code": "ERROR_CODE",
  "timestamp": 1705742400000
}
```

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Default**: 100 requests per 15 minutes per IP
- **WebSocket**: 1000 messages per minute per connection

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705743000
```

## CORS Configuration

The API supports CORS for web applications:

- **Allowed Origins**: Configurable via `CORS_ORIGINS` environment variable
- **Allowed Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Allowed Headers**: Content-Type, Authorization, X-Requested-With

## Security Considerations

1. **Production Deployment**: Implement proper authentication and authorization
2. **HTTPS**: Use HTTPS in production environments
3. **API Keys**: Consider API key authentication for external clients
4. **Input Validation**: All inputs are validated using Zod schemas
5. **Rate Limiting**: Protect against abuse with rate limiting
6. **CORS**: Configure CORS appropriately for your domain

## Development Tools

### API Testing

Use tools like Postman, Insomnia, or curl to test the API:

```bash
# Health check
curl http://localhost:3001/health

# Get vehicle data
curl http://localhost:8814/vehicles

# Subscribe to WebSocket
wscat -c ws://localhost:3001/ws
```

### Mock Data

When SUMO is not available, the system automatically falls back to mock data mode, allowing full API testing without the simulation environment.

## Support

For API support and questions:

1. Check the server logs for detailed error information
2. Verify all services are running (backend, Python bridge, SUMO)
3. Review environment configuration
4. Check network connectivity between services

## Changelog

- **v1.0.0**: Initial API release with SUMO integration
- Real-time WebSocket streaming
- Comprehensive error handling
- Mock data fallback support
