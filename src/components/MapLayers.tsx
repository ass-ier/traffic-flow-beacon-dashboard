import { TileLayer, Circle, Polyline, Popup, Marker } from "react-leaflet";
import { divIcon } from "leaflet";
import { Plus, Flame, Shield } from "lucide-react";

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

interface MapLayersProps {
  mapView: string;
  sampleRoads: Array<{
    id: number;
    coordinates: [number, number][];
    congestionLevel: string;
    vehicleCount: number;
  }>;
  intersections: Array<{
    id: number;
    lat: number;
    lng: number;
    queueLength: number;
    phase: string;
    congestionLevel: string;
  }>;
  vehicles: Array<{
    id: number;
    lat: number;
    lng: number;
    speed: number;
    type: string;
  }>;
  emergencyVehicles: EmergencyVehicle[];
  onIntersectionSelect: (intersection: any) => void;
  onEmergencyVehicleSelect: (vehicle: EmergencyVehicle) => void;
  onTrafficLightOverride: (intersectionId: number) => void;
}

const getCongestionColor = (level: string) => {
  switch (level) {
    case "high":
      return "#dc2626";
    case "medium":
      return "#f59e0b";
    case "low":
      return "#10b981";
    default:
      return "#6b7280";
  }
};

const getTrafficLightColor = (phase: string) => {
  if (phase.includes("green")) return "#10b981";
  if (phase === "red") return "#dc2626";
  return "#f59e0b";
};

const getVehicleColor = (type: string) => {
  switch (type) {
    case "car":
      return "#3b82f6";
    case "bus":
      return "#f59e0b";
    case "truck":
      return "#8b5cf6";
    case "motorcycle":
      return "#10b981";
    case "bicycle":
      return "#06b6d4";
    case "emergency":
      return "#dc2626";
    default:
      return "#6b7280";
  }
};

