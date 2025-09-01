import { z } from 'zod';

// SUMO Connection Configuration
export const SUMOConnectionConfigSchema = z.object({
  host: z.string().min(1, 'SUMO host is required'),
  port: z.number().int().min(1).max(65535, 'Invalid port number'),
  updateInterval: z.number().int().min(100, 'Update interval must be at least 100ms'),
  reconnectInterval: z.number().int().min(1000, 'Reconnect interval must be at least 1000ms'),
  maxReconnectAttempts: z.number().int().min(1, 'Max reconnect attempts must be at least 1'),
  timeout: z.number().int().min(1000, 'Timeout must be at least 1000ms').optional(),
  dataTypes: z.object({
    vehicles: z.boolean(),
    intersections: z.boolean(),
    roads: z.boolean(),
    emergencyVehicles: z.boolean()
  })
});

// Performance Configuration
export const PerformanceConfigSchema = z.object({
  maxVehiclesDisplayed: z.number().int().min(1, 'Max vehicles must be at least 1'),
  maxIntersectionsDisplayed: z.number().int().min(1, 'Max intersections must be at least 1'),
  maxRoadsDisplayed: z.number().int().min(1, 'Max roads must be at least 1'),
  updateThrottleMs: z.number().int().min(50, 'Update throttle must be at least 50ms'),
  dataRetentionHours: z.number().int().min(1, 'Data retention must be at least 1 hour'),
  enableHistoricalData: z.boolean(),
  enableDataCompression: z.boolean(),
  maxHistoryPoints: z.number().int().min(100, 'Max history points must be at least 100'),
  memoryLimitMB: z.number().int().min(100, 'Memory limit must be at least 100MB')
});

// Map Display Configuration
export const MapDisplayConfigSchema = z.object({
  defaultCenter: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }),
  defaultZoom: z.number().int().min(1).max(20),
  minZoom: z.number().int().min(1).max(20),
  maxZoom: z.number().int().min(1).max(20),
  enableClustering: z.boolean(),
  clusterRadius: z.number().int().min(10).max(200),
  animationDuration: z.number().int().min(0).max(5000),
  showVehicleTrails: z.boolean(),
  trailLength: z.number().int().min(2).max(50),
  refreshRate: z.number().int().min(100).max(10000)
});

// Data Filtering Configuration
export const DataFilterConfigSchema = z.object({
  vehicleTypes: z.object({
    cars: z.boolean(),
    buses: z.boolean(),
    trucks: z.boolean(),
    motorcycles: z.boolean(),
    bicycles: z.boolean(),
    emergency: z.boolean()
  }),
  speedFilters: z.object({
    minSpeed: z.number().min(0),
    maxSpeed: z.number().min(0),
    showStoppedVehicles: z.boolean()
  }),
  congestionFilters: z.object({
    showLowCongestion: z.boolean(),
    showMediumCongestion: z.boolean(),
    showHighCongestion: z.boolean(),
    showCriticalCongestion: z.boolean()
  }),
  timeFilters: z.object({
    enableTimeRange: z.boolean(),
    startTime: z.string().optional(),
    endTime: z.string().optional()
  })
});

// Alert and Notification Configuration
export const AlertConfigSchema = z.object({
  enableAlerts: z.boolean(),
  congestionThreshold: z.number().min(0).max(1),
  speedThreshold: z.number().min(0),
  queueLengthThreshold: z.number().int().min(1),
  waitingTimeThreshold: z.number().int().min(1),
  emergencyVehicleAlerts: z.boolean(),
  incidentAlerts: z.boolean(),
  soundAlerts: z.boolean(),
  emailNotifications: z.boolean(),
  alertRetentionHours: z.number().int().min(1)
});

// Server Configuration
export const ServerConfigSchema = z.object({
  port: z.number().int().min(1).max(65535),
  host: z.string().optional(),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']),
  enableCors: z.boolean(),
  corsOrigins: z.array(z.string()),
  enableCompression: z.boolean(),
  requestTimeout: z.number().int().min(1000),
  maxRequestSize: z.string(),
  enableRateLimit: z.boolean(),
  rateLimitWindow: z.number().int().min(1000),
  rateLimitMax: z.number().int().min(1)
});

// WebSocket Configuration
export const WebSocketConfigSchema = z.object({
  port: z.number().int().min(1).max(65535).optional(),
  path: z.string(),
  pingInterval: z.number().int().min(1000),
  pongTimeout: z.number().int().min(1000),
  maxConnections: z.number().int().min(1),
  enableCompression: z.boolean(),
  maxMessageSize: z.number().int().min(1024)
});

