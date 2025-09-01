// Frontend SUMO Data Service
export interface VehicleData {
  id: string;
  type: 'car' | 'bus' | 'truck' | 'motorcycle' | 'bicycle' | 'emergency';
  position: {
    lat: number;
    lng: number;
    roadId?: string;
    laneId?: string;
  };
  speed: number;
  angle: number;
  route: string[];
  timestamp: number;
  waitingTime?: number;
  distance?: number;
}

export interface IntersectionData {
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

export interface RoadData {
  id: string;
  coordinates: [number, number][];
  lanes: {
    id: string;
    vehicleCount: number;
    averageSpeed: number;
    density: number;
    flow: number;
  }[];
  congestionLevel: 'low' | 'medium' | 'high' | 'critical';
  incidents: any[];
  timestamp: number;
}

export interface EmergencyVehicleData extends VehicleData {
  emergencyType: 'ambulance' | 'police' | 'fire' | 'rescue';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'responding' | 'on-scene' | 'returning' | 'available';
  destination?: {
    lat: number;
    lng: number;
    description: string;
  };
  eta?: number;
}

export interface ConnectionStatus {
  connected: boolean;
  lastUpdate: number;
  latency: number;
  reconnectAttempts: number;
  error?: string;
}

type DataCallback<T> = (data: T[]) => void;
type ConnectionCallback = (status: ConnectionStatus) => void;

import config from '../config/environment';

export class SUMODataService {
  private ws: WebSocket | null = null;
  private serverUrl: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectInterval = 5000;
  private reconnectTimer?: number;
  private pingTimer?: number;
  
  // Subscription callbacks
  private vehicleCallbacks = new Set<DataCallback<VehicleData>>();
  private intersectionCallbacks = new Set<DataCallback<IntersectionData>>();
  private roadCallbacks = new Set<DataCallback<RoadData>>();
  private emergencyVehicleCallbacks = new Set<DataCallback<EmergencyVehicleData>>();
  private connectionCallbacks = new Set<ConnectionCallback>();
  
  // Data caching
  private cachedVehicles: VehicleData[] = [];
  private cachedIntersections: IntersectionData[] = [];
  private cachedRoads: RoadData[] = [];
  private cachedEmergencyVehicles: EmergencyVehicleData[] = [];
  
  // Connection status
  private connectionStatus: ConnectionStatus = {
    connected: false,
    lastUpdate: 0,
    latency: 0,
    reconnectAttempts: 0
  };

  constructor(serverUrl: string = config.websocketUrl) {
    this.serverUrl = serverUrl;
  }

  public async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);
        
        this.ws.onopen = () => {
          console.log('Connected to SUMO WebSocket server');
          this.reconnectAttempts = 0;
          this.updateConnectionStatus({ connected: true, error: undefined });
          this.startPingTimer();
          
          // Send any pending subscriptions
          setTimeout(() => {
            this.sendPendingSubscriptions();
          }, 100);
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        // Note: Browser WebSocket API doesn't expose ping/pong events
        // The ping-pong is handled at the protocol level automatically

        this.ws.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
          this.updateConnectionStatus({ connected: false });
          this.stopPingTimer();
          
          if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.updateConnectionStatus({ 
            connected: false, 
            error: 'Connection error' 
          });
          reject(new Error('WebSocket connection failed'));
        };

