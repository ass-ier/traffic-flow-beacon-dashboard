import {
  VehicleData,
  IntersectionData,
  RoadData,
  EmergencyVehicleData,
  TrafficMetrics,
  Position,
  CongestionLevel,
  TrafficLightPhase,
  VehicleType,
  EmergencyType,
  EmergencyStatus,
  EmergencyPriority
} from '../types/SUMOData.js';
import { Logger } from './Logger.js';

const logger = new Logger('DataTransformers');

export class DataTransformers {
  
  /**
   * Transform raw SUMO vehicle data to VehicleData format
   */
  static transformVehicleData(rawVehicleData: any): VehicleData | null {
    try {
      // Extract position from SUMO coordinates (usually in meters, need to convert to lat/lng)
      const position: Position = {
        lat: this.convertYToLat(rawVehicleData.y || rawVehicleData.position?.y || 0),
        lng: this.convertXToLng(rawVehicleData.x || rawVehicleData.position?.x || 0),
        roadId: rawVehicleData.road || rawVehicleData.edge,
        laneId: rawVehicleData.lane
      };

      // Determine vehicle type from SUMO vType
      const vehicleType = this.mapSUMOVehicleType(rawVehicleData.type || rawVehicleData.vType);

      const vehicleData: VehicleData = {
        id: rawVehicleData.id || rawVehicleData.vehicleID,
        type: vehicleType,
        position,
        speed: this.convertMpsToKmh(rawVehicleData.speed || 0),
        acceleration: rawVehicleData.acceleration || 0,
        angle: rawVehicleData.angle || rawVehicleData.heading || 0,
        route: rawVehicleData.route || [],
        timestamp: Date.now(),
        waitingTime: rawVehicleData.waitingTime,
        accumulatedWaitingTime: rawVehicleData.accumulatedWaitingTime,
        distance: rawVehicleData.distance,
        co2Emission: rawVehicleData.co2Emission,
        fuelConsumption: rawVehicleData.fuelConsumption,
        noiseEmission: rawVehicleData.noiseEmission
      };

      return vehicleData;
    } catch (error) {
      logger.error('Failed to transform vehicle data:', error, rawVehicleData);
      return null;
    }
  }

  /**
   * Transform raw SUMO intersection data to IntersectionData format
   */
  static transformIntersectionData(rawIntersectionData: any): IntersectionData | null {
    try {
      const position: Position = {
        lat: this.convertYToLat(rawIntersectionData.y || rawIntersectionData.position?.y || 0),
        lng: this.convertXToLng(rawIntersectionData.x || rawIntersectionData.position?.x || 0)
      };

      // Transform traffic light states
      const trafficLights = this.transformTrafficLights(rawIntersectionData.tlsStates || rawIntersectionData.phases || []);

      // Calculate congestion level based on queue lengths
      const queueLengths = rawIntersectionData.queueLengths || {};
      const congestionLevel = this.calculateCongestionLevel(queueLengths);

      const intersectionData: IntersectionData = {
        id: rawIntersectionData.id || rawIntersectionData.tlsID,
        position,
        trafficLights,
        queueLengths,
        waitingTimes: rawIntersectionData.waitingTimes || {},
        congestionLevel,
        timestamp: Date.now(),
        throughput: rawIntersectionData.throughput,
        averageWaitingTime: rawIntersectionData.averageWaitingTime,
        maxQueueLength: Math.max(...Object.values(queueLengths).map(q => Number(q) || 0)),
        cycleTime: rawIntersectionData.cycleTime
      };

      return intersectionData;
    } catch (error) {
      logger.error('Failed to transform intersection data:', error, rawIntersectionData);
      return null;
    }
  }

