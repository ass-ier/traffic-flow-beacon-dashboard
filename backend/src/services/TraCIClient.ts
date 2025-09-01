import { Socket } from 'net';
import { Logger } from '../utils/Logger.js';
import { SUMOConnectionConfig } from '../types/Configuration.js';

const logger = new Logger('TraCIClient');

// TraCI command constants
const TraCICommands = {
  // Control commands
  GET_VERSION: 0x00,
  LOAD: 0x01,
  SIMULATION_STEP: 0x02,
  CLOSE: 0x7F,
  
  // Vehicle commands
  GET_VEHICLE_VARIABLE: 0xa4,
  SET_VEHICLE_VARIABLE: 0xc4,
  
  // Traffic Light commands
  GET_TL_VARIABLE: 0xa2,
  SET_TL_VARIABLE: 0xc2,
  
  // Edge/Road commands
  GET_EDGE_VARIABLE: 0xaa,
  
  // Lane commands
  GET_LANE_VARIABLE: 0xa3,
  
  // Simulation commands
  GET_SIM_VARIABLE: 0xab,
  
  // Subscription commands
  SUBSCRIBE_VEHICLE_VARIABLE: 0xd4,
  SUBSCRIBE_TL_VARIABLE: 0xd2,
  SUBSCRIBE_EDGE_VARIABLE: 0xda,
  SUBSCRIBE_LANE_VARIABLE: 0xd3,
  SUBSCRIBE_SIM_VARIABLE: 0xdb
} as const;

// Variable IDs for different data types
const VariableIDs = {
  // Vehicle variables
  VAR_POSITION: 0x42,
  VAR_SPEED: 0x40,
  VAR_ANGLE: 0x43,
  VAR_ROAD_ID: 0x50,
  VAR_LANE_ID: 0x51,
  VAR_TYPE: 0x4f,
  VAR_ROUTE: 0x57,
  VAR_WAITING_TIME: 0x7a,
  VAR_ACCUMULATED_WAITING_TIME: 0x87,
  VAR_DISTANCE: 0x84,
  VAR_CO2_EMISSION: 0x60,
  VAR_FUEL_CONSUMPTION: 0x5e,
  VAR_NOISE_EMISSION: 0x66,
  
  // Traffic Light variables
  VAR_TL_RED_YELLOW_GREEN_STATE: 0x20,
  VAR_TL_COMPLETE_DEFINITION_RYG: 0x2e,
  VAR_TL_CURRENT_PHASE: 0x28,
  VAR_TL_CURRENT_PROGRAM: 0x29,
  VAR_TL_NEXT_SWITCH: 0x2d,
  
  // Edge/Road variables
  VAR_EDGE_TRAVELTIME: 0x5a,
  VAR_EDGE_EFFORT: 0x59,
  VAR_LAST_STEP_VEHICLE_NUMBER: 0x10,
  VAR_LAST_STEP_MEAN_SPEED: 0x11,
  VAR_LAST_STEP_VEHICLE_IDS: 0x12,
  VAR_LAST_STEP_OCCUPANCY: 0x13,
  VAR_LAST_STEP_LENGTH: 0x15,
  
  // Lane variables
  VAR_LANE_LINKS: 0x33,
  VAR_LANE_ALLOWED: 0x34,
  VAR_LANE_DISALLOWED: 0x35,
  VAR_LENGTH: 0x44,
  VAR_MAXSPEED: 0x41,
  
  // Simulation variables
  VAR_TIME_STEP: 0x70,
  VAR_LOADED_VEHICLES_NUMBER: 0x71,
  VAR_LOADED_VEHICLES_IDS: 0x72,
  VAR_DEPARTED_VEHICLES_NUMBER: 0x73,
  VAR_DEPARTED_VEHICLES_IDS: 0x74,
  VAR_ARRIVED_VEHICLES_NUMBER: 0x79,
  VAR_ARRIVED_VEHICLES_IDS: 0x7a
} as const;

export interface TraCIResponse {
  commandId: number;
  result: number;
  description: string;
  data?: any;
}

