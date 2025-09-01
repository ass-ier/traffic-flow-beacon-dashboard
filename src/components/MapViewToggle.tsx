
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Map, 
  Users, 
  CircleArrowUp,
  Eye,
  BarChart3,
  Navigation
} from 'lucide-react';

interface MapViewToggleProps {
  mapView: string;
  setMapView: (view: string) => void;
}

export const MapViewToggle = ({ mapView, setMapView }: MapViewToggleProps) => {
  const viewOptions = [
    {
      id: 'congestion',
      label: 'Congestion View',
      icon: CircleArrowUp,
      description: 'Color-coded traffic congestion levels',
      color: 'bg-red-500'
    },
    {
      id: 'density',
      label: 'Vehicle Density',
      icon: Users,
      description: 'Vehicle density on road segments',
      color: 'bg-blue-500'
    },
    {
      id: 'traffic-lights',
      label: 'Traffic Lights',
      icon: Navigation,
      description: 'Traffic light status and phases',
      color: 'bg-green-500'
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Eye className="h-5 w-5" />
          <span>Map View Controls</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current View */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Current View:</span>
          <Badge variant="default" className="capitalize">
            {mapView.replace('-', ' ')}
          </Badge>
        </div>

        {/* View Options */}
        <div className="space-y-2">
          {viewOptions.map((option) => {
            const Icon = option.icon;
            const isActive = mapView === option.id;
            
            return (
              <Button
                key={option.id}
                onClick={() => setMapView(option.id)}
                variant={isActive ? "default" : "outline"}
                className={`w-full justify-start h-auto p-3 ${
                  isActive ? 'ring-2 ring-blue-500' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded ${isActive ? 'bg-white/20' : 'bg-gray-100'}`}>
                    <Icon className={`h-4 w-4 ${isActive ? 'text-white' : 'text-gray-600'}`} />
                  </div>
                  <div className="text-left">
                    <div className={`font-medium ${isActive ? 'text-white' : 'text-gray-900'}`}>
                      {option.label}
                    </div>
                    <div className={`text-xs ${isActive ? 'text-white/80' : 'text-gray-500'}`}>
                      {option.description}
                    </div>
                  </div>
                </div>
              </Button>
            );
          })}
        </div>

        {/* View Settings */}
        <div className="pt-4 border-t">
          <h5 className="text-sm font-medium mb-2 flex items-center">
            <BarChart3 className="h-4 w-4 mr-1" />
            Display Options
          </h5>
          <div className="space-y-2 text-sm">
            <label className="flex items-center space-x-2">
              <input type="checkbox" defaultChecked className="rounded" />
              <span>Show vehicle markers</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" defaultChecked className="rounded" />
              <span>Show intersection labels</span>
            </label>
            <label className="flex items-center space-x-2">
              <input type="checkbox" defaultChecked className="rounded" />
              <span>Real-time updates</span>
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