  /**
   * Transform raw SUMO road/edge data to RoadData format
   */
  static transformRoadData(rawRoadData: any): RoadData | null {
    try {
      // Convert SUMO edge coordinates to lat/lng coordinates
      const coordinates = this.transformCoordinates(rawRoadData.shape || rawRoadData.coordinates || []);

      // Transform lane data
      const lanes = (rawRoadData.lanes || []).map((laneData: any) => ({
        id: laneData.id,
        vehicleCount: laneData.vehicleCount || 0,
        averageSpeed: this.convertMpsToKmh(laneData.meanSpeed || laneData.averageSpeed || 0),
        density: laneData.density || 0,
        flow: laneData.flow || 0,
        occupancy: laneData.occupancy || 0,
        meanSpeed: this.convertMpsToKmh(laneData.meanSpeed || 0),
        harmonicMeanSpeed: this.convertMpsToKmh(laneData.harmonicMeanSpeed || 0),
        length: laneData.length
      }));

      // Calculate overall congestion level
      const avgOccupancy = lanes.reduce((sum: number, lane: any) => sum + lane.occupancy, 0) / lanes.length || 0;
      const congestionLevel = this.calculateCongestionFromOccupancy(avgOccupancy);

      const roadData: RoadData = {
        id: rawRoadData.id || rawRoadData.edgeID,
        coordinates,
        lanes,
        congestionLevel,
        incidents: rawRoadData.incidents || [],
        timestamp: Date.now(),
        totalVehicleCount: lanes.reduce((sum: number, lane: any) => sum + lane.vehicleCount, 0),
        averageSpeed: lanes.reduce((sum: number, lane: any) => sum + lane.averageSpeed, 0) / lanes.length || 0,
        capacity: rawRoadData.capacity,
        freeFlowSpeed: this.convertMpsToKmh(rawRoadData.freeFlowSpeed || 0),
        travelTime: rawRoadData.travelTime
      };

      return roadData;
    } catch (error) {
      logger.error('Failed to transform road data:', error, rawRoadData);
      return null;
    }
  }

  /**
   * Transform raw SUMO emergency vehicle data to EmergencyVehicleData format
   */
  static transformEmergencyVehicleData(rawVehicleData: any): EmergencyVehicleData | null {
    try {
      // First transform as regular vehicle
      const baseVehicleData = this.transformVehicleData(rawVehicleData);
      if (!baseVehicleData) return null;

      // Determine emergency type from vehicle class or type
      const emergencyType = this.mapSUMOEmergencyType(rawVehicleData.vClass || rawVehicleData.type);
      const priority = this.mapSUMOEmergencyPriority(rawVehicleData.priority || rawVehicleData.emergencyPriority);
      const status = this.mapSUMOEmergencyStatus(rawVehicleData.status || rawVehicleData.emergencyStatus);

      const emergencyVehicleData: EmergencyVehicleData = {
        ...baseVehicleData,
        emergencyType,
        priority,
        status,
        destination: rawVehicleData.destination ? {
          lat: this.convertYToLat(rawVehicleData.destination.y),
          lng: this.convertXToLng(rawVehicleData.destination.x),
          description: rawVehicleData.destination.description || 'Emergency Destination',
          estimatedArrival: rawVehicleData.destination.eta
        } : undefined,
        eta: rawVehicleData.eta,
        signalPriorityRequests: rawVehicleData.signalRequests || [],
        callSign: rawVehicleData.callSign,
        unit: rawVehicleData.unit,
        agency: rawVehicleData.agency
      };

      return emergencyVehicleData;
    } catch (error) {
      logger.error('Failed to transform emergency vehicle data:', error, rawVehicleData);
      return null;
    }
  }

  /**
   * Transform raw SUMO simulation metrics to TrafficMetrics format
   */
  static transformTrafficMetrics(rawMetrics: any): TrafficMetrics | null {
    try {
      const metrics: TrafficMetrics = {
        totalVehicles: rawMetrics.vehicleCount || rawMetrics.totalVehicles || 0,
        averageSpeed: this.convertMpsToKmh(rawMetrics.meanSpeed || rawMetrics.averageSpeed || 0),
        totalWaitingTime: rawMetrics.totalWaitingTime || 0,
        totalTravelTime: rawMetrics.totalTravelTime || 0,
        totalDistance: rawMetrics.totalDistance || 0,
        fuelConsumption: rawMetrics.totalFuelConsumption || 0,
        co2Emissions: rawMetrics.totalCO2Emission || 0,
        throughput: rawMetrics.throughput || 0,
        congestionIndex: this.calculateCongestionIndex(rawMetrics),
        timestamp: Date.now()
      };

      return metrics;
    } catch (error) {
      logger.error('Failed to transform traffic metrics:', error, rawMetrics);
      return null;
    }
  }

  // Helper methods for coordinate conversion (these would need to be calibrated for your specific map)
  private static convertXToLng(x: number): number {
    // This is a placeholder - you'll need to implement proper coordinate transformation
    // based on your SUMO network's coordinate system and the real-world coordinates
    // For now, assuming a simple linear transformation around Addis Ababa
    const baseX = 0; // Base X coordinate in SUMO
    const baseLng = 38.7469; // Corresponding longitude
    const scale = 0.00001; // Scale factor (needs calibration)
    
    return baseLng + (x - baseX) * scale;
  }

