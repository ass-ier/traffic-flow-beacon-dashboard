
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  Clock, 
  Car, 
  TrendingUp,
  MapPin,
  Timer
} from 'lucide-react';
import { useSUMOData } from '../hooks/useSUMOData';
import { useMemo } from 'react';

export const StatisticsPanel = () => {
  // Get real SUMO data
  const {
    vehicles,
    intersections,
    roads,
    emergencyVehicles,
    connection,
    loading,
    error,
  } = useSUMOData();

  // Calculate real-time statistics from SUMO data
  const stats = useMemo(() => {
    const totalVehicles = vehicles.length + emergencyVehicles.length;
    
    // Calculate average waiting time from vehicles
    const avgWaitTime = vehicles.length > 0 
      ? vehicles.reduce((sum, v) => sum + (v.waitingTime || 0), 0) / vehicles.length
      : 0;
    
    // Calculate throughput based on vehicle speeds
    const throughput = vehicles.length > 0
      ? Math.round(vehicles.reduce((sum, v) => sum + Math.max(0, v.speed), 0) * 3.6) // Convert to vehicles/hour estimate
      : 0;
    
    // Get queue lengths from intersections
    const queueLengths = intersections.slice(0, 4).map(intersection => {
      const queues = Object.values(intersection.queueLengths || {});
      return queues.length > 0 ? Math.max(...queues) : 0;
    });
    
    // Pad queue lengths if we have fewer than 4 intersections
    while (queueLengths.length < 4) {
      queueLengths.push(0);
    }
    
    // Calculate congestion level based on roads
    let congestionLevel = 0;
    if (roads.length > 0) {
      const highCongestionRoads = roads.filter(r => r.congestionLevel === 'high').length;
      const mediumCongestionRoads = roads.filter(r => r.congestionLevel === 'medium').length;
      congestionLevel = Math.round(
        (highCongestionRoads * 100 + mediumCongestionRoads * 50) / roads.length
      );
    }
    
    // Calculate system efficiency based on average speeds and waiting times
    let systemEfficiency = 85; // Default
    if (vehicles.length > 0) {
      const avgSpeed = vehicles.reduce((sum, v) => sum + v.speed, 0) / vehicles.length;
      const maxSpeed = 50; // Assume max speed of 50 km/h
      const speedEfficiency = (avgSpeed / maxSpeed) * 100;
      const waitEfficiency = Math.max(0, 100 - avgWaitTime * 2); // Penalize waiting time
      systemEfficiency = Math.round((speedEfficiency + waitEfficiency) / 2);
    }
    
    return {
      totalVehicles,
      avgWaitTime,
      throughput,
      activeIntersections: intersections.length,
      queueLengths,
      congestionLevel: Math.min(100, congestionLevel),
      systemEfficiency: Math.max(0, Math.min(100, systemEfficiency))
    };
  }, [vehicles, intersections, roads, emergencyVehicles]);

  const getCongestionBadge = (level: number) => {
    if (level < 30) return <Badge className="bg-green-500">Low</Badge>;
    if (level < 70) return <Badge className="bg-yellow-500">Medium</Badge>;
    return <Badge variant="destructive">High</Badge>;
  };

  return (
    <Card className="bg-gradient-to-br from-white to-slate-50/50 border-0 shadow-xl backdrop-blur-sm hover-lift">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-semibold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
              Live Analytics
            </span>
          </div>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
            Real-time
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <Car className="h-6 w-6 mx-auto mb-1 text-blue-600" />
            <div className="text-2xl font-bold text-blue-700">{stats.totalVehicles}</div>
            <div className="text-xs text-blue-600">Total Vehicles</div>
          </div>
          
          <div className="text-center p-3 bg-amber-50 rounded-lg">
            <Clock className="h-6 w-6 mx-auto mb-1 text-amber-600" />
            <div className="text-2xl font-bold text-amber-700">{stats.avgWaitTime.toFixed(1)}s</div>
            <div className="text-xs text-amber-600">Avg Wait Time</div>
          </div>
        </div>

        {/* Throughput */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center">
              <TrendingUp className="h-4 w-4 mr-1" />
              Throughput
            </span>
            <span className="text-lg font-bold">{stats.throughput}/hr</span>
          </div>
          <Progress value={(stats.throughput / 300) * 100} className="h-2" />
        </div>

        {/* System Efficiency */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium flex items-center">
              <Timer className="h-4 w-4 mr-1" />
              System Efficiency
            </span>
            <span className="text-lg font-bold">{stats.systemEfficiency}%</span>
          </div>
          <Progress value={stats.systemEfficiency} className="h-2" />
        </div>

        {/* Congestion Level */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Overall Congestion</span>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-bold">{stats.congestionLevel}%</span>
            {getCongestionBadge(stats.congestionLevel)}
          </div>
        </div>

        {/* Queue Lengths */}
        <div>
          <h5 className="text-sm font-medium mb-3 flex items-center">
            <MapPin className="h-4 w-4 mr-1" />
            Queue Lengths by Intersection
          </h5>
          <div className="space-y-2">
            {stats.queueLengths.map((length, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-xs">Intersection {index + 1}</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        length < 5 ? 'bg-green-500' : 
                        length < 10 ? 'bg-yellow-500' : 
                        'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(100, (length / 20) * 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-xs font-mono w-8">{length}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Intersections */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Active Intersections</span>
            <span className="font-semibold">{stats.activeIntersections}/4</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
