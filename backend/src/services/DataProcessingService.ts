import { TraCIClient, RawVehicleData, RawIntersectionData, RawRoadData } from './TraCIClient.js';
import { DataTransformers } from '../utils/DataTransformers.js';
import { DataValidator, ValidationResult } from '../utils/DataValidator.js';
import { Logger } from '../utils/Logger.js';
import {
  VehicleData,
  IntersectionData,
  RoadData,
  EmergencyVehicleData,
  TrafficMetrics,
  SimulationUpdate
} from '../types/SUMOData.js';
import { SUMOConnectionConfig, PerformanceConfig } from '../types/Configuration.js';

const logger = new Logger('DataProcessingService');

export interface ProcessingStats {
  vehiclesProcessed: number;
  vehiclesValid: number;
  intersectionsProcessed: number;
  intersectionsValid: number;
  roadsProcessed: number;
  roadsValid: number;
  processingTimeMs: number;
  errors: string[];
  warnings: string[];
}

export class DataProcessingService {
  private traciClient: TraCIClient;
  private config: SUMOConnectionConfig;
  private performanceConfig: PerformanceConfig;
  private lastProcessingStats: ProcessingStats | null = null;
  private emergencyVehicleTypes: Set<string> = new Set(['ambulance', 'police', 'fire', 'rescue', 'emergency']);

  constructor(
    traciClient: TraCIClient,
    config: SUMOConnectionConfig,
    performanceConfig: PerformanceConfig
  ) {
    this.traciClient = traciClient;
    this.config = config;
    this.performanceConfig = performanceConfig;
  }

  public async processSimulationData(): Promise<SimulationUpdate | null> {
    const startTime = Date.now();
    const stats: ProcessingStats = {
      vehiclesProcessed: 0,
      vehiclesValid: 0,
      intersectionsProcessed: 0,
      intersectionsValid: 0,
      roadsProcessed: 0,
      roadsValid: 0,
      processingTimeMs: 0,
      errors: [],
      warnings: []
    };

    try {
      if (!this.traciClient.isConnected()) {
        throw new Error('TraCI client is not connected');
      }

      const simulationUpdate: SimulationUpdate = {
        timestamp: Date.now()
      };

      // Process vehicles if enabled
      if (this.config.dataTypes.vehicles) {
        const vehicleResult = await this.processVehicles();
        if (vehicleResult.vehicles.length > 0) {
          simulationUpdate.vehicles = vehicleResult.vehicles;
        }
        if (vehicleResult.emergencyVehicles.length > 0) {
          simulationUpdate.emergencyVehicles = vehicleResult.emergencyVehicles;
        }
        stats.vehiclesProcessed = vehicleResult.stats.processed;
        stats.vehiclesValid = vehicleResult.stats.valid;
        stats.errors.push(...vehicleResult.stats.errors);
        stats.warnings.push(...vehicleResult.stats.warnings);
      }

      // Process intersections if enabled
      if (this.config.dataTypes.intersections) {
        const intersectionResult = await this.processIntersections();
        if (intersectionResult.intersections.length > 0) {
          simulationUpdate.intersections = intersectionResult.intersections;
        }
        stats.intersectionsProcessed = intersectionResult.stats.processed;
        stats.intersectionsValid = intersectionResult.stats.valid;
        stats.errors.push(...intersectionResult.stats.errors);
        stats.warnings.push(...intersectionResult.stats.warnings);
      }

      // Process roads if enabled
      if (this.config.dataTypes.roads) {
        const roadResult = await this.processRoads();
        if (roadResult.roads.length > 0) {
          simulationUpdate.roads = roadResult.roads;
        }
        stats.roadsProcessed = roadResult.stats.processed;
        stats.roadsValid = roadResult.stats.valid;
        stats.errors.push(...roadResult.stats.errors);
        stats.warnings.push(...roadResult.stats.warnings);
      }

      // Calculate traffic metrics
      if (simulationUpdate.vehicles || simulationUpdate.roads) {
        simulationUpdate.metrics = this.calculateTrafficMetrics(simulationUpdate);
      }

      stats.processingTimeMs = Date.now() - startTime;
      this.lastProcessingStats = stats;

      // Log processing summary
      logger.debug('Data processing completed:', {
        vehicles: stats.vehiclesValid,
        intersections: stats.intersectionsValid,
        roads: stats.roadsValid,
        processingTime: stats.processingTimeMs,
        errors: stats.errors.length,
        warnings: stats.warnings.length
      });

      if (stats.errors.length > 0) {
        logger.warn('Processing errors:', stats.errors);
      }

      return simulationUpdate;

    } catch (error) {
      stats.processingTimeMs = Date.now() - startTime;
      stats.errors.push(error instanceof Error ? error.message : 'Unknown processing error');
      this.lastProcessingStats = stats;
      
      logger.error('Failed to process simulation data:', error);
      return null;
    }
  }