  private static convertYToLat(y: number): number {
    // This is a placeholder - you'll need to implement proper coordinate transformation
    const baseY = 0; // Base Y coordinate in SUMO
    const baseLat = 9.0320; // Corresponding latitude
    const scale = 0.00001; // Scale factor (needs calibration)
    
    return baseLat + (y - baseY) * scale;
  }

  private static convertMpsToKmh(mps: number): number {
    return mps * 3.6;
  }

  private static mapSUMOVehicleType(sumoType: string): VehicleType {
    const typeMap: Record<string, VehicleType> = {
      'passenger': 'car',
      'bus': 'bus',
      'truck': 'truck',
      'motorcycle': 'motorcycle',
      'bicycle': 'bicycle',
      'emergency': 'emergency',
      'ambulance': 'emergency',
      'police': 'emergency',
      'fire': 'emergency'
    };

    return typeMap[sumoType?.toLowerCase()] || 'car';
  }

  private static mapSUMOEmergencyType(sumoClass: string): EmergencyType {
    const typeMap: Record<string, EmergencyType> = {
      'ambulance': 'ambulance',
      'police': 'police',
      'fire': 'fire',
      'rescue': 'rescue',
      'emergency': 'ambulance' // default
    };

    return typeMap[sumoClass?.toLowerCase()] || 'ambulance';
  }

  private static mapSUMOEmergencyPriority(sumoPriority: string | number): EmergencyPriority {
    if (typeof sumoPriority === 'number') {
      if (sumoPriority >= 8) return 'critical';
      if (sumoPriority >= 6) return 'high';
      if (sumoPriority >= 4) return 'medium';
      return 'low';
    }

    const priorityMap: Record<string, EmergencyPriority> = {
      'critical': 'critical',
      'high': 'high',
      'medium': 'medium',
      'low': 'low'
    };

    return priorityMap[sumoPriority?.toLowerCase()] || 'medium';
  }

  private static mapSUMOEmergencyStatus(sumoStatus: string): EmergencyStatus {
    const statusMap: Record<string, EmergencyStatus> = {
      'responding': 'responding',
      'on-scene': 'on-scene',
      'returning': 'returning',
      'available': 'available',
      'out-of-service': 'out-of-service'
    };

    return statusMap[sumoStatus?.toLowerCase()] || 'available';
  }

  private static transformTrafficLights(rawPhases: any[]): any[] {
    return rawPhases.map(phase => ({
      phase: this.mapSUMOTrafficLightPhase(phase.state || phase.phase),
      direction: phase.direction || 'all',
      remainingTime: phase.remainingTime || phase.duration || 0,
      nextPhase: phase.nextPhase || '',
      programId: phase.programId,
      phaseIndex: phase.index
    }));
  }

  private static mapSUMOTrafficLightPhase(sumoPhase: string): TrafficLightPhase {
    // SUMO uses single characters: r=red, y=yellow, g=green, G=green priority
    const char = sumoPhase?.charAt(0)?.toLowerCase();
    
    switch (char) {
      case 'r': return 'red';
      case 'y': return 'yellow';
      case 'g': return 'green';
      default: return 'red';
    }
  }

  private static calculateCongestionLevel(queueLengths: Record<string, number>): CongestionLevel {
    const maxQueue = Math.max(...Object.values(queueLengths).map(q => Number(q) || 0));
    
    if (maxQueue > 50) return 'critical';
    if (maxQueue > 25) return 'high';
    if (maxQueue > 10) return 'medium';
    return 'low';
  }

  private static calculateCongestionFromOccupancy(occupancy: number): CongestionLevel {
    if (occupancy > 80) return 'critical';
    if (occupancy > 60) return 'high';
    if (occupancy > 30) return 'medium';
    return 'low';
  }

  private static calculateCongestionIndex(rawMetrics: any): number {
    // Simple congestion index calculation based on speed and density
    const freeFlowSpeed = rawMetrics.freeFlowSpeed || 50; // km/h
    const currentSpeed = rawMetrics.meanSpeed || rawMetrics.averageSpeed || 0;
    
    return Math.max(0, Math.min(1, 1 - (currentSpeed / freeFlowSpeed)));
  }

  private static transformCoordinates(rawCoordinates: any[]): [number, number][] {
    return rawCoordinates.map(coord => [
      this.convertYToLat(coord.y || coord[1]),
      this.convertXToLng(coord.x || coord[0])
    ]);
  }
}