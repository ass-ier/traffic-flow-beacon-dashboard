import { useEffect, useRef, useState } from 'react';
import { MapContainer, useMap } from 'react-leaflet';
import { MapLayers } from './MapLayers';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface TrafficMapProps {
  mapView: string;
  simulationState: string;
}

// Sample traffic data - this would come from your SUMO simulation
const sampleIntersections = [
  { id: 1, lat: 9.0320, lng: 38.7469, queueLength: 12, phase: 'green-ns', congestionLevel: 'high' },
  { id: 2, lat: 9.0350, lng: 38.7500, queueLength: 8, phase: 'green-ew', congestionLevel: 'medium' },
  { id: 3, lat: 9.0280, lng: 38.7520, queueLength: 15, phase: 'red', congestionLevel: 'high' },
  { id: 4, lat: 9.0380, lng: 38.7450, queueLength: 5, phase: 'green-ns', congestionLevel: 'low' },
];

const sampleRoads = [
  {
    id: 1,
    coordinates: [[9.0320, 38.7469], [9.0350, 38.7500]] as [number, number][],
    congestionLevel: 'high',
    vehicleCount: 25
  },
  {
    id: 2,
    coordinates: [[9.0350, 38.7500], [9.0280, 38.7520]] as [number, number][],
    congestionLevel: 'medium',
    vehicleCount: 15
  },
  {
    id: 3,
    coordinates: [[9.0280, 38.7520], [9.0380, 38.7450]] as [number, number][],
    congestionLevel: 'low',
    vehicleCount: 8
  },
];

const sampleVehicles = [
  { id: 1, lat: 9.0325, lng: 38.7475, speed: 25, type: 'car' },
  { id: 2, lat: 9.0340, lng: 38.7490, speed: 0, type: 'bus' },
  { id: 3, lat: 9.0310, lng: 38.7485, speed: 15, type: 'truck' },
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
  const [vehicles, setVehicles] = useState(sampleVehicles);
  const [intersections, setIntersections] = useState(sampleIntersections);

  // Simulate real-time updates
  useEffect(() => {
    if (simulationState !== 'running') return;

    const interval = setInterval(() => {
      setVehicles(prev => prev.map(vehicle => ({
        ...vehicle,
        lat: vehicle.lat + (Math.random() - 0.5) * 0.001,
        lng: vehicle.lng + (Math.random() - 0.5) * 0.001,
        speed: Math.max(0, vehicle.speed + (Math.random() - 0.5) * 10),
      })));

      setIntersections(prev => prev.map(intersection => ({
        ...intersection,
        queueLength: Math.max(0, intersection.queueLength + Math.floor((Math.random() - 0.5) * 6)),
        phase: Math.random() > 0.8 ? 
          ['green-ns', 'green-ew', 'red'][Math.floor(Math.random() * 3)] : 
          intersection.phase,
      })));
    }, 2000);

    return () => clearInterval(interval);
  }, [simulationState]);

  const getCongestionColor = (level: string) => {
    switch (level) {
      case 'high': return '#dc2626';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getTrafficLightColor = (phase: string) => {
    if (phase.includes('green')) return '#10b981';
    if (phase === 'red') return '#dc2626';
    return '#f59e0b';
  };

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={[9.0320, 38.7469]}
        zoom={15}
        className="h-full w-full"
        zoomControl={true}
      >
        <MapUpdater mapView={mapView} />
        <MapLayers 
          mapView={mapView}
          sampleRoads={sampleRoads}
          intersections={intersections}
          vehicles={vehicles}
        />
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg text-sm">
        <h4 className="font-semibold mb-2 capitalize">{mapView} View</h4>
        {mapView === 'congestion' && (
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
        {mapView === 'traffic-lights' && (
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
      </div>
    </div>
  );
};
