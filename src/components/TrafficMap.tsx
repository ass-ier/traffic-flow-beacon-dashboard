import { useEffect, useRef, useState } from "react";
import { MapContainer, useMap } from "react-leaflet";
import { MapLayers } from "./MapLayers";
import { IntersectionStatus } from "./IntersectionStatus";
import { SUMOConnectionStatus } from "./SUMOConnectionStatus";
import { useSUMOData } from "../hooks/useSUMOData";
import { sumoCommandService } from "../services/SUMOCommandService";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface TrafficMapProps {
  mapView: string;
  simulationState: string;
}

interface EmergencyVehicle {
  id: number;
  type: "ambulance" | "police" | "fire";
  lat: number;
  lng: number;
  speed: number;
  status: "responding" | "on-scene" | "returning";
  priority: "high" | "medium" | "low";
  destination?: string;
}

// Sample traffic data - this would come from your SUMO simulation
const sampleIntersections = [
  {
    id: 1,
    lat: 9.032,
    lng: 38.7469,
    queueLength: 12,
    phase: "green-ns",
    congestionLevel: "high",
  },
  {
    id: 2,
    lat: 9.035,
    lng: 38.75,
    queueLength: 8,
    phase: "green-ew",
    congestionLevel: "medium",
  },
  {
    id: 3,
    lat: 9.028,
    lng: 38.752,
    queueLength: 15,
    phase: "red",
    congestionLevel: "high",
  },
  {
    id: 4,
    lat: 9.038,
    lng: 38.745,
    queueLength: 5,
    phase: "green-ns",
    congestionLevel: "low",
  },
];

const sampleRoads = [
  {
    id: 1,
    coordinates: [
      [9.032, 38.7469],
      [9.035, 38.75],
    ] as [number, number][],
    congestionLevel: "high",
    vehicleCount: 25,
  },
  {
    id: 2,
    coordinates: [
      [9.035, 38.75],
      [9.028, 38.752],
    ] as [number, number][],
    congestionLevel: "medium",
    vehicleCount: 15,
  },
  {
    id: 3,
    coordinates: [
      [9.028, 38.752],
      [9.038, 38.745],
    ] as [number, number][],
    congestionLevel: "low",
    vehicleCount: 8,
  },
];

const sampleVehicles = [
  { id: 1, lat: 9.0325, lng: 38.7475, speed: 25, type: "car" },
  { id: 2, lat: 9.034, lng: 38.749, speed: 0, type: "bus" },
  { id: 3, lat: 9.031, lng: 38.7485, speed: 15, type: "truck" },
];

const sampleEmergencyVehicles: EmergencyVehicle[] = [
  {
    id: 1,
    type: "ambulance",
    lat: 9.033,
    lng: 38.748,
    speed: 45,
    status: "responding",
    priority: "high",
    destination: "Black Lion Hospital",
  },
  {
    id: 2,
    type: "police",
    lat: 9.036,
    lng: 38.751,
    speed: 35,
    status: "on-scene",
    priority: "medium",
    destination: "Traffic Incident - Meskel Square",
  },
];

