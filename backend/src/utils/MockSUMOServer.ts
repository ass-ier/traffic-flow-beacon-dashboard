import { WebSocketServer, WebSocket } from 'ws';
import { Logger } from './Logger.js';

const logger = new Logger('MockSUMOServer');

export class MockSUMOServer {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();
  private dataInterval?: NodeJS.Timeout;
  private vehicleId = 1;

  constructor(port: number = 8813) {
    this.wss = new WebSocketServer({ port });
    this.setupServer();
    logger.info(`Mock SUMO server started on port ${port}`);
  }

  private setupServer(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      logger.info('Mock SUMO client connected');
      this.clients.add(ws);

      ws.on('close', () => {
        this.clients.delete(ws);
        logger.info('Mock SUMO client disconnected');
      });

      ws.on('message', (data: Buffer) => {
        // Simple mock responses for TraCI commands
        this.handleTraCICommand(ws, data);
      });
    });

    this.startDataGeneration();
  }

  private handleTraCICommand(ws: WebSocket, data: Buffer): void {
    // Mock TraCI protocol responses
    const response = Buffer.alloc(10);
    response.writeUInt32BE(6, 0); // Message length
    response.writeUInt8(0x00, 4); // Command ID
    response.writeUInt8(0x00, 5); // Result (success)
    
    ws.send(response);
  }

  private startDataGeneration(): void {
    this.dataInterval = setInterval(() => {
      this.generateMockData();
    }, 1000);
  }

  private generateMockData(): void {
    // Generate mock vehicles around Addis Ababa
    const vehicles = Array.from({ length: 10 }, (_, i) => ({
      id: `vehicle_${this.vehicleId + i}`,
      type: ['car', 'bus', 'truck'][Math.floor(Math.random() * 3)],
      position: {
        lat: 9.0320 + (Math.random() - 0.5) * 0.02,
        lng: 38.7469 + (Math.random() - 0.5) * 0.02
      },
      speed: Math.random() * 60,
      angle: Math.random() * 360,
      route: [`edge_${Math.floor(Math.random() * 10)}`],
      timestamp: Date.now()
    }));

    // Generate mock intersections
    const intersections = [
      {
        id: 'intersection_1',
        position: { lat: 9.0320, lng: 38.7469 },
        trafficLights: [{
          phase: ['red', 'yellow', 'green'][Math.floor(Math.random() * 3)],
          direction: 'north-south',
          remainingTime: Math.random() * 30,
          nextPhase: 'green'
        }],
        queueLengths: { 'lane_1': Math.floor(Math.random() * 20) },
        waitingTimes: { 'lane_1': Math.random() * 60 },
        congestionLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        timestamp: Date.now()
      }
    ];

    // Generate mock roads
    const roads = [
      {
        id: 'road_1',
        coordinates: [[9.0320, 38.7469], [9.0350, 38.7500]],
        lanes: [{
          id: 'lane_1',
          vehicleCount: Math.floor(Math.random() * 15),
          averageSpeed: Math.random() * 50,
          density: Math.random() * 100,
          flow: Math.random() * 1000
        }],
        congestionLevel: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        incidents: [],
        timestamp: Date.now()
      }
    ];

    this.vehicleId += 10;

    logger.debug(`Generated mock data: ${vehicles.length} vehicles, ${intersections.length} intersections, ${roads.length} roads`);
  }

  public close(): void {
    if (this.dataInterval) {
      clearInterval(this.dataInterval);
    }
    this.wss.close();
    logger.info('Mock SUMO server closed');
  }
}

// Start mock server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const mockServer = new MockSUMOServer();
  
  process.on('SIGINT', () => {
    mockServer.close();
    process.exit(0);
  });
}