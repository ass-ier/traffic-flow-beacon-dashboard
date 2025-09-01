import { z } from 'zod';
import {
  VehicleDataSchema,
  IntersectionDataSchema,
  RoadDataSchema,
  EmergencyVehicleDataSchema,
  TrafficMetricsSchema,
  SimulationUpdateSchema,
  VehicleData,
  IntersectionData,
  RoadData,
  EmergencyVehicleData,
  TrafficMetrics,
  SimulationUpdate
} from '../types/SUMOData.js';
import { Logger } from './Logger.js';

const logger = new Logger('DataValidator');

export interface ValidationResult<T = any> {
  isValid: boolean;
  data?: T;
  errors?: string[];
  warnings?: string[];
}

export class DataValidator {
  
  /**
   * Validate vehicle data
   */
  static validateVehicleData(data: unknown): ValidationResult<VehicleData> {
    try {
      const validatedData = VehicleDataSchema.parse(data);
      const warnings = this.checkVehicleDataWarnings(validatedData);
      
      return {
        isValid: true,
        data: validatedData,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return this.handleValidationError('vehicle', error, data);
    }
  }

  /**
   * Validate intersection data
   */
  static validateIntersectionData(data: unknown): ValidationResult<IntersectionData> {
    try {
      const validatedData = IntersectionDataSchema.parse(data);
      const warnings = this.checkIntersectionDataWarnings(validatedData);
      
      return {
        isValid: true,
        data: validatedData,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return this.handleValidationError('intersection', error, data);
    }
  }

  /**
   * Validate road data
   */
  static validateRoadData(data: unknown): ValidationResult<RoadData> {
    try {
      const validatedData = RoadDataSchema.parse(data);
      const warnings = this.checkRoadDataWarnings(validatedData);
      
      return {
        isValid: true,
        data: validatedData,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return this.handleValidationError('road', error, data);
    }
  }

  /**
   * Validate emergency vehicle data
   */
  static validateEmergencyVehicleData(data: unknown): ValidationResult<EmergencyVehicleData> {
    try {
      const validatedData = EmergencyVehicleDataSchema.parse(data);
      const warnings = this.checkEmergencyVehicleDataWarnings(validatedData);
      
      return {
        isValid: true,
        data: validatedData,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return this.handleValidationError('emergency vehicle', error, data);
    }
  }

  /**
   * Validate traffic metrics
   */
  static validateTrafficMetrics(data: unknown): ValidationResult<TrafficMetrics> {
    try {
      const validatedData = TrafficMetricsSchema.parse(data);
      const warnings = this.checkTrafficMetricsWarnings(validatedData);
      
      return {
        isValid: true,
        data: validatedData,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return this.handleValidationError('traffic metrics', error, data);
    }
  }

  /**
   * Validate simulation update
   */
  static validateSimulationUpdate(data: unknown): ValidationResult<SimulationUpdate> {
    try {
      const validatedData = SimulationUpdateSchema.parse(data);
      const warnings = this.checkSimulationUpdateWarnings(validatedData);
      
      return {
        isValid: true,
        data: validatedData,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    } catch (error) {
      return this.handleValidationError('simulation update', error, data);
    }
  }

  /**
   * Validate array of vehicle data
   */
  static validateVehicleDataArray(dataArray: unknown[]): ValidationResult<VehicleData[]> {
    const validVehicles: VehicleData[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    dataArray.forEach((item, index) => {
      const result = this.validateVehicleData(item);
      if (result.isValid && result.data) {
        validVehicles.push(result.data);
        if (result.warnings) {
          warnings.push(...result.warnings.map(w => `Vehicle ${index}: ${w}`));
        }
      } else if (result.errors) {
        errors.push(...result.errors.map(e => `Vehicle ${index}: ${e}`));
      }
    });

    return {
      isValid: validVehicles.length > 0,
      data: validVehicles,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Validate array of intersection data
   */
  static validateIntersectionDataArray(dataArray: unknown[]): ValidationResult<IntersectionData[]> {
    const validIntersections: IntersectionData[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    dataArray.forEach((item, index) => {
      const result = this.validateIntersectionData(item);
      if (result.isValid && result.data) {
        validIntersections.push(result.data);
        if (result.warnings) {
          warnings.push(...result.warnings.map(w => `Intersection ${index}: ${w}`));
        }
      } else if (result.errors) {
        errors.push(...result.errors.map(e => `Intersection ${index}: ${e}`));
      }
    });

    return {
      isValid: validIntersections.length > 0,
      data: validIntersections,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  // Warning check methods
  private static checkVehicleDataWarnings(data: VehicleData): string[] {
    const warnings: string[] = [];

    // Check for unrealistic speeds
    if (data.speed > 200) {
      warnings.push(`Unusually high speed: ${data.speed} km/h`);
    }

    // Check for very old timestamps
    const ageMinutes = (Date.now() - data.timestamp) / (1000 * 60);
    if (ageMinutes > 5) {
      warnings.push(`Data is ${ageMinutes.toFixed(1)} minutes old`);
    }

    // Check for invalid coordinates (outside reasonable bounds)
    if (Math.abs(data.position.lat) > 90 || Math.abs(data.position.lng) > 180) {
      warnings.push(`Coordinates may be invalid: ${data.position.lat}, ${data.position.lng}`);
    }

    // Check for negative acceleration that might indicate emergency braking
    if (data.acceleration < -5) {
      warnings.push(`High deceleration detected: ${data.acceleration} m/s²`);
    }

    return warnings;
  }

  private static checkIntersectionDataWarnings(data: IntersectionData): string[] {
    const warnings: string[] = [];

    // Check for extremely long queue lengths
    const maxQueue = Math.max(...Object.values(data.queueLengths));
    if (maxQueue > 100) {
      warnings.push(`Very long queue detected: ${maxQueue} vehicles`);
    }

    // Check for very long waiting times
    const maxWaitTime = Math.max(...Object.values(data.waitingTimes));
    if (maxWaitTime > 300) { // 5 minutes
      warnings.push(`Very long waiting time: ${maxWaitTime} seconds`);
    }

    // Check for missing traffic light data
    if (data.trafficLights.length === 0) {
      warnings.push('No traffic light data available');
    }

    return warnings;
  }

  private static checkRoadDataWarnings(data: RoadData): string[] {
    const warnings: string[] = [];

    // Check for roads with no lanes
    if (data.lanes.length === 0) {
      warnings.push('Road has no lane data');
    }

    // Check for unrealistic vehicle counts
    const totalVehicles = data.lanes.reduce((sum, lane) => sum + lane.vehicleCount, 0);
    if (totalVehicles > 1000) {
      warnings.push(`Very high vehicle count: ${totalVehicles}`);
    }

    // Check for very low speeds indicating severe congestion
    const avgSpeed = data.lanes.reduce((sum, lane) => sum + lane.averageSpeed, 0) / data.lanes.length;
    if (avgSpeed < 5 && totalVehicles > 0) {
      warnings.push(`Severe congestion detected: average speed ${avgSpeed.toFixed(1)} km/h`);
    }

    return warnings;
  }

  private static checkEmergencyVehicleDataWarnings(data: EmergencyVehicleData): string[] {
    const warnings: string[] = [];

    // Check for emergency vehicles moving too slowly
    if (data.status === 'responding' && data.speed < 20) {
      warnings.push(`Emergency vehicle responding at low speed: ${data.speed} km/h`);
    }

    // Check for missing destination when responding
    if (data.status === 'responding' && !data.destination) {
      warnings.push('Emergency vehicle responding without destination data');
    }

    // Check for very long ETA
    if (data.eta && data.eta > 3600) { // 1 hour
      warnings.push(`Very long ETA: ${Math.round(data.eta / 60)} minutes`);
    }

    return warnings;
  }

  private static checkTrafficMetricsWarnings(data: TrafficMetrics): string[] {
    const warnings: string[] = [];

    // Check for zero vehicles but positive metrics
    if (data.totalVehicles === 0 && (data.totalDistance > 0 || data.totalTravelTime > 0)) {
      warnings.push('Metrics show activity but no vehicles reported');
    }

    // Check for very high congestion index
    if (data.congestionIndex > 0.9) {
      warnings.push(`Very high congestion index: ${(data.congestionIndex * 100).toFixed(1)}%`);
    }

    return warnings;
  }

  private static checkSimulationUpdateWarnings(data: SimulationUpdate): string[] {
    const warnings: string[] = [];

    // Check if update contains no data
    const hasData = data.vehicles?.length || data.intersections?.length || 
                   data.roads?.length || data.emergencyVehicles?.length || data.metrics;
    
    if (!hasData) {
      warnings.push('Simulation update contains no data');
    }

    return warnings;
  }

  private static handleValidationError(dataType: string, error: unknown, originalData: unknown): ValidationResult {
    let errors: string[] = [];

    if (error instanceof z.ZodError) {
      errors = error.errors.map(err => {
        const path = err.path.length > 0 ? ` at ${err.path.join('.')}` : '';
        return `${err.message}${path}`;
      });
    } else {
      errors = [`Unknown validation error for ${dataType} data`];
    }

    logger.warn(`Validation failed for ${dataType} data:`, errors, originalData);

    return {
      isValid: false,
      errors
    };
  }

  /**
   * Sanitize data by removing invalid entries and logging issues
   */
  static sanitizeSimulationUpdate(data: SimulationUpdate): SimulationUpdate {
    const sanitized: SimulationUpdate = {
      timestamp: data.timestamp
    };

    // Sanitize vehicles
    if (data.vehicles) {
      const vehicleResult = this.validateVehicleDataArray(data.vehicles);
      if (vehicleResult.data && vehicleResult.data.length > 0) {
        sanitized.vehicles = vehicleResult.data;
      }
      if (vehicleResult.errors) {
        logger.warn('Vehicle data validation errors:', vehicleResult.errors);
      }
    }

    // Sanitize intersections
    if (data.intersections) {
      const intersectionResult = this.validateIntersectionDataArray(data.intersections);
      if (intersectionResult.data && intersectionResult.data.length > 0) {
        sanitized.intersections = intersectionResult.data;
      }
      if (intersectionResult.errors) {
        logger.warn('Intersection data validation errors:', intersectionResult.errors);
      }
    }

    // Add other data types as needed...

    return sanitized;
  }
}