
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
import { useEffect, useState } from 'react';

export const StatisticsPanel = () => {
  const [stats, setStats] = useState({
    totalVehicles: 142,
    avgWaitTime: 23.5,
    throughput: 156,
    activeIntersections: 4,
    queueLengths: [12, 8, 15, 5],
    congestionLevel: 67,
    systemEfficiency: 85
  });

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        ...prev,
        totalVehicles: prev.totalVehicles + Math.floor((Math.random() - 0.5) * 10),
        avgWaitTime: Math.max(0, prev.avgWaitTime + (Math.random() - 0.5) * 5),
        throughput: prev.throughput + Math.floor((Math.random() - 0.5) * 20),
        queueLengths: prev.queueLengths.map(q => Math.max(0, q + Math.floor((Math.random() - 0.5) * 6))),
        congestionLevel: Math.max(0, Math.min(100, prev.congestionLevel + Math.floor((Math.random() - 0.5) * 10))),
        systemEfficiency: Math.max(0, Math.min(100, prev.systemEfficiency + Math.floor((Math.random() - 0.5) * 5)))
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getCongestionBadge = (level: number) => {
    if (level < 30) return <Badge className="bg-green-500">Low</Badge>;
    if (level < 70) return <Badge className="bg-yellow-500">Medium</Badge>;
    return <Badge variant="destructive">High</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5" />
          <span>Traffic Statistics</span>
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
