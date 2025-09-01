import { z } from 'zod';

// Position and coordinate types
export const PositionSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  roadId: z.string().optional(),
  laneId: z.string().optional()
});

export const CoordinatesSchema = z.array(z.tuple([z.number(), z.number()]));

// Vehicle data types
export const VehicleTypeSchema = z.enum(['car', 'bus', 'truck', 'motorcycle', 'bicycle', 'emergency']);

export const VehicleDataSchema = z.object({
  id: z.string(),
  type: VehicleTypeSchema,
  position: PositionSchema,
  speed: z.number().min(0), // km/h
  acceleration: z.number(),
  angle: z.number().min(0).max(360), // degrees
  route: z.array(z.string()),
  timestamp: z.number(),
  // Additional SUMO-specific fields
  waitingTime: z.number().min(0).optional(),
  accumulatedWaitingTime: z.number().min(0).optional(),
  distance: z.number().min(0).optional(),
  co2Emission: z.number().min(0).optional(),
  fuelConsumption: z.number().min(0).optional(),
  noiseEmission: z.number().min(0).optional()
});

// Traffic light and intersection types
export const TrafficLightPhaseSchema = z.enum(['red', 'yellow', 'green', 'red-yellow', 'off']);
export const TrafficLightDirectionSchema = z.enum(['north-south', 'east-west', 'all', 'left-turn', 'right-turn']);
export const CongestionLevelSchema = z.enum(['low', 'medium', 'high', 'critical']);

export const TrafficLightSchema = z.object({
  phase: TrafficLightPhaseSchema,
  direction: TrafficLightDirectionSchema,
  remainingTime: z.number().min(0),
  nextPhase: z.string(),
  programId: z.string().optional(),
  phaseIndex: z.number().min(0).optional()
});

export const IntersectionDataSchema = z.object({
  id: z.string(),
  position: PositionSchema,
  trafficLights: z.array(TrafficLightSchema),
  queueLengths: z.record(z.string(), z.number().min(0)), // laneId -> queue length
  waitingTimes: z.record(z.string(), z.number().min(0)), // laneId -> waiting time
  congestionLevel: CongestionLevelSchema,
  timestamp: z.number(),
  // Additional intersection metrics
  throughput: z.number().min(0).optional(), // vehicles per hour
  averageWaitingTime: z.number().min(0).optional(),
  maxQueueLength: z.number().min(0).optional(),
  cycleTime: z.number().min(0).optional()
});

// Road and lane data types
export const LaneDataSchema = z.object({
  id: z.string(),
  vehicleCount: z.number().min(0),
  averageSpeed: z.number().min(0),
  density: z.number().min(0), // vehicles per km
  flow: z.number().min(0), // vehicles per hour
  occupancy: z.number().min(0).max(100), // percentage
  meanSpeed: z.number().min(0).optional(),
  harmonicMeanSpeed: z.number().min(0).optional(),
  length: z.number().min(0).optional()
});

export const IncidentTypeSchema = z.enum(['accident', 'construction', 'breakdown', 'weather', 'event']);
export const IncidentSeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);

export const IncidentDataSchema = z.object({
  id: z.string(),
  type: IncidentTypeSchema,
  severity: IncidentSeveritySchema,
  position: PositionSchema,
  description: z.string(),
  startTime: z.number(),
  estimatedEndTime: z.number().optional(),
  affectedLanes: z.array(z.string()),
  trafficImpact: CongestionLevelSchema
});

export const RoadDataSchema = z.object({
  id: z.string(),
  coordinates: CoordinatesSchema,
  lanes: z.array(LaneDataSchema),
  congestionLevel: CongestionLevelSchema,
  incidents: z.array(IncidentDataSchema),
  timestamp: z.number(),
  // Additional road metrics
  totalVehicleCount: z.number().min(0).optional(),
  averageSpeed: z.number().min(0).optional(),
  capacity: z.number().min(0).optional(),
  freeFlowSpeed: z.number().min(0).optional(),
  travelTime: z.number().min(0).optional()
});