export interface RawVehicleData {
  id: string;
  position: { x: number; y: number };
  speed: number;
  angle: number;
  roadId: string;
  laneId: string;
  type: string;
  route: string[];
  waitingTime?: number;
  accumulatedWaitingTime?: number;
  distance?: number;
  co2Emission?: number;
  fuelConsumption?: number;
  noiseEmission?: number;
}

export interface RawIntersectionData {
  id: string;
  position: { x: number; y: number };
  tlsStates: string;
  currentPhase: number;
  nextSwitch: number;
  programId: string;
}

export interface RawRoadData {
  id: string;
  vehicleCount: number;
  meanSpeed: number;
  vehicleIds: string[];
  occupancy: number;
  length: number;
  lanes: RawLaneData[];
}

export interface RawLaneData {
  id: string;
  vehicleCount: number;
  meanSpeed: number;
  occupancy: number;
  length: number;
  maxSpeed: number;
}

export class TraCIClient {
  private socket: Socket | null = null;
  private config: SUMOConnectionConfig;
  private connected: boolean = false;
  private messageBuffer: Buffer = Buffer.alloc(0);
  private pendingResponses: Map<number, (response: TraCIResponse) => void> = new Map();
  private commandCounter: number = 0;

  constructor(config: SUMOConnectionConfig) {
    this.config = config;
  }

  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = new Socket();
        
        // Set timeout
        this.socket.setTimeout(this.config.timeout || 10000);
        
        this.socket.connect(this.config.port, this.config.host, () => {
          logger.info(`Connected to SUMO TraCI at ${this.config.host}:${this.config.port}`);
          this.connected = true;
          this.initializeConnection().then(resolve).catch(reject);
        });

        this.socket.on('data', (data: Buffer) => {
          this.handleIncomingData(data);
        });

        this.socket.on('error', (error: Error) => {
          logger.error('TraCI socket error:', error);
          this.connected = false;
          reject(error);
        });

        this.socket.on('close', () => {
          logger.info('TraCI connection closed');
          this.connected = false;
        });

