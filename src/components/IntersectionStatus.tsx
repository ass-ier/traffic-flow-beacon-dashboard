
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Navigation, 
  Clock, 
  Users, 
  AlertTriangle,
  X,
  Zap
} from 'lucide-react';

interface IntersectionStatusProps {
  intersection: {
    id: number;
    lat: number;
    lng: number;
    queueLength: number;
    phase: string;
    congestionLevel: string;
    remainingTime?: number;
  } | null;
  onClose: () => void;
  onOverrideToGreen: (intersectionId: number) => void;
}

const getPhaseColor = (phase: string) => {
  if (phase.includes('green')) return 'bg-green-500';
  if (phase === 'red') return 'bg-red-500';
  return 'bg-yellow-500';
};

const getPhaseText = (phase: string) => {
  if (phase === 'green-ns') return 'Green (North-South)';
  if (phase === 'green-ew') return 'Green (East-West)';
  if (phase === 'red') return 'Red (All Directions)';
  return 'Yellow (Transition)';
};

export const IntersectionStatus = ({ intersection, onClose, onOverrideToGreen }: IntersectionStatusProps) => {
  if (!intersection) return null;

  return (
    <Card className="absolute top-4 left-4 w-80 z-[1000] shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2 text-lg">
            <Navigation className="h-5 w-5" />
            <span>Intersection {intersection.id}</span>
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Traffic Light Status */}
        <div className="flex items-center space-x-3">
          <div className={`w-4 h-4 rounded-full ${getPhaseColor(intersection.phase)}`}></div>
          <div>
            <p className="font-medium">{getPhaseText(intersection.phase)}</p>
            <p className="text-sm text-gray-500">
              Remaining: {intersection.remainingTime || Math.floor(Math.random() * 30) + 5}s
            </p>
          </div>
        </div>

        {/* Queue Information */}
        <div className="flex items-center space-x-3">
          <Users className="h-4 w-4 text-blue-500" />
          <div>
            <p className="font-medium">Queue Length: {intersection.queueLength} vehicles</p>
            <p className="text-sm text-gray-500">
              Congestion: <Badge variant={intersection.congestionLevel === 'high' ? 'destructive' : 
                intersection.congestionLevel === 'medium' ? 'default' : 'secondary'}>
                {intersection.congestionLevel}
              </Badge>
            </p>
          </div>
        </div>

        {/* Control Actions */}
        <div className="pt-3 border-t space-y-2">
          <Button 
            variant="default" 
            size="sm" 
            className="w-full bg-green-600 hover:bg-green-700"
            onClick={() => onOverrideToGreen(intersection.id)}
          >
            <Zap className="h-4 w-4 mr-2" />
            Override to Green
          </Button>
          
          <Button 
            variant="destructive" 
            size="sm" 
            className="w-full"
            onClick={() => {
              console.log(`Emergency override activated for intersection ${intersection.id}`);
            }}
          >
            <AlertTriangle className="h-4 w-4 mr-2" />
            Emergency Override
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
