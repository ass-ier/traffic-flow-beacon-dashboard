
import { TileLayer, Circle, Polyline, Popup } from 'react-leaflet';

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
}

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

export const MapLayers = ({ mapView, sampleRoads, intersections, vehicles }: MapLayersProps) => {
  return (
    <>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* Road segments with congestion coloring */}
      {mapView === 'congestion' && sampleRoads.map(road => (
        <Polyline
          key={road.id}
          positions={road.coordinates}
          color={getCongestionColor(road.congestionLevel)}
          weight={8}
          opacity={0.8}
        >
          <Popup>
            <div>
              <strong>Road Segment {road.id}</strong><br />
              Congestion: {road.congestionLevel}<br />
              Vehicles: {road.vehicleCount}
            </div>
          </Popup>
        </Polyline>
      ))}

      {/* Vehicle density visualization */}
      {mapView === 'density' && sampleRoads.map(road => (
        <Polyline
          key={road.id}
          positions={road.coordinates}
          color="#3b82f6"
          weight={road.vehicleCount / 2}
          opacity={0.6}
        >
          <Popup>
            <div>
              <strong>Road Segment {road.id}</strong><br />
              Vehicle Density: {road.vehicleCount} vehicles
            </div>
          </Popup>
        </Polyline>
      ))}

      {/* Intersections */}
      {intersections.map(intersection => (
        <Circle
          key={intersection.id}
          center={[intersection.lat, intersection.lng]}
          radius={50}
          color={mapView === 'traffic-lights' ? 
            getTrafficLightColor(intersection.phase) : 
            getCongestionColor(intersection.congestionLevel)
          }
          fillColor={mapView === 'traffic-lights' ? 
            getTrafficLightColor(intersection.phase) : 
            getCongestionColor(intersection.congestionLevel)
          }
          fillOpacity={0.7}
        >
          <Popup>
            <div>
              <strong>Intersection {intersection.id}</strong><br />
              Queue Length: {intersection.queueLength} vehicles<br />
              Light Phase: {intersection.phase}<br />
              Congestion: {intersection.congestionLevel}
              <br /><br />
              <button 
                className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                onClick={() => {
                  console.log(`Emergency override for intersection ${intersection.id}`);
                }}
              >
                Emergency Override
              </button>
            </div>
          </Popup>
        </Circle>
      ))}

      {/* Moving vehicles */}
      {vehicles.map(vehicle => (
        <Circle
          key={vehicle.id}
          center={[vehicle.lat, vehicle.lng]}
          radius={15}
          color={vehicle.speed > 20 ? '#10b981' : vehicle.speed > 5 ? '#f59e0b' : '#dc2626'}
          fillColor={vehicle.speed > 20 ? '#10b981' : vehicle.speed > 5 ? '#f59e0b' : '#dc2626'}
          fillOpacity={0.8}
        >
          <Popup>
            <div>
              <strong>{vehicle.type.toUpperCase()} {vehicle.id}</strong><br />
              Speed: {Math.round(vehicle.speed)} km/h<br />
              Status: {vehicle.speed > 20 ? 'Moving' : vehicle.speed > 5 ? 'Slow' : 'Stopped'}
            </div>
          </Popup>
        </Circle>
      ))}
    </>
  );
};
