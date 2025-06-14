
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Square, RotateCcw, Settings, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ControlPanelProps {
  simulationState: string;
  setSimulationState: (state: string) => void;
  trafficMode: string;
  setTrafficMode: (mode: string) => void;
}

export const ControlPanel = ({ 
  simulationState, 
  setSimulationState, 
  trafficMode, 
  setTrafficMode 
}: ControlPanelProps) => {
  const { toast } = useToast();

  const handleSimulationControl = (action: string) => {
    setSimulationState(action);
    toast({
      title: "Simulation Control",
      description: `Simulation ${action}`,
    });
  };

  const toggleTrafficMode = () => {
    const newMode = trafficMode === 'conventional' ? 'load-aware' : 'conventional';
    setTrafficMode(newMode);
    toast({
      title: "Traffic Mode Changed",
      description: `Switched to ${newMode} mode`,
    });
  };

  const handleEmergencyOverride = (intersectionId: string) => {
    toast({
      title: "Emergency Override",
      description: `Emergency green light activated for intersection ${intersectionId}`,
      variant: "destructive",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>System Control Panel</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Simulation Controls */}
        <div>
          <h4 className="font-semibold mb-3">Simulation Controls</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handleSimulationControl('running')}
              disabled={simulationState === 'running'}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
            <Button
              onClick={() => handleSimulationControl('paused')}
              disabled={simulationState === 'stopped'}
              variant="outline"
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
            <Button
              onClick={() => handleSimulationControl('stopped')}
              disabled={simulationState === 'stopped'}
              variant="destructive"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
            <Button
              onClick={() => handleSimulationControl('stopped')}
              variant="outline"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>
        </div>

        {/* Traffic Mode Toggle */}
        <div>
          <h4 className="font-semibold mb-3">Traffic Management Mode</h4>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm">Mode:</span>
              <Badge variant={trafficMode === 'load-aware' ? 'default' : 'secondary'}>
                {trafficMode === 'load-aware' ? 'Load-Aware' : 'Conventional'}
              </Badge>
            </div>
            <Button onClick={toggleTrafficMode} variant="outline" size="sm">
              Switch Mode
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {trafficMode === 'load-aware' 
              ? 'AI-optimized traffic light timing based on real-time traffic data'
              : 'Fixed timing traffic light control system'
            }
          </p>
        </div>

        {/* Emergency Override */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
            Emergency Override
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {['Int-1', 'Int-2', 'Int-3', 'Int-4'].map((intersection) => (
              <Button
                key={intersection}
                onClick={() => handleEmergencyOverride(intersection)}
                variant="outline"
                size="sm"
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                {intersection}
              </Button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Force green light for emergency vehicles
          </p>
        </div>

        {/* System Status */}
        <div className="pt-4 border-t">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Simulation:</span>
              <div className="font-semibold capitalize">{simulationState}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Mode:</span>
              <div className="font-semibold capitalize">{trafficMode}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