const createEmergencyVehicleIcon = (type: string) => {
  const iconSvg =
    type === "ambulance"
      ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
         <circle cx="12" cy="12" r="10" fill="#dc2626" stroke="#fff" stroke-width="2"/>
         <path d="M12 6v12M6 12h12" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
       </svg>`
      : type === "fire"
      ? `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
         <circle cx="12" cy="12" r="10" fill="#f97316" stroke="#fff" stroke-width="2"/>
         <path d="M8.5 14.5A4.5 4.5 0 0 0 12 18.5a4.5 4.5 0 0 0 3.5-4.5 3.5 3.5 0 0 0-2-3 1.5 1.5 0 0 0-1.5 1.5A1.5 1.5 0 0 1 10.5 11a3.5 3.5 0 0 0-2 3.5Z" fill="#fff"/>
       </svg>`
      : `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
         <circle cx="12" cy="12" r="10" fill="#3b82f6" stroke="#fff" stroke-width="2"/>
         <path d="M9 12l2 2 4-4" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
         <path d="M12 1v6M12 17v6M4.22 4.22l4.24 4.24M15.54 15.54l4.24 4.24M1 12h6M17 12h6M4.22 19.78l4.24-4.24M15.54 8.46l4.24-4.24" stroke="#fff" stroke-width="1" stroke-linecap="round"/>
       </svg>`;

  return divIcon({
    html: iconSvg,
    className: "custom-emergency-icon",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

const createTrafficLightIcon = (phase: string) => {
  const redActive = phase === "red";
  const yellowActive = phase.includes("yellow");
  const greenActive = phase.includes("green");

  const trafficLightSvg = `
    <svg width="32" height="48" viewBox="0 0 32 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="4" width="24" height="40" rx="4" fill="#2d3748" stroke="#000" stroke-width="2"/>
      <circle cx="16" cy="12" r="5" fill="${
        redActive ? "#dc2626" : "#4a5568"
      }" stroke="#000"/>
      <circle cx="16" cy="24" r="5" fill="${
        yellowActive ? "#f59e0b" : "#4a5568"
      }" stroke="#000"/>
      <circle cx="16" cy="36" r="5" fill="${
        greenActive ? "#10b981" : "#4a5568"
      }" stroke="#000"/>
    </svg>
  `;

  return divIcon({
    html: trafficLightSvg,
    className: "custom-traffic-light",
    iconSize: [32, 48],
    iconAnchor: [16, 24],
  });
};

export const MapLayers = ({
  mapView,
  sampleRoads,
  intersections,
  vehicles,
  emergencyVehicles,
  onIntersectionSelect,
  onEmergencyVehicleSelect,
  onTrafficLightOverride,
}: MapLayersProps) => {
  return (
    <>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* Road segments with congestion coloring */}
      {mapView === "congestion" &&
        sampleRoads.map((road) => (
          <Polyline
            key={road.id}
            positions={road.coordinates}
            color={getCongestionColor(road.congestionLevel)}
            weight={8}
            opacity={0.8}
          >
            <Popup>
              <div>
                <strong>Road Segment {road.id}</strong>
                <br />
                Congestion: {road.congestionLevel}
                <br />
                Vehicles: {road.vehicleCount}
              </div>
            </Popup>
          </Polyline>
        ))}

      {/* Vehicle density visualization */}
      {mapView === "density" &&
        sampleRoads.map((road) => (
          <Polyline
            key={road.id}
            positions={road.coordinates}
            color="#3b82f6"
            weight={road.vehicleCount / 2}
            opacity={0.6}
          >
            <Popup>
              <div>
                <strong>Road Segment {road.id}</strong>
                <br />
                Vehicle Density: {road.vehicleCount} vehicles
              </div>
            </Popup>
          </Polyline>
        ))}

      {/* Traffic Light Intersections */}
      {intersections.map((intersection) => (
        <Marker
          key={intersection.id}
          position={[intersection.lat, intersection.lng]}
          icon={createTrafficLightIcon(intersection.phase)}
          eventHandlers={{
            click: () => onIntersectionSelect(intersection),
          }}
        >
          <Popup>
            <div>
              <strong>Intersection {intersection.id}</strong>
              <br />
              Queue Length: {intersection.queueLength} vehicles
              <br />
              Light Phase: {intersection.phase}
              <br />
              Congestion: {intersection.congestionLevel}
              <br />
              <br />
              <button
                className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600 mr-2"
                onClick={() => onIntersectionSelect(intersection)}
              >
                View Details
              </button>
              <button
                className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                onClick={() => onTrafficLightOverride(intersection.id)}
              >
                Override to Green
              </button>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Regular vehicles */}
      {vehicles.map((vehicle) => (
        <Circle
          key={`vehicle-${vehicle.id}`}
          center={[vehicle.lat, vehicle.lng]}
          radius={20}
          fillColor={getVehicleColor(vehicle.type)}
          color={getVehicleColor(vehicle.type)}
          weight={2}
          opacity={0.8}
          fillOpacity={0.6}
        >
          <Popup>
            <div>
              <strong>
                {vehicle.type.toUpperCase()} {vehicle.id}
              </strong>
              <br />
              Speed: {Math.round(vehicle.speed)} km/h
              <br />
              Type: {vehicle.type}
              <br />
              Position: {vehicle.lat.toFixed(4)}, {vehicle.lng.toFixed(4)}
            </div>
          </Popup>
        </Circle>
      ))}

      {/* Emergency vehicles */}
      {emergencyVehicles.map((vehicle) => (
        <Marker
          key={`emergency-${vehicle.id}`}
          position={[vehicle.lat, vehicle.lng]}
          icon={createEmergencyVehicleIcon(vehicle.type)}
          eventHandlers={{
            click: () => onEmergencyVehicleSelect(vehicle),
          }}
        >
          <Popup>
            <div>
              <strong>
                {vehicle.type.toUpperCase()} {vehicle.id}
              </strong>
              <br />
              Status: {vehicle.status}
              <br />
              Speed: {Math.round(vehicle.speed)} km/h
              <br />
              Priority: {vehicle.priority}
              <br />
              {vehicle.destination && (
                <>
                  Destination: {vehicle.destination}
                  <br />
                </>
              )}
              <br />
              <button
                className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                onClick={() => onEmergencyVehicleSelect(vehicle)}
              >
                Track Vehicle
              </button>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
};