// Complete Application Configuration
export const AppConfigSchema = z.object({
  sumo: SUMOConnectionConfigSchema,
  performance: PerformanceConfigSchema,
  mapDisplay: MapDisplayConfigSchema,
  dataFilters: DataFilterConfigSchema,
  alerts: AlertConfigSchema,
  server: ServerConfigSchema,
  websocket: WebSocketConfigSchema
});

// Export TypeScript types
export type SUMOConnectionConfig = z.infer<typeof SUMOConnectionConfigSchema>;
export type PerformanceConfig = z.infer<typeof PerformanceConfigSchema>;
export type MapDisplayConfig = z.infer<typeof MapDisplayConfigSchema>;
export type DataFilterConfig = z.infer<typeof DataFilterConfigSchema>;
export type AlertConfig = z.infer<typeof AlertConfigSchema>;
export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type WebSocketConfig = z.infer<typeof WebSocketConfigSchema>;
export type AppConfig = z.infer<typeof AppConfigSchema>;

// Configuration update types
export type SUMOConnectionConfigUpdate = Partial<SUMOConnectionConfig>;
export type PerformanceConfigUpdate = Partial<PerformanceConfig>;
export type MapDisplayConfigUpdate = Partial<MapDisplayConfig>;
export type DataFilterConfigUpdate = Partial<DataFilterConfig>;
export type AlertConfigUpdate = Partial<AlertConfig>;
export type AppConfigUpdate = Partial<AppConfig>;

// Configuration validation result
export interface ConfigValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
}

// Default configurations
export const DEFAULT_SUMO_CONFIG: SUMOConnectionConfig = {
  host: 'localhost',
  port: 8813,
  updateInterval: 1000,
  reconnectInterval: 5000,
  maxReconnectAttempts: 10,
  timeout: 10000,
  dataTypes: {
    vehicles: true,
    intersections: true,
    roads: true,
    emergencyVehicles: true
  }
};

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  maxVehiclesDisplayed: 1000,
  maxIntersectionsDisplayed: 100,
  maxRoadsDisplayed: 500,
  updateThrottleMs: 100,
  dataRetentionHours: 24,
  enableHistoricalData: true,
  enableDataCompression: true,
  maxHistoryPoints: 1000,
  memoryLimitMB: 512
};

export const DEFAULT_MAP_DISPLAY_CONFIG: MapDisplayConfig = {
  defaultCenter: {
    lat: 9.0320,
    lng: 38.7469
  },
  defaultZoom: 15,
  minZoom: 10,
  maxZoom: 20,
  enableClustering: true,
  clusterRadius: 50,
  animationDuration: 1000,
  showVehicleTrails: false,
  trailLength: 10,
  refreshRate: 1000
};

export const DEFAULT_DATA_FILTER_CONFIG: DataFilterConfig = {
  vehicleTypes: {
    cars: true,
    buses: true,
    trucks: true,
    motorcycles: true,
    bicycles: true,
    emergency: true
  },
  speedFilters: {
    minSpeed: 0,
    maxSpeed: 200,
    showStoppedVehicles: true
  },
  congestionFilters: {
    showLowCongestion: true,
    showMediumCongestion: true,
    showHighCongestion: true,
    showCriticalCongestion: true
  },
  timeFilters: {
    enableTimeRange: false
  }
};

export const DEFAULT_ALERT_CONFIG: AlertConfig = {
  enableAlerts: true,
  congestionThreshold: 0.8,
  speedThreshold: 5,
  queueLengthThreshold: 20,
  waitingTimeThreshold: 120,
  emergencyVehicleAlerts: true,
  incidentAlerts: true,
  soundAlerts: false,
  emailNotifications: false,
  alertRetentionHours: 48
};

export const DEFAULT_SERVER_CONFIG: ServerConfig = {
  port: 3001,
  logLevel: 'info',
  enableCors: true,
  corsOrigins: ['http://localhost:5173', 'http://localhost:3000'],
  enableCompression: true,
  requestTimeout: 30000,
  maxRequestSize: '10mb',
  enableRateLimit: true,
  rateLimitWindow: 60000,
  rateLimitMax: 100
};

export const DEFAULT_WEBSOCKET_CONFIG: WebSocketConfig = {
  path: '/ws',
  pingInterval: 30000,
  pongTimeout: 5000,
  maxConnections: 100,
  enableCompression: true,
  maxMessageSize: 1048576 // 1MB
};