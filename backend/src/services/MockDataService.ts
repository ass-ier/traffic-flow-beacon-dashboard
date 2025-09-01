import { Logger } from '../utils/Logger.js';
import { 
  VehicleData, 
  IntersectionData, 
  RoadData, 
  EmergencyVehicleData,
  SimulationUpdate 
} from '../types/SUMOData.js';

const logger = new Logger('MockDataService');

export class MockDataService {
  private vehicleIdCounter = 1;
  private vehicles: Map<string, VehicleData> = new Map();
  private intersections: IntersectionData[] = [];
  private roads: RoadData[] = [];
  private emergencyVehicles: Map<string, EmergencyVehicleData> = new Map();
  private simulationTime = 0;

  constructor() {
    this.initializeStaticData();
  }

  private initializeStaticData(): void {
    // Initialize intersections around Addis Ababa
    this.intersections = [
      {
        id: 'intersection_meskel_square',
        position: { lat: 9.0320, lng: 38.7469 },
        trafficLights: [{
          phase: 'green',
          direction: 'north-south',
          remainingTime: 25,
          nextPhase: 'yellow'
        }],
        queueLengths: { 'lane_ns_1': 5, 'lane_ew_1': 8 },
        waitingTimes: { 'lane_ns_1': 15, 'lane_ew_1': 22 },
        congestionLevel: 'medium',
        timestamp: Date.now()
      },
      {
        id: 'intersection_bole_road',
        position: { lat: 9.0180, lng: 38.7580 },
        trafficLights: [{
          phase: 'red',
          direction: 'east-west',
          remainingTime: 18,
          nextPhase: 'green'
        }],
        queueLengths: { 'lane_ns_2': 12, 'lane_ew_2': 3 },
        waitingTimes: { 'lane_ns_2': 35, 'lane_ew_2': 8 },
        congestionLevel: 'high',
        timestamp: Date.now()
      },
      {
        id: 'intersection_churchill_road',
        position: { lat: 9.0450, lng: 38.7380 },
        trafficLights: [{
          phase: 'yellow',
          direction: 'all',
          remainingTime: 3,
          nextPhase: 'red'
        }],
        queueLengths: { 'lane_ns_3': 2, 'lane_ew_3': 6 },
        waitingTimes: { 'lane_ns_3': 5, 'lane_ew_3': 18 },
        congestionLevel: 'low',
        timestamp: Date.now()
      }
    ];

    // Initialize roads
    this.roads = [
      {
        id: 'bole_road_main',
        coordinates: [[9.0180, 38.7580], [9.0320, 38.7469]],
        lanes: [
          {
            id: 'bole_road_lane_1',
            vehicleCount: 15,
            averageSpeed: 25,
            density: 45,
            flow: 850,
            occupancy: 65
          },
          {
            id: 'bole_road_lane_2',
            vehicleCount: 18,
            averageSpeed: 22,
            density: 52,
            flow: 920,
            occupancy: 72
          }
        ],
        congestionLevel: 'medium',
        incidents: [],
        timestamp: Date.now()
      },
      {
        id: 'churchill_avenue',
        coordinates: [[9.0450, 38.7380], [9.0320, 38.7469]],
        lanes: [
          {
            id: 'churchill_lane_1',
            vehicleCount: 8,
            averageSpeed: 35,
            density: 28,
            flow: 650,
            occupancy: 35
          },
          {
            id: 'churchill_lane_2',
            vehicleCount: 12,
            averageSpeed: 30,
            density: 38,
            flow: 720,
            occupancy: 42
          }
        ],
        congestionLevel: 'low',
        incidents: [],
        timestamp: Date.now()
      },
      {
        id: 'ring_road_segment',
        coordinates: [[9.0100, 38.7600], [9.0500, 38.7300]],
        lanes: [
          {
            id: 'ring_road_lane_1',
            vehicleCount: 25,
            averageSpeed: 15,
            density: 75,
            flow: 1200,
            occupancy: 85
          },
          {
            id: 'ring_road_lane_2',
            vehicleCount: 28,
            averageSpeed: 12,
            density: 82,
            flow: 1350,
            occupancy: 90
          }
        ],
        congestionLevel: 'high',
        incidents: [{
          id: 'incident_1',
          type: 'accident',
          position: { lat: 9.0300, lng: 38.7450 },
          severity: 'medium',
          description: 'Minor collision, one lane blocked',
          startTime: Date.now() - 300000, // 5 minutes ago
          affectedLanes: ['ring_road_lane_1'],
          trafficImpact: 'high'
        }],
        timestamp: Date.now()
      }
    ];
  }

