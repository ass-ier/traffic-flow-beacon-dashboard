import { Logger } from '../utils/Logger.js';
import fetch from 'node-fetch';
import { EventEmitter } from 'events';

const logger = new Logger('IntegratedSUMOBridge');

export interface SUMOBridgeConfig {
  pythonBridgeUrl: string;
  pollInterval: number;
  retryInterval: number;
  maxRetries: number;
}

export class IntegratedSUMOBridge extends EventEmitter {
  private config: SUMOBridgeConfig;
  private isConnected: boolean = false;
  private pollTimer?: NodeJS.Timeout;
  private retryCount: number = 0;
  private lastDataHash: string = '';
  
  constructor(config?: Partial<SUMOBridgeConfig>) {
    super();
    this.config = {
      pythonBridgeUrl: config?.pythonBridgeUrl || 'http://localhost:8814',
      pollInterval: config?.pollInterval || 100, // 100ms for real-time updates
      retryInterval: config?.retryInterval || 5000,
      maxRetries: config?.maxRetries || 10
    };
  }

  public async start(): Promise<void> {
    logger.info('Starting Integrated SUMO Bridge...');
    await this.checkPythonBridge();
    this.startPolling();
  }

  public stop(): void {
    logger.info('Stopping Integrated SUMO Bridge...');
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }
    this.isConnected = false;
  }

  private async checkPythonBridge(): Promise<void> {
    try {
      const response = await fetch(`${this.config.pythonBridgeUrl}/health`);
      if (response.ok) {
        const health = await response.json();
        this.isConnected = health.connected;
        logger.info(`Python bridge status: ${this.isConnected ? 'Connected' : 'Not connected to SUMO'}`);
        
        // If Python bridge is not connected to SUMO, try to start it
        if (!this.isConnected && health.status === 'healthy') {
          logger.info('Python bridge is healthy but not connected to SUMO, attempting to start SUMO...');
          await this.startSUMO();
        }
      }
    } catch (error) {
      logger.error('Failed to check Python bridge:', error);
      this.isConnected = false;
    }
  }

  private async startSUMO(): Promise<void> {
    try {
      logger.info('Starting SUMO via Python bridge...');
      const response = await fetch(`${this.config.pythonBridgeUrl}/start-sumo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config_path: 'AddisAbaba.sumocfg',
          gui: true
        })
      });

      if (response.ok) {
        const result = await response.json();
        logger.info('SUMO started successfully:', result);
        this.isConnected = true;
        
        // Wait a bit for SUMO to fully initialize
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Start simulation
        await this.resumeSimulation();
      } else {
        logger.error('Failed to start SUMO:', await response.text());
      }
    } catch (error) {
      logger.error('Error starting SUMO:', error);
    }
  }

  private async resumeSimulation(): Promise<void> {
    try {
      const response = await fetch(`${this.config.pythonBridgeUrl}/simulation/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        logger.info('Simulation resumed');
      }
    } catch (error) {
      logger.error('Failed to resume simulation:', error);
    }
  }

  private startPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }

    this.pollTimer = setInterval(async () => {
      await this.pollData();
    }, this.config.pollInterval);

    // Initial poll
    this.pollData();
  }

  private async pollData(): Promise<void> {
    try {
      // Fetch all data from Python bridge
      const [vehiclesRes, intersectionsRes, roadsRes, emergencyRes, statsRes, statusRes] = await Promise.all([
        fetch(`${this.config.pythonBridgeUrl}/vehicles`).catch(() => null),
        fetch(`${this.config.pythonBridgeUrl}/intersections`).catch(() => null),
        fetch(`${this.config.pythonBridgeUrl}/roads`).catch(() => null),
        fetch(`${this.config.pythonBridgeUrl}/emergency-vehicles`).catch(() => null),
        fetch(`${this.config.pythonBridgeUrl}/simulation-stats`).catch(() => null),
        fetch(`${this.config.pythonBridgeUrl}/status`).catch(() => null)
      ]);

      const data: any = {
        vehicles: [],
        intersections: [],
        roads: [],
        emergencyVehicles: [],
        stats: {},
        status: {}
      };

      // Parse responses
      if (vehiclesRes?.ok) {
        const vehicleData = await vehiclesRes.json();
        data.vehicles = vehicleData.data || [];
      }

      if (intersectionsRes?.ok) {
        const intersectionData = await intersectionsRes.json();
        data.intersections = intersectionData.data || [];
      }

      if (roadsRes?.ok) {
        const roadData = await roadsRes.json();
        data.roads = roadData.roads || [];
      }

      if (emergencyRes?.ok) {
        const emergencyData = await emergencyRes.json();
        data.emergencyVehicles = emergencyData.emergency_vehicles || [];
      }

      if (statsRes?.ok) {
        const statsData = await statsRes.json();
        data.stats = statsData.stats || {};
      }

      if (statusRes?.ok) {
        const statusData = await statusRes.json();
        data.status = statusData.data || {};
        this.isConnected = statusData.data?.connected || false;
      }

      // Create a simple hash to detect changes
      const dataHash = JSON.stringify({
        vehicleCount: data.vehicles.length,
        intersectionCount: data.intersections.length,
        roadCount: data.roads.length,
        emergencyCount: data.emergencyVehicles.length,
        simTime: data.stats.currentTime
      });

      // Only emit if data has changed
      if (dataHash !== this.lastDataHash) {
        this.lastDataHash = dataHash;
        
        // Log data statistics
        if (data.vehicles.length > 0 || data.intersections.length > 0) {
          logger.debug(`Data update - Vehicles: ${data.vehicles.length}, Intersections: ${data.intersections.length}, Roads: ${data.roads.length}, Emergency: ${data.emergencyVehicles.length}`);
        }

        // Emit events for WebSocket service to broadcast
        this.emit('data-update', {
          type: 'all-data',
          timestamp: Date.now(),
          data
        });

        // Emit individual data types for subscribed clients
        if (data.vehicles.length > 0) {
          this.emit('vehicles', data.vehicles);
        }
        if (data.intersections.length > 0) {
          this.emit('intersections', data.intersections);
        }
        if (data.roads.length > 0) {
          this.emit('roads', data.roads);
        }
        if (data.emergencyVehicles.length > 0) {
          this.emit('emergency-vehicles', data.emergencyVehicles);
        }
        
        this.emit('simulation-update', {
          stats: data.stats,
          status: data.status,
          timestamp: Date.now()
        });
      }

      // Reset retry count on successful poll
      if (this.retryCount > 0) {
        this.retryCount = 0;
      }

    } catch (error) {
      logger.error('Error polling data:', error);
      this.retryCount++;
      
      if (this.retryCount >= this.config.maxRetries) {
        logger.error('Max retries reached, stopping polling');
        this.stop();
        this.emit('connection-lost');
      }
    }
  }

  public async sendCommand(command: string, params?: any): Promise<any> {
    try {
      const response = await fetch(`${this.config.pythonBridgeUrl}/command/${command}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params || {})
      });

      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Command failed: ${await response.text()}`);
      }
    } catch (error) {
      logger.error(`Failed to send command ${command}:`, error);
      throw error;
    }
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Export singleton instance
export const integratedSUMOBridge = new IntegratedSUMOBridge();