// Map update component
function MapUpdater({ mapView }: { mapView: string }) {
  const map = useMap();

  useEffect(() => {
    // Force map to update when view changes
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [mapView, map]);

  return null;
}

export const TrafficMap = ({ mapView, simulationState }: TrafficMapProps) => {
  // Use real SUMO data instead of mock data
  const {
    vehicles: sumoVehicles,
    intersections: sumoIntersections,
    roads: sumoRoads,
    emergencyVehicles: sumoEmergencyVehicles,
    connection,
    loading,
    error,
  } = useSUMOData();
  const [selectedIntersection, setSelectedIntersection] = useState<any>(null);
  const [selectedEmergencyVehicle, setSelectedEmergencyVehicle] =
    useState<EmergencyVehicle | null>(null);

  // Debug: Log the received SUMO data
  console.log("SUMO Data Received:", {
    vehicles: sumoVehicles,
    intersections: sumoIntersections,
    roads: sumoRoads,
    emergencyVehicles: sumoEmergencyVehicles,
    connection: connection.isConnected,
  });

  // Convert SUMO data to the format expected by existing components
  const vehicles = sumoVehicles.map((vehicle) => ({
    id: parseInt(vehicle.id) || Math.random(),
    lat: vehicle.position.lat,
    lng: vehicle.position.lng,
    speed: vehicle.speed,
    type: vehicle.type,
  }));

  const intersections = sumoIntersections.map((intersection) => ({
    id: parseInt(intersection.id) || Math.random(),
    lat: intersection.position.lat,
    lng: intersection.position.lng,
    queueLength: Math.max(...Object.values(intersection.queueLengths || {}), 0),
    phase: intersection.trafficLights[0]?.phase || "red",
    congestionLevel: intersection.congestionLevel,
  }));

  const emergencyVehicles = sumoEmergencyVehicles.map((vehicle) => ({
    id: parseInt(vehicle.id) || Math.random(),
    type: vehicle.emergencyType,
    lat: vehicle.position.lat,
    lng: vehicle.position.lng,
    speed: vehicle.speed,
    status: vehicle.status,
    priority: vehicle.priority,
    destination: vehicle.destination?.description || "Unknown",
  }));

  // Use SUMO roads or fallback to sample data
  const roads = sumoRoads.length > 0 ? sumoRoads : sampleRoads;

  // Prefer SUMO data whenever connected; only use samples when disconnected
  const displayVehicles = connection.isConnected ? vehicles : sampleVehicles;
  const displayIntersections = connection.isConnected
    ? intersections
    : sampleIntersections;
  const displayEmergencyVehicles = connection.isConnected
    ? emergencyVehicles
    : sampleEmergencyVehicles;

  console.log("Display Data:", {
    displayVehicles,
    displayIntersections,
    displayEmergencyVehicles,
    connected: connection.isConnected,
  });

  const handleIntersectionSelect = (intersection: any) => {
    setSelectedIntersection(intersection);
  };

  const handleEmergencyVehicleSelect = (vehicle: EmergencyVehicle) => {
    setSelectedEmergencyVehicle(vehicle);
    console.log("Selected emergency vehicle:", vehicle);
  };

  const handleTrafficLightOverride = async (intersectionId: number) => {
    try {
      if (connection.isConnected) {
        await sumoCommandService.overrideTrafficLight(
          intersectionId.toString(),
          "green",
          30
        );
        console.log(
          `Traffic light ${intersectionId} overridden to green via SUMO`
        );
      } else {
        console.log(
          `Traffic light ${intersectionId} overridden to green (demo mode)`
        );
      }
    } catch (error) {
      console.error("Failed to override traffic light:", error);
    }
  };

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={[9.032, 38.7469]}
        zoom={15}
        className="h-full w-full"
        zoomControl={true}
        preferCanvas={true}
      >
        <MapUpdater mapView={mapView} />
        <MapLayers
          mapView={mapView}
          sampleRoads={roads}
          intersections={displayIntersections}
          vehicles={displayVehicles}
          emergencyVehicles={displayEmergencyVehicles}
          onIntersectionSelect={handleIntersectionSelect}
          onEmergencyVehicleSelect={handleEmergencyVehicleSelect}
          onTrafficLightOverride={handleTrafficLightOverride}
        />
      </MapContainer>

      {/* Intersection Status Panel */}
      <IntersectionStatus
        intersection={selectedIntersection}
        onClose={() => setSelectedIntersection(null)}
        onOverrideToGreen={handleTrafficLightOverride}
      />

      {/* SUMO Connection Status */}
      <div className="absolute bottom-4 left-4 w-64 z-[1000]">
        <SUMOConnectionStatus />
      </div>

      {/* Emergency Vehicles Panel - Removed */}

      {/* Map Legend */}
      <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg text-sm z-[1000]">
        {/* Connection Status Indicator */}
        <div className="flex items-center space-x-2 mb-2 pb-2 border-b">
          <div
            className={`w-2 h-2 rounded-full ${
              connection.isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          ></div>
          <span className="text-xs">
            {connection.isConnected ? "SUMO Connected" : "Using Sample Data"}
          </span>
        </div>
        <h4 className="font-semibold mb-2 capitalize">{mapView} View</h4>
        {mapView === "congestion" && (
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-2 bg-green-500"></div>
              <span>Low Traffic</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-2 bg-yellow-500"></div>
              <span>Medium Traffic</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-2 bg-red-500"></div>
              <span>High Traffic</span>
            </div>
          </div>
        )}
        {mapView === "traffic-lights" && (
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span>Green Light</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span>Yellow Light</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span>Red Light</span>
            </div>
          </div>
        )}
        <div className="mt-3 pt-2 border-t space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-600 rounded-full"></div>
            <span>🚑 Ambulance</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-orange-600 rounded-full"></div>
            <span>🚒 Fire Department</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
            <span>🚔 Police</span>
          </div>
        </div>
      </div>
    </div>
  );
};