  public getSimulationUpdate(): SimulationUpdate {
    this.simulationTime += 1;
    
    // Update dynamic data
    this.updateVehicles();
    this.updateIntersections();
    this.updateRoads();
    this.updateEmergencyVehicles();

    return {
      timestamp: Date.now(),
      vehicles: Array.from(this.vehicles.values()),
      intersections: this.intersections,
      roads: this.roads,
      emergencyVehicles: Array.from(this.emergencyVehicles.values())
    };
  }

  private updateVehicles(): void {
    // Add new vehicles randomly
    if (Math.random() < 0.3 && this.vehicles.size < 50) {
      this.addRandomVehicle();
    }

    // Update existing vehicles
    for (const [id, vehicle] of this.vehicles.entries()) {
      this.updateVehiclePosition(vehicle);
      
      // Remove vehicles that have "left" the simulation
      if (Math.random() < 0.02) {
        this.vehicles.delete(id);
      }
    }
  }

  private addRandomVehicle(): void {
    const vehicleTypes = ['car', 'bus', 'truck', 'motorcycle'] as const;
    const roadSegments = [
      { start: [9.0180, 38.7580], end: [9.0320, 38.7469], road: 'bole_road_main' },
      { start: [9.0450, 38.7380], end: [9.0320, 38.7469], road: 'churchill_avenue' },
      { start: [9.0100, 38.7600], end: [9.0500, 38.7300], road: 'ring_road_segment' }
    ];

    const segment = roadSegments[Math.floor(Math.random() * roadSegments.length)];
    const vehicleType = vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)];
    
    const vehicle: VehicleData = {
      id: `vehicle_${this.vehicleIdCounter++}`,
      type: vehicleType,
      position: {
        lat: segment.start[0] + Math.random() * 0.001,
        lng: segment.start[1] + Math.random() * 0.001,
        roadId: segment.road,
        laneId: `${segment.road}_lane_1`
      },
      speed: this.getRandomSpeed(vehicleType),
      acceleration: (Math.random() - 0.5) * 2,
      angle: Math.random() * 360,
      route: [segment.road],
      timestamp: Date.now(),
      waitingTime: Math.random() * 30,
      distance: Math.random() * 1000
    };

    this.vehicles.set(vehicle.id, vehicle);
  }

  private updateVehiclePosition(vehicle: VehicleData): void {
    // Simulate vehicle movement
    const speedVariation = (Math.random() - 0.5) * 10;
    vehicle.speed = Math.max(0, vehicle.speed + speedVariation);
    
    // Update position based on speed and direction
    const moveDistance = (vehicle.speed / 3600) * 0.001; // Rough conversion
    vehicle.position.lat += (Math.random() - 0.5) * moveDistance;
    vehicle.position.lng += (Math.random() - 0.5) * moveDistance;
    
    // Keep vehicles within Addis Ababa bounds
    vehicle.position.lat = Math.max(9.0000, Math.min(9.0600, vehicle.position.lat));
    vehicle.position.lng = Math.max(38.7000, Math.min(38.8000, vehicle.position.lng));
    
    // Update waiting time
    if (vehicle.speed < 5) {
      vehicle.waitingTime = (vehicle.waitingTime || 0) + 1;
    } else {
      vehicle.waitingTime = Math.max(0, (vehicle.waitingTime || 0) - 0.5);
    }
    
    vehicle.timestamp = Date.now();
  }

  private updateIntersections(): void {
    for (const intersection of this.intersections) {
      for (const light of intersection.trafficLights) {
        light.remainingTime = Math.max(0, light.remainingTime - 1);
        
        if (light.remainingTime <= 0) {
          // Switch to next phase
          switch (light.phase) {
            case 'green':
              light.phase = 'yellow';
              light.remainingTime = 5;
              light.nextPhase = 'red';
              break;
            case 'yellow':
              light.phase = 'red';
              light.remainingTime = 30;
              light.nextPhase = 'green';
              break;
            case 'red':
              light.phase = 'green';
              light.remainingTime = 25;
              light.nextPhase = 'yellow';
              break;
          }
        }
      }
      
      // Update queue lengths and waiting times
      for (const laneId in intersection.queueLengths) {
        intersection.queueLengths[laneId] += Math.floor((Math.random() - 0.5) * 3);
        intersection.queueLengths[laneId] = Math.max(0, intersection.queueLengths[laneId]);
        
        intersection.waitingTimes[laneId] += Math.floor((Math.random() - 0.3) * 5);
        intersection.waitingTimes[laneId] = Math.max(0, intersection.waitingTimes[laneId]);
      }
      
      intersection.timestamp = Date.now();
    }
  }

  private updateRoads(): void {
    for (const road of this.roads) {
      for (const lane of road.lanes) {
        // Update vehicle count
        lane.vehicleCount += Math.floor((Math.random() - 0.5) * 4);
        lane.vehicleCount = Math.max(0, Math.min(50, lane.vehicleCount));
        
        // Update average speed based on congestion
        const congestionFactor = lane.vehicleCount / 30;
        lane.averageSpeed = Math.max(5, 50 - (congestionFactor * 30));
        
        // Update density, flow, and occupancy
        lane.density = lane.vehicleCount * 2.5;
        lane.flow = lane.vehicleCount * lane.averageSpeed * 10;
        lane.occupancy = Math.min(100, lane.vehicleCount * 3.5);
      }
      
      // Update road congestion level
      const avgSpeed = road.lanes.reduce((sum, lane) => sum + lane.averageSpeed, 0) / road.lanes.length;
      if (avgSpeed < 15) {
        road.congestionLevel = 'high';
      } else if (avgSpeed < 30) {
        road.congestionLevel = 'medium';
      } else {
        road.congestionLevel = 'low';
      }
      
      road.timestamp = Date.now();
    }
  }

  private updateEmergencyVehicles(): void {
    // Randomly add emergency vehicles
    if (Math.random() < 0.05 && this.emergencyVehicles.size < 3) {
      this.addRandomEmergencyVehicle();
    }

    // Update existing emergency vehicles
    for (const [id, vehicle] of this.emergencyVehicles.entries()) {
      this.updateVehiclePosition(vehicle);
      
      // Remove emergency vehicles after some time
      if (Math.random() < 0.01) {
        this.emergencyVehicles.delete(id);
      }
    }
  }

  private addRandomEmergencyVehicle(): void {
    const emergencyTypes = ['ambulance', 'police', 'fire'] as const;
    const emergencyType = emergencyTypes[Math.floor(Math.random() * emergencyTypes.length)];
    
    const vehicle: EmergencyVehicleData = {
      id: `emergency_${this.vehicleIdCounter++}`,
      type: 'emergency',
      emergencyType,
      priority: 'high',
      status: 'responding',
      position: {
        lat: 9.0320 + (Math.random() - 0.5) * 0.02,
        lng: 38.7469 + (Math.random() - 0.5) * 0.02,
        roadId: 'bole_road_main',
        laneId: 'bole_road_lane_1'
      },
      speed: 60 + Math.random() * 20,
      acceleration: (Math.random() - 0.3) * 3,
      angle: Math.random() * 360,
      route: ['bole_road_main', 'churchill_avenue'],
      timestamp: Date.now(),
      destination: {
        lat: 9.0180 + Math.random() * 0.01,
        lng: 38.7580 + Math.random() * 0.01,
        description: `${emergencyType} incident location`
      },
      eta: Math.floor(Math.random() * 300) + 60, // 1-6 minutes
      signalPriorityRequests: ['intersection_meskel_square', 'intersection_bole_road']
    };

    this.emergencyVehicles.set(vehicle.id, vehicle);
  }

  private getRandomSpeed(vehicleType: string): number {
    const speedRanges = {
      car: [20, 60],
      bus: [15, 45],
      truck: [10, 40],
      motorcycle: [25, 70],
      bicycle: [5, 25]
    };
    
    const range = speedRanges[vehicleType as keyof typeof speedRanges] || [20, 50];
    return range[0] + Math.random() * (range[1] - range[0]);
  }

  public isConnected(): boolean {
    return true; // Mock service is always "connected"
  }

  public async connect(): Promise<void> {
    logger.info('Mock data service connected');
  }

  public async disconnect(): Promise<void> {
    logger.info('Mock data service disconnected');
  }
}