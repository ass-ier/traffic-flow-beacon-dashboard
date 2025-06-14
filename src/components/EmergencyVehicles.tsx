
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Ambulance, 
  CarTaxiFront,
  Navigation,
  MapPin
} from 'lucide-react';

interface EmergencyVehicle {
  id: number;
  type: 'ambulance' | 'police' | 'fire';
  lat: number;
  lng: number;
  speed: number;
  status: 'responding' | 'on-scene' | 'returning';
  priority: 'high' | 'medium' | 'low';
  destination?: string;
}

interface EmergencyVehiclesProps {
  vehicles: EmergencyVehicle[];
  onVehicleSelect: (vehicle: EmergencyVehicle) => void;
}

const getVehicleIcon = (type: string) => {
  switch (type) {
    case 'ambulance': return Ambulance;
    case 'police': return CarTaxiFront;
    case 'fire': return CarTaxiFront;
    default: return CarTaxiFront;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'responding': return 'bg-red-500';
    case 'on-scene': return 'bg-yellow-500';
    case 'returning': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
};

export const EmergencyVehicles = ({ vehicles, onVehicleSelect }: EmergencyVehiclesProps) => {
  if (vehicles.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Ambulance className="h-5 w-5" />
            <span>Emergency Vehicles</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">No active emergency vehicles</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-lg">
          <Ambulance className="h-5 w-5" />
          <span>Emergency Vehicles ({vehicles.length})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 max-h-60 overflow-y-auto">
        {vehicles.map((vehicle) => {
          const Icon = getVehicleIcon(vehicle.type);
          
          return (
            <div 
              key={vehicle.id} 
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
              onClick={() => onVehicleSelect(vehicle)}
            >
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Icon className="h-5 w-5 text-red-600" />
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(vehicle.status)}`}></div>
                </div>
                <div>
                  <p className="font-medium capitalize">
                    {vehicle.type} {vehicle.id}
                  </p>
                  <p className="text-sm text-gray-500 capitalize">
                    {vehicle.status} • {Math.round(vehicle.speed)} km/h
                  </p>
                  {vehicle.destination && (
                    <p className="text-xs text-gray-400">
                      → {vehicle.destination}
                    </p>
                  )}
                </div>
              </div>
              <Badge variant={vehicle.priority === 'high' ? 'destructive' : 
                vehicle.priority === 'medium' ? 'default' : 'secondary'}>
                {vehicle.priority}
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
