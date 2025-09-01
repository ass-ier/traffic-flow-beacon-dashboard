import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Progress } from './ui/progress';
import { 
  Activity, 
  AlertCircle, 
  Car, 
  MapPin, 
  TrendingUp, 
  Users, 
  Zap,
  Shield,
  Navigation,
  Clock,
  BarChart3,
  LineChart,
  Settings,
  Play,
  Pause,
  RotateCw,
  Download,
  Upload,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { useSUMOData } from '../hooks/useSUMOData';
import { TrafficMap } from './TrafficMap';
import { AnimatedCounter } from './ui/animated-counter';
import { MetricCard } from './ui/metric-card';
import { StatusIndicator } from './ui/status-indicator';
import { ProgressRing } from './ui/progress-ring';
import { LoadingSpinner } from './ui/loading-spinner';
import { sumoCommandService } from '../services/SUMOCommandService';

interface MetricData {
  value: number;
  trend: number;
  status: 'success' | 'warning' | 'danger' | 'neutral';
}

interface SystemHealth {
  python: boolean;
  backend: boolean;
  sumo: boolean;
  websocket: boolean;
}

export const EnterpriseDashboard: React.FC = () => {
  const { 
    vehicles, 
    intersections, 
    roads, 
    emergencyVehicles, 
    connection, 
    loading, 
    error 
  } = useSUMOData();

  const [activeTab, setActiveTab] = useState('overview');
  const [simulationState, setSimulationState] = useState<'running' | 'paused' | 'stopped'>('stopped');
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    python: false,
    backend: false,
    sumo: false,
    websocket: false
  });
  const [selectedTimeRange, setSelectedTimeRange] = useState('1h');
  const [mapView, setMapView] = useState('traffic');

  // Check system health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        // Check Python bridge
        const pythonRes = await fetch('http://localhost:8814/health').catch(() => null);
        const pythonHealthy = pythonRes?.ok || false;

        // Check backend
        const backendRes = await fetch('http://localhost:3001/health').catch(() => null);
        const backendHealthy = backendRes?.ok || false;

        // Check SUMO connection via Python bridge
        let sumoConnected = false;
        if (pythonRes?.ok) {
          const pythonData = await pythonRes.json();
          sumoConnected = pythonData.connected || false;
        }

        setSystemHealth({
          python: pythonHealthy,
          backend: backendHealthy,
          sumo: sumoConnected,
          websocket: connection.isConnected
        });

        setSimulationState(sumoConnected ? 'running' : 'stopped');
      } catch (error) {
        console.error('Health check failed:', error);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 5000);
    return () => clearInterval(interval);
  }, [connection.isConnected]);

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalVehicles = vehicles.length;
    const avgSpeed = vehicles.reduce((sum, v) => sum + v.speed, 0) / (totalVehicles || 1);
    const congestionLevel = roads.reduce((sum, r) => {
      const level = r.congestionLevel === 'high' ? 3 : r.congestionLevel === 'medium' ? 2 : 1;
      return sum + level;
    }, 0) / (roads.length || 1);
    
    const activeEmergencies = emergencyVehicles.filter(v => v.status === 'responding').length;
    
    return {
      totalVehicles: {
        value: totalVehicles,
        trend: 5.2,
        status: totalVehicles > 100 ? 'warning' : 'success' as const
      },
      avgSpeed: {
        value: Math.round(avgSpeed),
        trend: -2.1,
        status: avgSpeed < 20 ? 'danger' : avgSpeed < 40 ? 'warning' : 'success' as const
      },
      congestion: {
        value: Math.round(congestionLevel * 33.33),
        trend: 8.3,
        status: congestionLevel > 2 ? 'danger' : congestionLevel > 1.5 ? 'warning' : 'success' as const
      },
      emergencies: {
        value: activeEmergencies,
        trend: 0,
        status: activeEmergencies > 0 ? 'warning' : 'neutral' as const
      }
    };
  }, [vehicles, roads, emergencyVehicles]);

  const handleSimulationControl = async (action: 'start' | 'pause' | 'stop') => {
    try {
      switch (action) {
        case 'start':
          await sumoCommandService.startSimulation();
          setSimulationState('running');
          break;
        case 'pause':
          await sumoCommandService.pauseSimulation();
          setSimulationState('paused');
          break;
        case 'stop':
          await sumoCommandService.stopSimulation();
          setSimulationState('stopped');
          break;
      }
    } catch (error) {
      console.error(`Failed to ${action} simulation:`, error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      {/* Professional Header */}
      <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Navigation className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Traffic Flow Command Center
                  </h1>
                  <p className="text-xs text-muted-foreground">Addis Ababa Metropolitan Area</p>
                </div>
              </div>
            </div>

            {/* System Status Bar */}
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <StatusIndicator 
                  status={systemHealth.python ? 'online' : 'offline'} 
                  label="Python Bridge" 
                />
                <StatusIndicator 
                  status={systemHealth.backend ? 'online' : 'offline'} 
                  label="Backend" 
                />
                <StatusIndicator 
                  status={systemHealth.sumo ? 'online' : 'offline'} 
                  label="SUMO" 
                />
                <StatusIndicator 
                  status={systemHealth.websocket ? 'online' : 'offline'} 
                  label="WebSocket" 
                />
              </div>

              {/* Simulation Controls */}
              <div className="flex items-center space-x-2 border-l pl-6">
                <Button
                  size="sm"
                  variant={simulationState === 'running' ? 'default' : 'outline'}
                  onClick={() => handleSimulationControl('start')}
                  disabled={simulationState === 'running'}
                  className="gap-2"
                >
                  <Play className="w-4 h-4" />
                  Start
                </Button>
                <Button
                  size="sm"
                  variant={simulationState === 'paused' ? 'default' : 'outline'}
                  onClick={() => handleSimulationControl('pause')}
                  disabled={simulationState !== 'running'}
                  className="gap-2"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleSimulationControl('stop')}
                  disabled={simulationState === 'stopped'}
                  className="gap-2"
                >
                  <RotateCw className="w-4 h-4" />
                  Reset
                </Button>
              </div>

              {/* Settings */}
              <Button size="sm" variant="ghost">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-6">
        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Key Metrics Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <MetricCard
            title="Active Vehicles"
            value={metrics.totalVehicles.value}
            trend={metrics.totalVehicles.trend}
            status={metrics.totalVehicles.status}
            icon={<Car className="w-5 h-5" />}
            suffix="vehicles"
          />
          <MetricCard
            title="Average Speed"
            value={metrics.avgSpeed.value}
            trend={metrics.avgSpeed.trend}
            status={metrics.avgSpeed.status}
            icon={<TrendingUp className="w-5 h-5" />}
            suffix="km/h"
          />
          <MetricCard
            title="Congestion Level"
            value={metrics.congestion.value}
            trend={metrics.congestion.trend}
            status={metrics.congestion.status}
            icon={<Activity className="w-5 h-5" />}
            suffix="%"
          />
          <MetricCard
            title="Emergency Response"
            value={metrics.emergencies.value}
            trend={metrics.emergencies.trend}
            status={metrics.emergencies.status}
            icon={<Shield className="w-5 h-5" />}
            suffix="active"
          />
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="traffic">Traffic Analysis</TabsTrigger>
            <TabsTrigger value="incidents">Incidents</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Map */}
              <Card className="lg:col-span-2 overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">Live Traffic Map</CardTitle>
                    <div className="flex items-center space-x-2">
                      <Badge variant={connection.isConnected ? 'default' : 'secondary'}>
                        {connection.isConnected ? 'Live' : 'Offline'}
                      </Badge>
                      <select 
                        className="text-sm border rounded px-2 py-1"
                        value={mapView}
                        onChange={(e) => setMapView(e.target.value)}
                      >
                        <option value="traffic">Traffic Flow</option>
                        <option value="congestion">Congestion</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="h-[500px] relative">
                    {loading ? (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-900">
                        <LoadingSpinner size="large" />
                      </div>
                    ) : (
                      <TrafficMap mapView={mapView} simulationState={simulationState} />
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Side Panel */}
              <div className="space-y-6">
                {/* Real-time Stats */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold">Real-time Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Network Efficiency</span>
                        <span className="text-sm font-medium">82%</span>
                      </div>
                      <Progress value={82} className="h-2" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Traffic Flow Rate</span>
                        <span className="text-sm font-medium">67%</span>
                      </div>
                      <Progress value={67} className="h-2" />
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">System Load</span>
                        <span className="text-sm font-medium">45%</span>
                      </div>
                      <Progress value={45} className="h-2" />
                    </div>
                  </CardContent>
                </Card>

                {/* Active Intersections */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold">Critical Intersections</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {intersections.slice(0, 5).map((intersection) => (
                        <div key={intersection.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-800">
                          <div className="flex items-center space-x-3">
                            <div className={`w-2 h-2 rounded-full ${
                              intersection.congestionLevel === 'high' ? 'bg-red-500' :
                              intersection.congestionLevel === 'medium' ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`} />
                            <span className="text-sm font-medium">Junction {intersection.id}</span>
                          </div>
                          <Badge variant={
                            intersection.congestionLevel === 'high' ? 'destructive' :
                            intersection.congestionLevel === 'medium' ? 'secondary' :
                            'default'
                          }>
                            {intersection.congestionLevel}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="traffic" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detailed Traffic Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase">Vehicle Distribution</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Cars</span>
                        <span className="text-sm font-medium">{vehicles.filter(v => v.type === 'car').length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Buses</span>
                        <span className="text-sm font-medium">{vehicles.filter(v => v.type === 'bus').length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Trucks</span>
                        <span className="text-sm font-medium">{vehicles.filter(v => v.type === 'truck').length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Emergency</span>
                        <span className="text-sm font-medium">{emergencyVehicles.length}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase">Road Conditions</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Clear Roads</span>
                        <span className="text-sm font-medium">{roads.filter(r => r.congestionLevel === 'low').length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Moderate Traffic</span>
                        <span className="text-sm font-medium">{roads.filter(r => r.congestionLevel === 'medium').length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Heavy Congestion</span>
                        <span className="text-sm font-medium">{roads.filter(r => r.congestionLevel === 'high').length}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Critical</span>
                        <span className="text-sm font-medium">{roads.filter(r => r.congestionLevel === 'critical').length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="incidents" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Incidents & Emergency Response</CardTitle>
              </CardHeader>
              <CardContent>
                {emergencyVehicles.length > 0 ? (
                  <div className="space-y-4">
                    {emergencyVehicles.map((vehicle) => (
                      <div key={vehicle.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            vehicle.emergencyType === 'ambulance' ? 'bg-red-100 text-red-600' :
                            vehicle.emergencyType === 'police' ? 'bg-blue-100 text-blue-600' :
                            'bg-orange-100 text-orange-600'
                          }`}>
                            <Shield className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-medium capitalize">{vehicle.emergencyType}</p>
                            <p className="text-sm text-muted-foreground">Unit #{vehicle.id}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={vehicle.priority === 'high' ? 'destructive' : 'default'}>
                            {vehicle.status}
                          </Badge>
                          <p className="text-sm text-muted-foreground mt-1">
                            Speed: {Math.round(vehicle.speed)} km/h
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Shield className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>No active emergency vehicles</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Traffic Flow Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <LineChart className="w-8 h-8 mr-2" />
                    <span>Real-time chart will be displayed here</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Congestion Heatmap</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <BarChart3 className="w-8 h-8 mr-2" />
                    <span>Heatmap visualization will be displayed here</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