        // Connection timeout
        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);

      } catch (error) {
        reject(error);
      }
    });
  }

  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    
    this.stopPingTimer();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.updateConnectionStatus({ connected: false });
  }

  public subscribeToVehicles(callback: DataCallback<VehicleData>): () => void {
    this.vehicleCallbacks.add(callback);
    
    // Send subscription message (will be queued if not connected)
    this.sendSubscriptionMessage('vehicles');
    
    // Send cached data immediately if available
    if (this.cachedVehicles.length > 0) {
      callback(this.cachedVehicles);
    }
    
    return () => {
      this.vehicleCallbacks.delete(callback);
      if (this.vehicleCallbacks.size === 0) {
        this.sendMessage({
          type: 'unsubscribe',
          dataType: 'vehicles'
        });
      }
    };
  }

  public subscribeToIntersections(callback: DataCallback<IntersectionData>): () => void {
    this.intersectionCallbacks.add(callback);
    
    this.sendSubscriptionMessage('intersections');
    
    if (this.cachedIntersections.length > 0) {
      callback(this.cachedIntersections);
    }
    
    return () => {
      this.intersectionCallbacks.delete(callback);
      if (this.intersectionCallbacks.size === 0) {
        this.sendMessage({
          type: 'unsubscribe',
          dataType: 'intersections'
        });
      }
    };
  }

  public subscribeToRoads(callback: DataCallback<RoadData>): () => void {
    this.roadCallbacks.add(callback);
    
    this.sendSubscriptionMessage('roads');
    
    if (this.cachedRoads.length > 0) {
      callback(this.cachedRoads);
    }
    
    return () => {
      this.roadCallbacks.delete(callback);
      if (this.roadCallbacks.size === 0) {
        this.sendMessage({
          type: 'unsubscribe',
          dataType: 'roads'
        });
      }
    };
  }

  public subscribeToEmergencyVehicles(callback: DataCallback<EmergencyVehicleData>): () => void {
    this.emergencyVehicleCallbacks.add(callback);
    
    this.sendSubscriptionMessage('emergency-vehicles');
    
    if (this.cachedEmergencyVehicles.length > 0) {
      callback(this.cachedEmergencyVehicles);
    }
    
    return () => {
      this.emergencyVehicleCallbacks.delete(callback);
      if (this.emergencyVehicleCallbacks.size === 0) {
        this.sendMessage({
          type: 'unsubscribe',
          dataType: 'emergency-vehicles'
        });
      }
    };
  }

  public subscribeToConnection(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.add(callback);
    
    // Send current status immediately
    callback(this.connectionStatus);
    
    return () => {
      this.connectionCallbacks.delete(callback);
    };
  }

  public getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  public setDataFilters(filters: any): void {
    this.sendMessage({
      type: 'set-filters',
      filters
    });
  }

  public clearDataFilters(): void {
    this.sendMessage({
      type: 'clear-filters'
    });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      const now = Date.now();
      
      // Update latency
      if (message.timestamp) {
        const latency = now - message.timestamp;
        this.updateConnectionStatus({ latency });
      }
      
      switch (message.type) {
        case 'vehicles':
          // console.debug('Received vehicles data:', message.data);
          this.cachedVehicles = message.data || [];
          this.vehicleCallbacks.forEach(callback => callback(this.cachedVehicles));
          break;
          
        case 'intersections':
          // console.debug('Received intersections data:', message.data);
          this.cachedIntersections = message.data || [];
          this.intersectionCallbacks.forEach(callback => callback(this.cachedIntersections));
          break;
          
        case 'roads':
          // console.debug('Received roads data:', message.data);
          this.cachedRoads = message.data || [];
          this.roadCallbacks.forEach(callback => callback(this.cachedRoads));
          break;
          
        case 'emergency-vehicles':
          // console.debug('Received emergency vehicles data:', message.data);
          this.cachedEmergencyVehicles = message.data || [];
          this.emergencyVehicleCallbacks.forEach(callback => callback(this.cachedEmergencyVehicles));
          break;
          
        case 'simulation-update':
          // Unified update containing all data
          const update = message.data || {};
          if (update.vehicles) {
            this.cachedVehicles = update.vehicles;
            this.vehicleCallbacks.forEach(cb => cb(this.cachedVehicles));
          }
          if (update.intersections) {
            this.cachedIntersections = update.intersections;
            this.intersectionCallbacks.forEach(cb => cb(this.cachedIntersections));
          }
          if (update.roads) {
            this.cachedRoads = update.roads;
            this.roadCallbacks.forEach(cb => cb(this.cachedRoads));
          }
          if (update.emergencyVehicles) {
            this.cachedEmergencyVehicles = update.emergencyVehicles;
            this.emergencyVehicleCallbacks.forEach(cb => cb(this.cachedEmergencyVehicles));
          }
          break;
          
        case 'traffic-metrics':
          // Optional: expose metrics via connection status error field for now or extend service
          // console.debug('Received traffic metrics:', message.data);
          break;
          
        case 'sumo-connection-status':
          // Handle SUMO backend connection status
          // console.debug('SUMO backend status:', message.data);
          break;
          
        case 'connection-established':
          // console.debug('WebSocket connection established:', message.data);
          break;
          
        case 'subscription-confirmed':
          // console.debug('Subscription confirmed:', message.data.dataType);
          break;
          
        case 'error':
          console.error('Server error:', message.data.message);
          this.updateConnectionStatus({ error: message.data.message });
          break;
          
        case 'pong':
          // Handle ping/pong for connection health
          // console.debug('Received pong from server');
          break;
          
        case 'ping':
          // Respond to server ping with pong
          this.sendMessage({ type: 'pong', timestamp: Date.now() });
          break;
          
        default:
          console.warn('Unknown message type:', message.type);
      }
      
      this.updateConnectionStatus({ lastUpdate: now });
      
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private sendMessage(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, message not sent:', message);
    }
  }

  private updateConnectionStatus(updates: Partial<ConnectionStatus>): void {
    this.connectionStatus = {
      ...this.connectionStatus,
      ...updates,
      reconnectAttempts: this.reconnectAttempts
    };
    
    this.connectionCallbacks.forEach(callback => callback(this.connectionStatus));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = window.setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      });
    }, delay);
  }

  private startPingTimer(): void {
    this.pingTimer = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendMessage({ type: 'ping', timestamp: Date.now() });
      }
    }, 20000); // Ping every 20 seconds (well before backend timeout)
  }

  private stopPingTimer(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = undefined;
    }
  }

  private pendingSubscriptions = new Set<string>();

  private sendSubscriptionMessage(dataType: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log(`Subscribing to ${dataType}`);
      this.sendMessage({
        type: 'subscribe',
        dataType: dataType
      });
      this.pendingSubscriptions.delete(dataType);
    } else {
      // Add to pending subscriptions - will be sent when connected
      console.log(`Adding ${dataType} to pending subscriptions`);
      this.pendingSubscriptions.add(dataType);
    }
  }

  private sendPendingSubscriptions(): void {
    console.log('Sending pending subscriptions:', Array.from(this.pendingSubscriptions));
    this.pendingSubscriptions.forEach(dataType => {
      this.sendMessage({
        type: 'subscribe',
        dataType: dataType
      });
    });
    this.pendingSubscriptions.clear();
  }
}

// Create singleton instance
export const sumoDataService = new SUMODataService();