  private async processVehicles(): Promise<{
    vehicles: VehicleData[];
    emergencyVehicles: EmergencyVehicleData[];
    stats: { processed: number; valid: number; errors: string[]; warnings: string[] };
  }> {
    const stats: { processed: number; valid: number; errors: string[]; warnings: string[] } = { processed: 0, valid: 0, errors: [], warnings: [] };
    const vehicles: VehicleData[] = [];
    const emergencyVehicles: EmergencyVehicleData[] = [];

    try {
      // Get raw vehicle data from SUMO
      const rawVehicles = await this.traciClient.getAllVehiclesData();
      stats.processed = rawVehicles.length;

      // Apply performance limits
      const limitedVehicles = rawVehicles.slice(0, this.performanceConfig.maxVehiclesDisplayed);
      
      if (rawVehicles.length > this.performanceConfig.maxVehiclesDisplayed) {
        stats.warnings.push(
          `Vehicle count (${rawVehicles.length}) exceeds display limit (${this.performanceConfig.maxVehiclesDisplayed}). Showing first ${this.performanceConfig.maxVehiclesDisplayed} vehicles.`
        );
      }

      // Process each vehicle
      for (const rawVehicle of limitedVehicles) {
        try {
          // Check if this is an emergency vehicle
          const isEmergencyVehicle = this.isEmergencyVehicle(rawVehicle);

          if (isEmergencyVehicle && this.config.dataTypes.emergencyVehicles) {
            // Process as emergency vehicle
            const transformedVehicle = DataTransformers.transformEmergencyVehicleData(rawVehicle);
            if (transformedVehicle) {
              const validationResult = DataValidator.validateEmergencyVehicleData(transformedVehicle);
              if (validationResult.isValid && validationResult.data) {
                emergencyVehicles.push(validationResult.data);
                stats.valid++;
                if (validationResult.warnings) {
                  stats.warnings.push(...validationResult.warnings);
                }
              } else {
                stats.errors.push(`Emergency vehicle ${rawVehicle.id}: ${validationResult.errors?.join(', ')}`);
              }
            }
          } else {
            // Process as regular vehicle
            const transformedVehicle = DataTransformers.transformVehicleData(rawVehicle);
            if (transformedVehicle) {
              const validationResult = DataValidator.validateVehicleData(transformedVehicle);
              if (validationResult.isValid && validationResult.data) {
                vehicles.push(validationResult.data);
                stats.valid++;
                if (validationResult.warnings) {
                  stats.warnings.push(...validationResult.warnings);
                }
              } else {
                stats.errors.push(`Vehicle ${rawVehicle.id}: ${validationResult.errors?.join(', ')}`);
              }
            }
          }
        } catch (error) {
          stats.errors.push(`Vehicle ${rawVehicle.id}: ${error instanceof Error ? error.message : 'Processing error'}`);
        }
      }

      logger.debug(`Processed ${stats.processed} vehicles: ${vehicles.length} regular, ${emergencyVehicles.length} emergency`);

    } catch (error) {
      stats.errors.push(`Vehicle processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { vehicles, emergencyVehicles, stats };
  }

  private async processIntersections(): Promise<{
    intersections: IntersectionData[];
    stats: { processed: number; valid: number; errors: string[]; warnings: string[] };
  }> {
    const stats: { processed: number; valid: number; errors: string[]; warnings: string[] } = { processed: 0, valid: 0, errors: [], warnings: [] };
    const intersections: IntersectionData[] = [];

    try {
      // Get raw intersection data from SUMO
      const rawIntersections = await this.traciClient.getAllTrafficLightsData();
      stats.processed = rawIntersections.length;

      // Apply performance limits
      const limitedIntersections = rawIntersections.slice(0, this.performanceConfig.maxIntersectionsDisplayed);
      
      if (rawIntersections.length > this.performanceConfig.maxIntersectionsDisplayed) {
        stats.warnings.push(
          `Intersection count (${rawIntersections.length}) exceeds display limit (${this.performanceConfig.maxIntersectionsDisplayed}). Showing first ${this.performanceConfig.maxIntersectionsDisplayed} intersections.`
        );
      }

      // Process each intersection
      for (const rawIntersection of limitedIntersections) {
        try {
          const transformedIntersection = DataTransformers.transformIntersectionData(rawIntersection);
          if (transformedIntersection) {
            const validationResult = DataValidator.validateIntersectionData(transformedIntersection);
            if (validationResult.isValid && validationResult.data) {
              intersections.push(validationResult.data);
              stats.valid++;
              if (validationResult.warnings) {
                stats.warnings.push(...validationResult.warnings);
              }
            } else {
              stats.errors.push(`Intersection ${rawIntersection.id}: ${validationResult.errors?.join(', ')}`);
            }
          }
        } catch (error) {
          stats.errors.push(`Intersection ${rawIntersection.id}: ${error instanceof Error ? error.message : 'Processing error'}`);
        }
      }

      logger.debug(`Processed ${stats.processed} intersections: ${stats.valid} valid`);

    } catch (error) {
      stats.errors.push(`Intersection processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { intersections, stats };
  }

  private async processRoads(): Promise<{
    roads: RoadData[];
    stats: { processed: number; valid: number; errors: string[]; warnings: string[] };
  }> {
    const stats: { processed: number; valid: number; errors: string[]; warnings: string[] } = { processed: 0, valid: 0, errors: [], warnings: [] };
    const roads: RoadData[] = [];

    try {
      // Get raw road data from SUMO
      const rawRoads = await this.traciClient.getAllEdgesData();
      stats.processed = rawRoads.length;

      // Apply performance limits
      const limitedRoads = rawRoads.slice(0, this.performanceConfig.maxRoadsDisplayed);
      
      if (rawRoads.length > this.performanceConfig.maxRoadsDisplayed) {
        stats.warnings.push(
          `Road count (${rawRoads.length}) exceeds display limit (${this.performanceConfig.maxRoadsDisplayed}). Showing first ${this.performanceConfig.maxRoadsDisplayed} roads.`
        );
      }

      // Process each road
      for (const rawRoad of limitedRoads) {
        try {
          const transformedRoad = DataTransformers.transformRoadData(rawRoad);
          if (transformedRoad) {
            const validationResult = DataValidator.validateRoadData(transformedRoad);
            if (validationResult.isValid && validationResult.data) {
              roads.push(validationResult.data);
              stats.valid++;
              if (validationResult.warnings) {
                stats.warnings.push(...validationResult.warnings);
              }
            } else {
              stats.errors.push(`Road ${rawRoad.id}: ${validationResult.errors?.join(', ')}`);
            }
          }
        } catch (error) {
          stats.errors.push(`Road ${rawRoad.id}: ${error instanceof Error ? error.message : 'Processing error'}`);
        }
      }

      logger.debug(`Processed ${stats.processed} roads: ${stats.valid} valid`);

    } catch (error) {
      stats.errors.push(`Road processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return { roads, stats };
  }

  private calculateTrafficMetrics(simulationUpdate: SimulationUpdate): TrafficMetrics {
    const vehicles = simulationUpdate.vehicles || [];
    const emergencyVehicles = simulationUpdate.emergencyVehicles || [];
    const roads = simulationUpdate.roads || [];

    const totalVehicles = vehicles.length + emergencyVehicles.length;
    
    // Calculate average speed
    const allVehicles = [...vehicles, ...emergencyVehicles];
    const averageSpeed = totalVehicles > 0 
      ? allVehicles.reduce((sum, v) => sum + v.speed, 0) / totalVehicles 
      : 0;

    // Calculate total waiting time
    const totalWaitingTime = allVehicles.reduce((sum, v) => sum + (v.waitingTime || 0), 0);

    // Calculate total distance
    const totalDistance = allVehicles.reduce((sum, v) => sum + (v.distance || 0), 0);

    // Calculate emissions
    const fuelConsumption = allVehicles.reduce((sum, v) => sum + (v.fuelConsumption || 0), 0);
    const co2Emissions = allVehicles.reduce((sum, v) => sum + (v.co2Emission || 0), 0);

    // Calculate throughput from roads
    const throughput = roads.reduce((sum, road) => {
      return sum + road.lanes.reduce((laneSum, lane) => laneSum + lane.flow, 0);
    }, 0);

    // Calculate congestion index (simplified)
    const congestionIndex = this.calculateCongestionIndex(roads, averageSpeed);

    const metrics: TrafficMetrics = {
      totalVehicles,
      averageSpeed,
      totalWaitingTime,
      totalTravelTime: totalWaitingTime, // Simplified - in reality this would be different
      totalDistance,
      fuelConsumption,
      co2Emissions,
      throughput,
      congestionIndex,
      timestamp: Date.now()
    };

    // Validate metrics
    const validationResult = DataTransformers.transformTrafficMetrics(metrics);
    return validationResult || metrics;
  }

  private calculateCongestionIndex(roads: RoadData[], averageSpeed: number): number {
    if (roads.length === 0) return 0;

    // Calculate based on road congestion levels
    const congestionWeights = { low: 0.2, medium: 0.5, high: 0.8, critical: 1.0 };
    const totalCongestion = roads.reduce((sum, road) => {
      return sum + congestionWeights[road.congestionLevel];
    }, 0);

    const roadCongestionIndex = totalCongestion / roads.length;

    // Factor in average speed (assuming 50 km/h as free flow speed)
    const speedCongestionIndex = Math.max(0, 1 - (averageSpeed / 50));

    // Combine both factors
    return Math.min(1, (roadCongestionIndex + speedCongestionIndex) / 2);
  }

  private isEmergencyVehicle(rawVehicle: RawVehicleData): boolean {
    // Check vehicle type
    const vehicleType = rawVehicle.type?.toLowerCase() || '';
    if (this.emergencyVehicleTypes.has(vehicleType)) {
      return true;
    }

    // Check vehicle ID for emergency patterns
    const vehicleId = rawVehicle.id?.toLowerCase() || '';
    const emergencyPatterns = ['ambulance', 'police', 'fire', 'rescue', 'emergency', 'ems'];
    
    return emergencyPatterns.some(pattern => vehicleId.includes(pattern));
  }

  public getLastProcessingStats(): ProcessingStats | null {
    return this.lastProcessingStats;
  }

  public updateConfiguration(config: SUMOConnectionConfig, performanceConfig: PerformanceConfig): void {
    this.config = config;
    this.performanceConfig = performanceConfig;
    logger.info('Data processing configuration updated');
  }

  public async validateConnection(): Promise<boolean> {
    try {
      return this.traciClient.isConnected();
    } catch (error) {
      logger.error('Connection validation failed:', error);
      return false;
    }
  }

  public getProcessingCapabilities(): {
    maxVehicles: number;
    maxIntersections: number;
    maxRoads: number;
    enabledDataTypes: string[];
  } {
    const enabledTypes = [];
    if (this.config.dataTypes.vehicles) enabledTypes.push('vehicles');
    if (this.config.dataTypes.intersections) enabledTypes.push('intersections');
    if (this.config.dataTypes.roads) enabledTypes.push('roads');
    if (this.config.dataTypes.emergencyVehicles) enabledTypes.push('emergencyVehicles');

    return {
      maxVehicles: this.performanceConfig.maxVehiclesDisplayed,
      maxIntersections: this.performanceConfig.maxIntersectionsDisplayed,
      maxRoads: this.performanceConfig.maxRoadsDisplayed,
      enabledDataTypes: enabledTypes
    };
  }
}