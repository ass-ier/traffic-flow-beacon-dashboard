import axios from 'axios';
import { Logger } from '../utils/Logger.js';
import { 
  VehicleData, 
  IntersectionData, 
  RoadData, 
  EmergencyVehicleData,
  SimulationUpdate 
} from '../types/SUMOData.js';

const logger = new Logger('PythonBridgeClient');

export interface PythonBridgeConfig {
  host: string;
  port: number;
  timeout: number;
}

export interface BridgeResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp?: number;
}

export class PythonBridgeClient {
  private client: any;
  private config: PythonBridgeConfig;
  private connected: boolean = false;

  constructor(config: PythonBridgeConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: `http://${config.host}:${config.port}`,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  public async connect(): Promise<void> {
    try {
      logger.info(`Connecting to Python bridge at ${this.config.host}:${this.config.port}`);
      
      // Check if bridge is healthy
      const healthResponse = await this.client.get('/health');
      
      if (healthResponse.data.status === 'healthy') {
        // Try to connect to SUMO through the bridge
        const connectResponse = await this.client.post('/connect');
        
        if (connectResponse.data.success) {
          this.connected = true;
          logger.info('Successfully connected to SUMO via Python bridge');
        } else {
          throw new Error(connectResponse.data.message || 'Failed to connect to SUMO');
        }
      } else {
        throw new Error('Python bridge is not healthy');
      }
    } catch (error) {
      this.connected = false;
      logger.error('Failed to connect to Python bridge:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      if (this.connected) {
        await this.client.post('/disconnect');
        this.connected = false;
        logger.info('Disconnected from Python bridge');
      }
    } catch (error) {
      logger.error('Error disconnecting from Python bridge:', error);
      this.connected = false;
    }
  }

  public isConnected(): boolean {
    return this.connected;
  }

  public async getVehiclesData(): Promise<VehicleData[]> {
    try {
      const response = await this.client.get('/vehicles');
      return response.data.vehicles || [];
    } catch (error) {
      logger.error('Error getting vehicles data:', error);
      return [];
    }
  }

  public async getIntersectionsData(): Promise<IntersectionData[]> {
    try {
      const response = await this.client.get('/intersections');
      return response.data.intersections || [];
    } catch (error) {
      logger.error('Error getting intersections data:', error);
      return [];
    }
  }

  public async getRoadsData(): Promise<RoadData[]> {
    try {
      const response = await this.client.get('/roads');
      return response.data.roads || [];
    } catch (error) {
      logger.error('Error getting roads data:', error);
      return [];
    }
  }

  public async getEmergencyVehiclesData(): Promise<EmergencyVehicleData[]> {
    try {
      const response = await this.client.get('/emergency-vehicles');
      return response.data.emergency_vehicles || [];
    } catch (error) {
      logger.error('Error getting emergency vehicles data:', error);
      return [];
    }
  }

  public async getAllData(): Promise<SimulationUpdate> {
    try {
      const response = await this.client.get('/all-data');
      const data = response.data;
      
      return {
        timestamp: data.timestamp || Date.now(),
        vehicles: data.vehicles || [],
        intersections: data.intersections || [],
        roads: data.roads || [],
        emergencyVehicles: data.emergency_vehicles || [],
        metrics: data.stats || {}
      };
    } catch (error) {
      logger.error('Error getting all data:', error);
      return {
        timestamp: Date.now(),
        vehicles: [],
        intersections: [],
        roads: [],
        emergencyVehicles: [],
        metrics: {}
      };
    }
  }

  public async getSimulationStats(): Promise<any> {
    try {
      const response = await this.client.get('/simulation-stats');
      return response.data.stats || {};
    } catch (error) {
      logger.error('Error getting simulation stats:', error);
      return {};
    }
  }

  public async checkHealth(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.data.status === 'healthy' && response.data.connected;
    } catch (error) {
      logger.error('Health check failed:', error);
      return false;
    }
  }
}