        this.socket.on('timeout', () => {
          logger.error('TraCI connection timeout');
          this.connected = false;
          reject(new Error('Connection timeout'));
        });

      } catch (error) {
        logger.error('Failed to create TraCI connection:', error);
        reject(error);
      }
    });
  }

  public async disconnect(): Promise<void> {
    if (this.socket && this.connected) {
      try {
        // Send close command
        await this.sendCommand(TraCICommands.CLOSE, Buffer.alloc(0));
        this.socket.end();
      } catch (error) {
        logger.warn('Error during graceful disconnect:', error);
        this.socket.destroy();
      }
    }
    
    this.connected = false;
    this.socket = null;
    this.pendingResponses.clear();
    logger.info('TraCI client disconnected');
  }

  public isConnected(): boolean {
    return this.connected && this.socket !== null;
  }

  public async getVehicleIds(): Promise<string[]> {
    const response = await this.sendCommand(
      TraCICommands.GET_VEHICLE_VARIABLE,
      this.buildGetCommand(VariableIDs.VAR_LANE_ID, '')
    );
    
    return this.parseStringList(response.data);
  }

  public async getVehicleData(vehicleId: string): Promise<RawVehicleData | null> {
    try {
      const [position, speed, angle, roadId, laneId, type, route] = await Promise.all([
        this.getVehiclePosition(vehicleId),
        this.getVehicleSpeed(vehicleId),
        this.getVehicleAngle(vehicleId),
        this.getVehicleRoadId(vehicleId),
        this.getVehicleLaneId(vehicleId),
        this.getVehicleType(vehicleId),
        this.getVehicleRoute(vehicleId)
      ]);

      // Optional data (may not be available for all vehicles)
      const [waitingTime, accWaitingTime, distance, co2, fuel, noise] = await Promise.allSettled([
        this.getVehicleWaitingTime(vehicleId),
        this.getVehicleAccumulatedWaitingTime(vehicleId),
        this.getVehicleDistance(vehicleId),
        this.getVehicleCO2Emission(vehicleId),
        this.getVehicleFuelConsumption(vehicleId),
        this.getVehicleNoiseEmission(vehicleId)
      ]);

      return {
        id: vehicleId,
        position,
        speed,
        angle,
        roadId,
        laneId,
        type,
        route,
        waitingTime: waitingTime.status === 'fulfilled' ? waitingTime.value : undefined,
        accumulatedWaitingTime: accWaitingTime.status === 'fulfilled' ? accWaitingTime.value : undefined,
        distance: distance.status === 'fulfilled' ? distance.value : undefined,
        co2Emission: co2.status === 'fulfilled' ? co2.value : undefined,
        fuelConsumption: fuel.status === 'fulfilled' ? fuel.value : undefined,
        noiseEmission: noise.status === 'fulfilled' ? noise.value : undefined
      };
    } catch (error) {
      logger.warn(`Failed to get data for vehicle ${vehicleId}:`, error);
      return null;
    }
  }

  public async getAllVehiclesData(): Promise<RawVehicleData[]> {
    try {
      const vehicleIds = await this.getVehicleIds();
      const vehicleDataPromises = vehicleIds.map(id => this.getVehicleData(id));
      const vehicleDataResults = await Promise.allSettled(vehicleDataPromises);
      
      return vehicleDataResults
        .filter((result): result is PromiseFulfilledResult<RawVehicleData> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value);
    } catch (error) {
      logger.error('Failed to get all vehicles data:', error);
      return [];
    }
  }

  public async getTrafficLightIds(): Promise<string[]> {
    const response = await this.sendCommand(
      TraCICommands.GET_TL_VARIABLE,
      this.buildGetCommand(VariableIDs.VAR_TL_RED_YELLOW_GREEN_STATE, '')
    );
    
    return this.parseStringList(response.data);
  }

  public async getTrafficLightData(tlsId: string): Promise<RawIntersectionData | null> {
    try {
      const [state, phase, nextSwitch, program] = await Promise.all([
        this.getTrafficLightState(tlsId),
        this.getTrafficLightCurrentPhase(tlsId),
        this.getTrafficLightNextSwitch(tlsId),
        this.getTrafficLightProgram(tlsId)
      ]);

      // Get position (this might not be directly available, using a placeholder)
      const position = { x: 0, y: 0 }; // TODO: Get actual TLS position

      return {
        id: tlsId,
        position,
        tlsStates: state,
        currentPhase: phase,
        nextSwitch: nextSwitch,
        programId: program
      };
    } catch (error) {
      logger.warn(`Failed to get data for traffic light ${tlsId}:`, error);
      return null;
    }
  }

  public async getAllTrafficLightsData(): Promise<RawIntersectionData[]> {
    try {
      const tlsIds = await this.getTrafficLightIds();
      const tlsDataPromises = tlsIds.map(id => this.getTrafficLightData(id));
      const tlsDataResults = await Promise.allSettled(tlsDataPromises);
      
      return tlsDataResults
        .filter((result): result is PromiseFulfilledResult<RawIntersectionData> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value);
    } catch (error) {
      logger.error('Failed to get all traffic lights data:', error);
      return [];
    }
  }

  public async getEdgeIds(): Promise<string[]> {
    const response = await this.sendCommand(
      TraCICommands.GET_EDGE_VARIABLE,
      this.buildGetCommand(VariableIDs.VAR_LAST_STEP_VEHICLE_NUMBER, '')
    );
    
    return this.parseStringList(response.data);
  }

  public async getEdgeData(edgeId: string): Promise<RawRoadData | null> {
    try {
      const [vehicleCount, meanSpeed, vehicleIds, occupancy, length] = await Promise.all([
        this.getEdgeVehicleNumber(edgeId),
        this.getEdgeMeanSpeed(edgeId),
        this.getEdgeVehicleIds(edgeId),
        this.getEdgeOccupancy(edgeId),
        this.getEdgeLength(edgeId)
      ]);

      // Get lane data for this edge
      const lanes = await this.getEdgeLanes(edgeId);

      return {
        id: edgeId,
        vehicleCount,
        meanSpeed,
        vehicleIds,
        occupancy,
        length,
        lanes
      };
    } catch (error) {
      logger.warn(`Failed to get data for edge ${edgeId}:`, error);
      return null;
    }
  }

  public async getAllEdgesData(): Promise<RawRoadData[]> {
    try {
      const edgeIds = await this.getEdgeIds();
      const edgeDataPromises = edgeIds.map(id => this.getEdgeData(id));
      const edgeDataResults = await Promise.allSettled(edgeDataPromises);
      
      return edgeDataResults
        .filter((result): result is PromiseFulfilledResult<RawRoadData> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value);
    } catch (error) {
      logger.error('Failed to get all edges data:', error);
      return [];
    }
  }

  public async simulationStep(): Promise<void> {
    await this.sendCommand(TraCICommands.SIMULATION_STEP, Buffer.alloc(0));
  }

  // Private helper methods
  private async initializeConnection(): Promise<void> {
    try {
      // Get SUMO version
      const versionResponse = await this.sendCommand(TraCICommands.GET_VERSION, Buffer.alloc(0));
      logger.info('SUMO version:', versionResponse.description);
    } catch (error) {
      logger.error('Failed to initialize TraCI connection:', error);
      throw error;
    }
  }

  private async sendCommand(commandId: number, data: Buffer): Promise<TraCIResponse> {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.connected) {
        reject(new Error('Not connected to SUMO'));
        return;
      }

      const messageId = ++this.commandCounter;
      
      // Build message: length (4 bytes) + command (1 byte) + data
      const messageLength = 1 + data.length;
      const lengthBuffer = Buffer.allocUnsafe(4);
      lengthBuffer.writeUInt32BE(messageLength, 0);
      
      const commandBuffer = Buffer.allocUnsafe(1);
      commandBuffer.writeUInt8(commandId, 0);
      
      const message = Buffer.concat([lengthBuffer, commandBuffer, data]);
      
      // Store callback for response
      this.pendingResponses.set(messageId, resolve);
      
      // Set timeout for this command
      const timeout = setTimeout(() => {
        this.pendingResponses.delete(messageId);
        reject(new Error(`Command ${commandId} timeout`));
      }, 5000);
      
      // Send message
      this.socket.write(message, (error) => {
        if (error) {
          clearTimeout(timeout);
          this.pendingResponses.delete(messageId);
          reject(error);
        }
      });
    });
  }

  private handleIncomingData(data: Buffer): void {
    this.messageBuffer = Buffer.concat([this.messageBuffer, data]);
    
    while (this.messageBuffer.length >= 4) {
      // Read message length
      const messageLength = this.messageBuffer.readUInt32BE(0);
      
      if (this.messageBuffer.length < 4 + messageLength) {
        // Wait for complete message
        break;
      }
      
      // Extract complete message
      const messageData = this.messageBuffer.subarray(4, 4 + messageLength);
      this.messageBuffer = this.messageBuffer.subarray(4 + messageLength);
      
      // Process message
      this.processMessage(messageData);
    }
  }

  private processMessage(data: Buffer): void {
    if (data.length < 2) {
      logger.warn('Received incomplete message');
      return;
    }
    
    const commandId = data.readUInt8(0);
    const result = data.readUInt8(1);
    const description = data.length > 2 ? data.subarray(2).toString() : '';
    
    const response: TraCIResponse = {
      commandId,
      result,
      description,
      data: data.length > 2 ? data.subarray(2) : undefined
    };
    
    // Find and call pending callback
    const firstKey = this.pendingResponses.keys().next().value;
    if (firstKey !== undefined) {
      const callback = this.pendingResponses.get(firstKey);
      if (callback) {
        this.pendingResponses.delete(firstKey);
        callback(response);
      }
    }
  }

  private buildGetCommand(variableId: number, objectId: string): Buffer {
    const objectIdBuffer = Buffer.from(objectId, 'utf8');
    const buffer = Buffer.allocUnsafe(1 + 4 + objectIdBuffer.length);
    
    buffer.writeUInt8(variableId, 0);
    buffer.writeUInt32BE(objectIdBuffer.length, 1);
    objectIdBuffer.copy(buffer, 5);
    
    return buffer;
  }

  private parseStringList(data: Buffer): string[] {
    if (!data || data.length < 4) return [];
    
    const count = data.readUInt32BE(0);
    const strings: string[] = [];
    let offset = 4;
    
    for (let i = 0; i < count && offset < data.length; i++) {
      if (offset + 4 > data.length) break;
      
      const stringLength = data.readUInt32BE(offset);
      offset += 4;
      
      if (offset + stringLength > data.length) break;
      
      const string = data.subarray(offset, offset + stringLength).toString('utf8');
      strings.push(string);
      offset += stringLength;
    }
    
    return strings;
  }

  // Vehicle-specific methods
  private async getVehiclePosition(vehicleId: string): Promise<{ x: number; y: number }> {
    const response = await this.sendCommand(
      TraCICommands.GET_VEHICLE_VARIABLE,
      this.buildGetCommand(VariableIDs.VAR_POSITION, vehicleId)
    );
    
    // Parse position data (assuming 2D coordinates)
    const x = response.data?.readDoubleLE(0) || 0;
    const y = response.data?.readDoubleLE(8) || 0;
    
    return { x, y };
  }

  private async getVehicleSpeed(vehicleId: string): Promise<number> {
    const response = await this.sendCommand(
      TraCICommands.GET_VEHICLE_VARIABLE,
      this.buildGetCommand(VariableIDs.VAR_SPEED, vehicleId)
    );
    
    return response.data?.readDoubleLE(0) || 0;
  }

  private async getVehicleAngle(vehicleId: string): Promise<number> {
    const response = await this.sendCommand(
      TraCICommands.GET_VEHICLE_VARIABLE,
      this.buildGetCommand(VariableIDs.VAR_ANGLE, vehicleId)
    );
    
    return response.data?.readDoubleLE(0) || 0;
  }

  private async getVehicleRoadId(vehicleId: string): Promise<string> {
    const response = await this.sendCommand(
      TraCICommands.GET_VEHICLE_VARIABLE,
      this.buildGetCommand(VariableIDs.VAR_ROAD_ID, vehicleId)
    );
    
    return response.description || '';
  }

  private async getVehicleLaneId(vehicleId: string): Promise<string> {
    const response = await this.sendCommand(
      TraCICommands.GET_VEHICLE_VARIABLE,
      this.buildGetCommand(VariableIDs.VAR_LANE_ID, vehicleId)
    );
    
    return response.description || '';
  }

  private async getVehicleType(vehicleId: string): Promise<string> {
    const response = await this.sendCommand(
      TraCICommands.GET_VEHICLE_VARIABLE,
      this.buildGetCommand(VariableIDs.VAR_TYPE, vehicleId)
    );
    
    return response.description || 'passenger';
  }

  private async getVehicleRoute(vehicleId: string): Promise<string[]> {
    const response = await this.sendCommand(
      TraCICommands.GET_VEHICLE_VARIABLE,
      this.buildGetCommand(VariableIDs.VAR_ROUTE, vehicleId)
    );
    
    return this.parseStringList(response.data || Buffer.alloc(0));
  }

  private async getVehicleWaitingTime(vehicleId: string): Promise<number> {
    const response = await this.sendCommand(
      TraCICommands.GET_VEHICLE_VARIABLE,
      this.buildGetCommand(VariableIDs.VAR_WAITING_TIME, vehicleId)
    );
    
    return response.data?.readDoubleLE(0) || 0;
  }

  private async getVehicleAccumulatedWaitingTime(vehicleId: string): Promise<number> {
    const response = await this.sendCommand(
      TraCICommands.GET_VEHICLE_VARIABLE,
      this.buildGetCommand(VariableIDs.VAR_ACCUMULATED_WAITING_TIME, vehicleId)
    );
    
    return response.data?.readDoubleLE(0) || 0;
  }

  private async getVehicleDistance(vehicleId: string): Promise<number> {
    const response = await this.sendCommand(
      TraCICommands.GET_VEHICLE_VARIABLE,
      this.buildGetCommand(VariableIDs.VAR_DISTANCE, vehicleId)
    );
    
    return response.data?.readDoubleLE(0) || 0;
  }

  private async getVehicleCO2Emission(vehicleId: string): Promise<number> {
    const response = await this.sendCommand(
      TraCICommands.GET_VEHICLE_VARIABLE,
      this.buildGetCommand(VariableIDs.VAR_CO2_EMISSION, vehicleId)
    );
    
    return response.data?.readDoubleLE(0) || 0;
  }

  private async getVehicleFuelConsumption(vehicleId: string): Promise<number> {
    const response = await this.sendCommand(
      TraCICommands.GET_VEHICLE_VARIABLE,
      this.buildGetCommand(VariableIDs.VAR_FUEL_CONSUMPTION, vehicleId)
    );
    
    return response.data?.readDoubleLE(0) || 0;
  }

  private async getVehicleNoiseEmission(vehicleId: string): Promise<number> {
    const response = await this.sendCommand(
      TraCICommands.GET_VEHICLE_VARIABLE,
      this.buildGetCommand(VariableIDs.VAR_NOISE_EMISSION, vehicleId)
    );
    
    return response.data?.readDoubleLE(0) || 0;
  }

  // Traffic light methods
  private async getTrafficLightState(tlsId: string): Promise<string> {
    const response = await this.sendCommand(
      TraCICommands.GET_TL_VARIABLE,
      this.buildGetCommand(VariableIDs.VAR_TL_RED_YELLOW_GREEN_STATE, tlsId)
    );
    
    return response.description || '';
  }

  private async getTrafficLightCurrentPhase(tlsId: string): Promise<number> {
    const response = await this.sendCommand(
      TraCICommands.GET_TL_VARIABLE,
      this.buildGetCommand(VariableIDs.VAR_TL_CURRENT_PHASE, tlsId)
    );
    
    return response.data?.readUInt32BE(0) || 0;
  }

  private async getTrafficLightNextSwitch(tlsId: string): Promise<number> {
    const response = await this.sendCommand(
      TraCICommands.GET_TL_VARIABLE,
      this.buildGetCommand(VariableIDs.VAR_TL_NEXT_SWITCH, tlsId)
    );
    
    return response.data?.readDoubleLE(0) || 0;
  }

  private async getTrafficLightProgram(tlsId: string): Promise<string> {
    const response = await this.sendCommand(
      TraCICommands.GET_TL_VARIABLE,
      this.buildGetCommand(VariableIDs.VAR_TL_CURRENT_PROGRAM, tlsId)
    );
    
    return response.description || '';
  }

  // Edge methods
  private async getEdgeVehicleNumber(edgeId: string): Promise<number> {
    const response = await this.sendCommand(
      TraCICommands.GET_EDGE_VARIABLE,
      this.buildGetCommand(VariableIDs.VAR_LAST_STEP_VEHICLE_NUMBER, edgeId)
    );
    
    return response.data?.readUInt32BE(0) || 0;
  }

  private async getEdgeMeanSpeed(edgeId: string): Promise<number> {
    const response = await this.sendCommand(
      TraCICommands.GET_EDGE_VARIABLE,
      this.buildGetCommand(VariableIDs.VAR_LAST_STEP_MEAN_SPEED, edgeId)
    );
    
    return response.data?.readDoubleLE(0) || 0;
  }

  private async getEdgeVehicleIds(edgeId: string): Promise<string[]> {
    const response = await this.sendCommand(
      TraCICommands.GET_EDGE_VARIABLE,
      this.buildGetCommand(VariableIDs.VAR_LAST_STEP_VEHICLE_IDS, edgeId)
    );
    
    return this.parseStringList(response.data || Buffer.alloc(0));
  }

  private async getEdgeOccupancy(edgeId: string): Promise<number> {
    const response = await this.sendCommand(
      TraCICommands.GET_EDGE_VARIABLE,
      this.buildGetCommand(VariableIDs.VAR_LAST_STEP_OCCUPANCY, edgeId)
    );
    
    return response.data?.readDoubleLE(0) || 0;
  }

  private async getEdgeLength(edgeId: string): Promise<number> {
    const response = await this.sendCommand(
      TraCICommands.GET_EDGE_VARIABLE,
      this.buildGetCommand(VariableIDs.VAR_LAST_STEP_LENGTH, edgeId)
    );
    
    return response.data?.readDoubleLE(0) || 0;
  }

  private async getEdgeLanes(edgeId: string): Promise<RawLaneData[]> {
    // This is a simplified implementation - in reality, you'd need to get lane IDs first
    // and then query each lane individually
    return [];
  }
}