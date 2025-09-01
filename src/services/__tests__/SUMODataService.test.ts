import { SUMODataService } from '../SUMODataService';

// Mock WebSocket
class MockWebSocket {
  public readyState = WebSocket.CONNECTING;
  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    // Simulate connection after a short delay
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 100);
  }

  send(data: string) {
    // Mock sending data
    console.log('Mock WebSocket send:', data);
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }
}

// Replace global WebSocket with mock
(global as any).WebSocket = MockWebSocket;

describe('SUMODataService', () => {
  let service: SUMODataService;

  beforeEach(() => {
    service = new SUMODataService('ws://localhost:3001/ws');
  });

  afterEach(() => {
    service.disconnect();
  });

  test('should create service instance', () => {
    expect(service).toBeInstanceOf(SUMODataService);
  });

  test('should connect to WebSocket server', async () => {
    await service.connect();
    const status = service.getConnectionStatus();
    expect(status.connected).toBe(true);
  });

  test('should handle vehicle subscriptions', (done) => {
    const mockVehicles = [
      {
        id: 'vehicle_1',
        type: 'car' as const,
        position: { lat: 9.0320, lng: 38.7469 },
        speed: 25,
        angle: 0,
        route: [],
        timestamp: Date.now()
      }
    ];

    service.subscribeToVehicles((vehicles) => {
      expect(vehicles).toEqual(mockVehicles);
      done();
    });

    // Simulate receiving vehicle data
    setTimeout(() => {
      const mockMessage = {
        type: 'vehicles',
        data: mockVehicles,
        timestamp: Date.now()
      };
      
      // Trigger message handler directly for testing
      (service as any).handleMessage({
        data: JSON.stringify(mockMessage)
      });
    }, 200);
  });

  test('should handle connection status updates', (done) => {
    service.subscribeToConnection((status) => {
      if (status.connected) {
        expect(status.connected).toBe(true);
        expect(status.reconnectAttempts).toBe(0);
        done();
      }
    });

    service.connect();
  });

  test('should handle disconnection', () => {
    service.disconnect();
    const status = service.getConnectionStatus();
    expect(status.connected).toBe(false);
  });
});

export {};