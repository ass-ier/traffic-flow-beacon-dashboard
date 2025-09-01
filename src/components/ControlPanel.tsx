import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  Settings,
  AlertTriangle,
  Wifi,
  WifiOff,
  Car,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import {
  sumoConnectionService,
  SUMOConnectionStatus,
} from "@/services/sumoConnectionService";

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
  setTrafficMode,
}: ControlPanelProps) => {
  const { toast } = useToast();
  const [sumoStatus, setSumoStatus] = useState<SUMOConnectionStatus>({
    connected: false,
    sumoRunning: false,
    vehicleCount: 0,
    simulationTime: 0,
    lastUpdate: 0,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [serviceAvailable, setServiceAvailable] = useState(false);
  const [isCheckingService, setIsCheckingService] = useState(false);

  useEffect(() => {
    // Subscribe to SUMO status updates
    const unsubscribe =
      sumoConnectionService.subscribeToStatusUpdates(setSumoStatus);

    // Get initial status
    sumoConnectionService.getStatus();

    // Check service availability periodically
    const checkService = async () => {
      const available = await sumoConnectionService.checkServiceAvailability();
      setServiceAvailable(available);
    };

    checkService();
    const serviceCheckInterval = setInterval(checkService, 5000); // Check every 5 seconds

    return () => {
      unsubscribe();
      clearInterval(serviceCheckInterval);
    };
  }, []);

  const handleSimulationControl = async (action: string) => {
    if (action === "running") {
      // Check service availability first
      setIsCheckingService(true);
      const available = await sumoConnectionService.checkServiceAvailability();
      setServiceAvailable(available);
      setIsCheckingService(false);

      if (!available) {
        toast({
          title: "Python Bridge Service Not Available",
          description:
            "Please start the Python bridge service first. Run 'start-system.bat' or start services manually.",
          variant: "destructive",
        });
        return;
      }

      // Start SUMO and connect
      setIsConnecting(true);
      try {
        console.log("Starting SUMO via frontend play button...");
        console.log("Calling sumoConnectionService.startSUMO()...");
        const status = await sumoConnectionService.startSUMO();
        console.log("SUMO start response received:", status);
        
        // Don't change simulation state to "running" for manual control mode
        // Keep it as "stopped" so user can control via GUI
        if (status.error) {
          setSimulationState("stopped");
        } else {
          setSimulationState("stopped"); // Keep stopped for manual control
        }
        
        toast({
          title: "SUMO Ready",
          description: `SUMO connected with ${status.vehicleCount || 0} vehicles. Use SUMO-GUI play button to start.`,
        });
        console.log("SUMO started and connected:", status);
      } catch (error) {
        console.error("SUMO start error details:", error);
        toast({
          title: "Simulation Start Failed",
          description:
            error instanceof Error
              ? error.message
              : "Failed to start SUMO simulation",
          variant: "destructive",
        });
        console.error("SUMO start failed:", error);
      } finally {
        setIsConnecting(false);
      }
    } else if (action === "stopped") {
      // Stop SUMO
      try {
        await sumoConnectionService.stopSUMO();
        setSimulationState(action);
        toast({
          title: "Simulation Stopped",
          description: "SUMO simulation stopped",
        });
      } catch (error) {
        toast({
          title: "Simulation Stop Failed",
          description:
            error instanceof Error
              ? error.message
              : "Failed to stop SUMO simulation",
          variant: "destructive",
        });
      }
    } else {
      // Handle pause, reset, etc.
      setSimulationState(action);
      toast({
        title: "Simulation Control",
        description: `Simulation ${action}`,
      });
    }
  };

  const toggleTrafficMode = () => {
    const newMode =
      trafficMode === "conventional" ? "load-aware" : "conventional";
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

  const handleSumoConnect = async () => {
    setIsConnecting(true);
    try {
      const status = await sumoConnectionService.connect();
      toast({
        title: "SUMO Connection",
        description: "Successfully connected to SUMO simulation",
      });
      console.log("SUMO connected:", status);
    } catch (error) {
      toast({
        title: "Connection Failed",
        description:
          error instanceof Error ? error.message : "Failed to connect to SUMO",
        variant: "destructive",
      });
      console.error("SUMO connection failed:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSumoDisconnect = async () => {
    try {
      await sumoConnectionService.disconnect();
      toast({
        title: "SUMO Connection",
        description: "Disconnected from SUMO simulation",
      });
    } catch (error) {
      toast({
        title: "Disconnection Failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to disconnect from SUMO",
        variant: "destructive",
      });
    }
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
          {!serviceAvailable && (
            <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  Python Bridge Service Required
                </span>
              </div>
              <div className="mt-2 text-sm text-yellow-700">
                Please start services first:{" "}
                <code className="bg-yellow-100 px-1 rounded">
                  start-system.bat
                </code>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={() => handleSimulationControl("running")}
              disabled={
                isConnecting ||
                isCheckingService ||
                !serviceAvailable
              }
              className={`${
                serviceAvailable
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-gray-400 cursor-not-allowed"
              }`}
            >
              <Play className="h-4 w-4 mr-2" />
              {isConnecting
                ? "Starting..."
                : isCheckingService
                ? "Checking..."
                : "Start"}
            </Button>
            <Button
              onClick={() => handleSimulationControl("paused")}
              disabled={simulationState === "stopped" || !sumoStatus.connected}
              variant="outline"
            >
              <Pause className="h-4 w-4 mr-2" />
              Pause
            </Button>
            <Button
              onClick={() => handleSimulationControl("stopped")}
              disabled={simulationState === "stopped"}
              variant="destructive"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop
            </Button>
            <Button
              onClick={() => handleSimulationControl("stopped")}
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
              <Badge
                variant={trafficMode === "load-aware" ? "default" : "secondary"}
              >
                {trafficMode === "load-aware" ? "Load-Aware" : "Conventional"}
              </Badge>
            </div>
            <Button onClick={toggleTrafficMode} variant="outline" size="sm">
              Switch Mode
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {trafficMode === "load-aware"
              ? "AI-optimized traffic light timing based on real-time traffic data"
              : "Fixed timing traffic light control system"}
          </p>
        </div>

        {/* Emergency Override */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center">
            <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
            Emergency Override
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {["Int-1", "Int-2", "Int-3", "Int-4"].map((intersection) => (
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

        {/* SUMO Connection */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center">
            {sumoStatus.connected ? (
              <Wifi className="h-4 w-4 mr-2 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 mr-2 text-red-500" />
            )}
            SUMO Connection
          </h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm">Status:</span>
                <Badge
                  variant={sumoStatus.connected ? "default" : "destructive"}
                >
                  {sumoStatus.connected ? "Connected" : "Disconnected"}
                </Badge>
                {sumoStatus.connected && (
                  <Badge
                    variant="outline"
                    className="flex items-center space-x-1"
                  >
                    <Car className="h-3 w-3" />
                    <span>{sumoStatus.vehicleCount}</span>
                  </Badge>
                )}
              </div>
              {sumoStatus.connected ? (
                <Button
                  onClick={handleSumoDisconnect}
                  variant="outline"
                  size="sm"
                  className="text-red-600 border-red-200 hover:bg-red-50"
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  onClick={handleSumoConnect}
                  variant="outline"
                  size="sm"
                  disabled={isConnecting}
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  {isConnecting ? "Connecting..." : "Connect"}
                </Button>
              )}
            </div>
            {sumoStatus.connected && (
              <div className="text-xs text-muted-foreground">
                Simulation Time: {Math.floor(sumoStatus.simulationTime)}s |
                Vehicles: {sumoStatus.vehicleCount}
              </div>
            )}
            {sumoStatus.error && (
              <div className="text-xs text-red-600">
                Error: {sumoStatus.error}
              </div>
            )}
          </div>
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