// Emergency vehicle types
export const EmergencyTypeSchema = z.enum(['ambulance', 'police', 'fire', 'rescue']);
export const EmergencyPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const EmergencyStatusSchema = z.enum(['responding', 'on-scene', 'returning', 'available', 'out-of-service']);

export const DestinationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  description: z.string(),
  estimatedArrival: z.number().optional()
});

export const EmergencyVehicleDataSchema = VehicleDataSchema.extend({
  emergencyType: EmergencyTypeSchema,
  priority: EmergencyPrioritySchema,
  status: EmergencyStatusSchema,
  destination: DestinationSchema.optional(),
  eta: z.number().min(0).optional(), // seconds
  signalPriorityRequests: z.array(z.string()), // intersection IDs
  callSign: z.string().optional(),
  unit: z.string().optional(),
  agency: z.string().optional()
});

// Simulation update and metrics types
export const TrafficMetricsSchema = z.object({
  totalVehicles: z.number().min(0),
  averageSpeed: z.number().min(0),
  totalWaitingTime: z.number().min(0),
  totalTravelTime: z.number().min(0),
  totalDistance: z.number().min(0),
  fuelConsumption: z.number().min(0),
  co2Emissions: z.number().min(0),
  throughput: z.number().min(0),
  congestionIndex: z.number().min(0).max(1),
  timestamp: z.number()
});

export const SimulationUpdateSchema = z.object({
  timestamp: z.number(),
  simulationTime: z.number().optional(),
  vehicles: z.array(VehicleDataSchema).optional(),
  intersections: z.array(IntersectionDataSchema).optional(),
  roads: z.array(RoadDataSchema).optional(),
  emergencyVehicles: z.array(EmergencyVehicleDataSchema).optional(),
  metrics: TrafficMetricsSchema.optional()
});

// Connection and status types
export const ConnectionStatusSchema = z.object({
  connected: z.boolean(),
  lastUpdate: z.number(),
  latency: z.number().min(0),
  reconnectAttempts: z.number().min(0),
  error: z.string().optional(),
  sumoVersion: z.string().optional(),
  simulationStep: z.number().min(0).optional()
});

// Export TypeScript types
export type Position = z.infer<typeof PositionSchema>;
export type Coordinates = z.infer<typeof CoordinatesSchema>;
export type VehicleType = z.infer<typeof VehicleTypeSchema>;
export type VehicleData = z.infer<typeof VehicleDataSchema>;
export type TrafficLightPhase = z.infer<typeof TrafficLightPhaseSchema>;
export type TrafficLightDirection = z.infer<typeof TrafficLightDirectionSchema>;
export type CongestionLevel = z.infer<typeof CongestionLevelSchema>;
export type TrafficLight = z.infer<typeof TrafficLightSchema>;
export type IntersectionData = z.infer<typeof IntersectionDataSchema>;
export type LaneData = z.infer<typeof LaneDataSchema>;
export type IncidentType = z.infer<typeof IncidentTypeSchema>;
export type IncidentSeverity = z.infer<typeof IncidentSeveritySchema>;
export type IncidentData = z.infer<typeof IncidentDataSchema>;
export type RoadData = z.infer<typeof RoadDataSchema>;
export type EmergencyType = z.infer<typeof EmergencyTypeSchema>;
export type EmergencyPriority = z.infer<typeof EmergencyPrioritySchema>;
export type EmergencyStatus = z.infer<typeof EmergencyStatusSchema>;
export type Destination = z.infer<typeof DestinationSchema>;
export type EmergencyVehicleData = z.infer<typeof EmergencyVehicleDataSchema>;
export type TrafficMetrics = z.infer<typeof TrafficMetricsSchema>;
export type SimulationUpdate = z.infer<typeof SimulationUpdateSchema>;
export type ConnectionStatus = z.infer<typeof ConnectionStatusSchema>;