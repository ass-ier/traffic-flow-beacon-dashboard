// Export all SUMO data types
export * from './SUMOData.js';

// Export all configuration types
export * from './Configuration.js';

// Re-export commonly used types for convenience
export type {
  VehicleData,
  IntersectionData,
  RoadData,
  EmergencyVehicleData,
  TrafficMetrics,
  SimulationUpdate,
  ConnectionStatus,
  Position,
  CongestionLevel
} from './SUMOData.js';

export type {
  AppConfig,
  SUMOConnectionConfig,
  PerformanceConfig,
  MapDisplayConfig,
  DataFilterConfig,
  AlertConfig
} from './Configuration.js';