import { ConfigManager } from '../config/ConfigManager.js';
import { WebSocketService } from './WebSocketService.js';
import { PythonBridgeClient } from './PythonBridgeClient.js';
import { MockDataService } from './MockDataService.js';
import { Logger } from '../utils/Logger.js';
import { SimulationUpdate } from '../types/SUMOData.js';

const logger = new Logger('SUMOService');

export class SUMOService {
  private configManager: ConfigManager;
  private wsService: WebSocketService;
  private pythonBridge: PythonBridgeClient | null = null;
  private mockDataService: MockDataService | null = null;
  private connected: boolean = false;
  private usingMockData: boolean = false;
  private reconnectAttempts: number = 0;
  private reconnectTimer?: NodeJS.Timeout;
  private dataUpdateTimer?: NodeJS.Timeout;
  private isProcessing: boolean = false;
  private lastProcessingStats: any = null;

  constructor(configManager: ConfigManager, wsService: WebSocketService) {
    this.configManager = configManager;
    this.wsService = wsService;
  }

  public async connect(): Promise<void> {
    const config = this.configManager.getSUMOConfig();
    
    try {
      logger.info(`Attempting to connect to SUMO via Python bridge`);
      
      // Create Python bridge client
      this.pythonBridge = new PythonBridgeClient({
        host: 'localhost',
        port: 8814, // Python bridge port
        timeout: 10000
      });
      
      // Try to connect to SUMO via Python bridge
      await this.pythonBridge.connect();
      
      this.connected = true;
      this.usingMockData = false;
      this.reconnectAttempts = 0;
      
      logger.info('Successfully connected to SUMO via Python bridge');
      
      // Start data updates
      this.startDataUpdates();
      
      // Notify WebSocket clients of connection status
      this.wsService.broadcast('sumo-connection-status', {
        connected: true,
        usingMockData: false,
        timestamp: Date.now()
      });
      
    } catch (error) {
      logger.warn('Failed to connect to SUMO via Python bridge, falling back to mock data:', error);
      
      // Fall back to mock data service
      this.mockDataService = new MockDataService();
      await this.mockDataService.connect();
      
      this.connected = true;
      this.usingMockData = true;
      this.reconnectAttempts = 0;
      
      logger.info('Using mock data service as fallback');
      
      // Start data updates
      this.startDataUpdates();
      
      // Notify WebSocket clients of connection status
      this.wsService.broadcast('sumo-connection-status', {
        connected: true,
        usingMockData: true,
        timestamp: Date.now()
      });
    }
  }

  public async disconnect(): Promise<void> {
    try {
      logger.info('Disconnecting from SUMO...');
      
      // Stop data updates
      this.stopDataUpdates();
      
      // Disconnect Python bridge
      if (this.pythonBridge) {
        await this.pythonBridge.disconnect();
      }
      
      // Disconnect mock data service
      if (this.mockDataService) {
        await this.mockDataService.disconnect();
      }
      
      this.cleanup();
      
      logger.info('Disconnected from SUMO');
      
      // Notify WebSocket clients of disconnection
      this.wsService.broadcast('sumo-connection-status', {
        connected: false,
        timestamp: Date.now()
      });
      
    } catch (error) {
      logger.error('Error during SUMO disconnection:', error);
      this.cleanup();
      throw error;
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }

  private startDataUpdates(): void {
    const config = this.configManager.getSUMOConfig();
    
    if (this.dataUpdateTimer) {
      clearInterval(this.dataUpdateTimer);
    }
    
    this.dataUpdateTimer = setInterval(async () => {
      await this.processAndBroadcastData();
    }, config.updateInterval);
    
    logger.info(`Started data updates with ${config.updateInterval}ms interval`);
  }

  private stopDataUpdates(): void {
    if (this.dataUpdateTimer) {
      clearInterval(this.dataUpdateTimer);
      this.dataUpdateTimer = undefined;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    
    logger.info('Stopped data updates');
  }

  private async processAndBroadcastData(): Promise<void> {
    if (!this.connected || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    
    try {
      let simulationUpdate: SimulationUpdate;
      
      if (this.usingMockData && this.mockDataService) {
        // Use mock data service
        simulationUpdate = this.mockDataService.getSimulationUpdate();
      } else if (this.pythonBridge) {
        // Use Python bridge
        simulationUpdate = await this.pythonBridge.getAllData();
      } else {
        return;
      }
      
      if (simulationUpdate) {
        // Broadcast all data types (including metrics) in a single call
        this.wsService.broadcastSimulationUpdate(simulationUpdate);
        
        // Update processing stats
        this.lastProcessingStats = {
          vehiclesProcessed: simulationUpdate.vehicles?.length || 0,
          intersectionsProcessed: simulationUpdate.intersections?.length || 0,
          roadsProcessed: simulationUpdate.roads?.length || 0,
          emergencyVehiclesProcessed: simulationUpdate.emergencyVehicles?.length || 0,
          usingMockData: this.usingMockData,
          timestamp: Date.now()
        };
      }
      
    } catch (error) {
      logger.error('Error processing simulation data:', error);
      
      if (!this.usingMockData) {
        // Check if connection is still valid
        if (this.pythonBridge && !(await this.pythonBridge.checkHealth())) {
          logger.warn('Lost connection to SUMO, attempting reconnection...');
          this.connected = false;
          this.attemptReconnect();
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private cleanup(): void {
    this.stopDataUpdates();
    this.connected = false;
    this.pythonBridge = null;
    this.mockDataService = null;
    this.isProcessing = false;
  }

  private async attemptReconnect(): Promise<void> {
    const config = this.configManager.getSUMOConfig();
    
    if (this.reconnectAttempts >= config.maxReconnectAttempts) {
      logger.error(`Max reconnection attempts (${config.maxReconnectAttempts}) reached`);
      return;
    }
    
    this.reconnectAttempts++;
    logger.info(`Reconnection attempt ${this.reconnectAttempts}/${config.maxReconnectAttempts}`);
    
    try {
      await this.connect();
    } catch (error) {
      logger.warn(`Reconnection attempt ${this.reconnectAttempts} failed:`, error);
      
      // Schedule next reconnection attempt
      this.reconnectTimer = setTimeout(() => {
        this.attemptReconnect();
      }, config.reconnectInterval);
    }
  }

  public getProcessingStats(): any {
    return this.lastProcessingStats;
  }

  public updateConfiguration(): void {
    // Restart data updates with new interval if connected
    if (this.connected) {
      this.startDataUpdates();
    }
  }
}