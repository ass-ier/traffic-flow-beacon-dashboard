
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { FileText, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface LogEntry {
  id: number;
  timestamp: string;
  type: 'info' | 'warning' | 'success' | 'error';
  message: string;
  source: string;
}

export const SystemLog = () => {
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: 1,
      timestamp: new Date().toLocaleTimeString(),
      type: 'success',
      message: 'Traffic simulation initialized successfully',
      source: 'SYSTEM'
    },
    {
      id: 2,
      timestamp: new Date(Date.now() - 30000).toLocaleTimeString(),
      type: 'info',
      message: 'Load-aware mode activated',
      source: 'AI_CONTROLLER'
    },
    {
      id: 3,
      timestamp: new Date(Date.now() - 60000).toLocaleTimeString(),
      type: 'warning',
      message: 'High congestion detected at Intersection 3',
      source: 'TRAFFIC_MONITOR'
    }
  ]);

  // Simulate real-time log entries
  useEffect(() => {
    const interval = setInterval(() => {
      const messages = [
        'Traffic light phase changed at Intersection 1',
        'Vehicle queue cleared at Intersection 2',
        'Emergency override requested for Intersection 4',
        'System optimization completed',
        'Congestion level decreased on Main Street',
        'Load balancing algorithm triggered',
        'Traffic flow normalized',
        'Manual override detected'
      ];

      const types: LogEntry['type'][] = ['info', 'success', 'warning'];
      const sources = ['SYSTEM', 'AI_CONTROLLER', 'TRAFFIC_MONITOR', 'USER'];

      const newLog: LogEntry = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        type: types[Math.floor(Math.random() * types.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
        source: sources[Math.floor(Math.random() * sources.length)]
      };

      setLogs(prev => [newLog, ...prev.slice(0, 19)]); // Keep last 20 logs
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getLogBadge = (source: string) => {
    const variants = {
      'SYSTEM': 'default',
      'AI_CONTROLLER': 'secondary',
      'TRAFFIC_MONITOR': 'outline',
      'USER': 'destructive'
    } as const;

    return (
      <Badge variant={variants[source as keyof typeof variants] || 'default'} className="text-xs">
        {source}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>System Log</span>
          <Badge variant="outline" className="ml-auto">
            {logs.length} entries
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="border-l-2 border-gray-200 pl-3 pb-3">
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    {getLogIcon(log.type)}
                    <span className="text-xs text-muted-foreground font-mono">
                      {log.timestamp}
                    </span>
                  </div>
                  {getLogBadge(log.source)}
                </div>
                <p className="text-sm">{log.message}</p>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
