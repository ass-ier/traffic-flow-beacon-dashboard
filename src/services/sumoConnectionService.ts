// SUMO Connection Service for connecting to the Python bridge
export interface SUMOConnectionStatus {
  connected: boolean;
  sumoRunning: boolean;
  vehicleCount: number;
  simulationTime: number;
  lastUpdate: number;
  error?: string;
}

export interface SUMOVehicleInfo {
  id: string;
  position: { x: number; y: number };
  speed: number;
  route: string;
}

export interface SUMOIntersectionInfo {
  id: string;
  phase: string;
  duration: number;
  nextPhase: string;
}

export class SUMOConnectionService {
  private baseUrl: string;
  private statusUpdateCallbacks = new Set<(status: SUMOConnectionStatus) => void>();
  private vehicleUpdateCallbacks = new Set<(vehicles: SUMOVehicleInfo[]) => void>();
  private intersectionUpdateCallbacks = new Set<(intersections: SUMOIntersectionInfo[]) => void>();
  private pollingInterval?: number;
  private connectionStatus: SUMOConnectionStatus = {
    connected: false,
    sumoRunning: false,
    vehicleCount: 0,
    simulationTime: 0,
    lastUpdate: 0
  };

  constructor(baseUrl: string = 'http://localhost:3001/api') {
    this.baseUrl = baseUrl;
    // Initial service availability check
    this.checkServiceAvailability();
  }

  public async checkServiceAvailability(): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:3001/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        console.log('✓ Backend service is available at: http://localhost:3001');
        return true;
      } else {
        console.warn('Backend service returned error:', response.status);
        return false;
      }
    } catch (error) {
      console.warn('Backend service not available at: http://localhost:3001', error);
      return false;
    }
  }

  public async connect(): Promise<SUMOConnectionStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/sumo/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        this.connectionStatus = {
          connected: true,
          sumoRunning: true,
          vehicleCount: 0,
          simulationTime: 0,
          lastUpdate: Date.now()
        };
        
        // Start polling for data
        this.startPolling();
        
        this.notifyStatusUpdate();
        return this.connectionStatus;
      } else {
        throw new Error(result.message || 'Connection failed');
      }
    } catch (error) {
      this.connectionStatus = {
        connected: false,
        sumoRunning: false,
        vehicleCount: 0,
        simulationTime: 0,
        lastUpdate: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      this.notifyStatusUpdate();
      throw error;
    }
  }

  public async startSUMO(configPath: string = 'AddisAbaba.sumocfg', useGui: boolean = true): Promise<SUMOConnectionStatus> {
    try {
      // First check if backend service is available
      const serviceAvailable = await this.checkServiceAvailability();
      if (!serviceAvailable) {
        throw new Error('Backend service is not running. Please start the backend service first:\n\n1. Open terminal\n2. Run: cd backend\n3. Run: npm run dev\n\nOr use the start-system.bat script.');
      }

      const response = await fetch(`${this.baseUrl}/sumo/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          configPath: configPath,
          useGui: useGui
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        this.connectionStatus = {
          connected: result.data?.connected || true,
          sumoRunning: result.data?.sumo_started || true,
          vehicleCount: result.data?.vehicle_count || 0,
          simulationTime: result.data?.simulation_time || 0,
          lastUpdate: Date.now()
        };
        
        // Start polling for data if connected
        if (this.connectionStatus.connected) {
          this.startPolling();
        }
        
        this.notifyStatusUpdate();
        return this.connectionStatus;
      } else {
        throw new Error(result.message || 'Failed to start SUMO');
      }
    } catch (error) {
      this.connectionStatus = {
        connected: false,
        sumoRunning: false,
        vehicleCount: 0,
        simulationTime: 0,
        lastUpdate: Date.now(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      this.notifyStatusUpdate();
      throw error;
    }
  }

  public async stopSUMO(): Promise<void> {
    try {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = undefined;
      }

      await fetch(`${this.baseUrl}/sumo/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      this.connectionStatus = {
        connected: false,
        sumoRunning: false,
        vehicleCount: 0,
        simulationTime: 0,
        lastUpdate: Date.now()
      };
      
      this.notifyStatusUpdate();
    } catch (error) {
      console.error('Error stopping SUMO:', error);
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = undefined;
      }

      await fetch(`${this.baseUrl}/sumo/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      this.connectionStatus = {
        connected: false,
        sumoRunning: false,
        vehicleCount: 0,
        simulationTime: 0,
        lastUpdate: Date.now()
      };
      
      this.notifyStatusUpdate();
    } catch (error) {
      console.error('Error disconnecting from SUMO:', error);
    }
  }

  public async getStatus(): Promise<SUMOConnectionStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/sumo/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success) {
        this.connectionStatus = {
          connected: result.data.connected,
          sumoRunning: result.data.sumo_running,
          vehicleCount: result.data.vehicle_count || 0,
          simulationTime: result.data.simulation_time || 0,
          lastUpdate: Date.now()
        };
      } else {
        this.connectionStatus.error = result.message;
      }
      
      this.notifyStatusUpdate();
      return this.connectionStatus;
    } catch (error) {
      this.connectionStatus.error = error instanceof Error ? error.message : 'Unknown error';
      this.connectionStatus.connected = false;
      this.notifyStatusUpdate();
      return this.connectionStatus;
    }
  }

  public subscribeToStatusUpdates(callback: (status: SUMOConnectionStatus) => void): () => void {
    this.statusUpdateCallbacks.add(callback);
    
    // Send current status immediately
    callback(this.connectionStatus);
    
    return () => {
      this.statusUpdateCallbacks.delete(callback);
    };
  }

  public subscribeToVehicleUpdates(callback: (vehicles: SUMOVehicleInfo[]) => void): () => void {
    this.vehicleUpdateCallbacks.add(callback);
    
    return () => {
      this.vehicleUpdateCallbacks.delete(callback);
    };
  }

  public subscribeToIntersectionUpdates(callback: (intersections: SUMOIntersectionInfo[]) => void): () => void {
    this.intersectionUpdateCallbacks.add(callback);
    
    return () => {
      this.intersectionUpdateCallbacks.delete(callback);
    };
  }

  public getCurrentStatus(): SUMOConnectionStatus {
    return { ...this.connectionStatus };
  }

  private startPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = window.setInterval(async () => {
      if (this.connectionStatus.connected) {
        await this.getStatus();
        // Note: Vehicle and intersection data comes through WebSocket (SUMODataService)
        // Only polling for connection status here
      }
    }, 2000); // Poll every 2 seconds
  }

  private notifyStatusUpdate(): void {
    this.statusUpdateCallbacks.forEach(callback => callback(this.connectionStatus));
  }

  private notifyVehicleUpdate(vehicles: SUMOVehicleInfo[]): void {
    this.vehicleUpdateCallbacks.forEach(callback => callback(vehicles));
  }

  private notifyIntersectionUpdate(intersections: SUMOIntersectionInfo[]): void {
    this.intersectionUpdateCallbacks.forEach(callback => callback(intersections));
  }
}

// Create singleton instance
export const sumoConnectionService = new SUMOConnectionService();