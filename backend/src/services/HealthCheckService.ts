import { Logger } from '../utils/Logger.js';
import { ConfigManager } from '../config/ConfigManager.js';
import { SUMOService } from './SUMOService.js';
import { WebSocketService } from './WebSocketService.js';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  uptime: number;
  services: {
    sumo: ServiceHealthStatus;
    websocket: ServiceHealthStatus;
    pythonBridge: ServiceHealthStatus;
  };
  metrics: {
    memory: {
      used: number;
      free: number;
      total: number;
      percentage: number;
    };
    connections: {
      websocket: number;
      maxWebSocket: number;
    };
    errors: {
      total: number;
      recent: number;
      byType: Record<string, number>;
    };
  };
  version: string;
  environment: string;
}

export interface ServiceHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  connected: boolean;
  lastCheck: number;
  responseTime?: number;
  errorCount: number;
  message?: string;
}

const logger = new Logger('HealthCheckService');

export class HealthCheckService {
  private static instance: HealthCheckService;
  private startTime: number;
  private healthCheckInterval?: NodeJS.Timeout;
  private configManager: ConfigManager;
  private sumoService?: SUMOService;
  private wsService?: WebSocketService;

  private constructor(configManager: ConfigManager) {
    this.configManager = configManager;
    this.startTime = Date.now();
  }

  public static getInstance(configManager: ConfigManager): HealthCheckService {
    if (!HealthCheckService.instance) {
      HealthCheckService.instance = new HealthCheckService(configManager);
    }
    return HealthCheckService.instance;
  }

  public setServices(sumoService: SUMOService, wsService: WebSocketService): void {
    this.sumoService = sumoService;
    this.wsService = wsService;
  }

  public startHealthChecks(): void {
    const interval = parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000');
    
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck().catch(error => {
        logger.error('Health check failed:', error);
      });
    }, interval);

    logger.info(`Health checks started with ${interval}ms interval`);
  }

  public stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      logger.info('Health checks stopped');
    }
  }

  public async getHealthStatus(): Promise<HealthStatus> {
    const timestamp = Date.now();
    const uptime = timestamp - this.startTime;

    // Check service statuses
    const sumoHealth = await this.checkSUMOHealth();
    const websocketHealth = await this.checkWebSocketHealth();
    const pythonBridgeHealth = await this.checkPythonBridgeHealth();

    // Calculate overall status
    const services = [sumoHealth, websocketHealth, pythonBridgeHealth];
    const overallStatus = this.calculateOverallStatus(services);

    // Get system metrics
    const memoryMetrics = this.getMemoryMetrics();
    const connectionMetrics = this.getConnectionMetrics();
    const errorMetrics = this.getErrorMetrics();

    return {
      status: overallStatus,
      timestamp,
      uptime,
      services: {
        sumo: sumoHealth,
        websocket: websocketHealth,
        pythonBridge: pythonBridgeHealth,
      },
      metrics: {
        memory: memoryMetrics,
        connections: connectionMetrics,
        errors: errorMetrics,
      },
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  private async checkSUMOHealth(): Promise<ServiceHealthStatus> {
    const startTime = Date.now();
    
    try {
      const isConnected = this.sumoService?.isConnected() || false;
      const stats = this.sumoService?.getProcessingStats();
      const responseTime = Date.now() - startTime;

      return {
        status: isConnected ? 'healthy' : 'unhealthy',
        connected: isConnected,
        lastCheck: Date.now(),
        responseTime,
        errorCount: stats?.errorCount || 0,
        message: isConnected ? 'SUMO service operational' : 'SUMO service not connected'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        lastCheck: Date.now(),
        responseTime: Date.now() - startTime,
        errorCount: 1,
        message: `SUMO health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async checkWebSocketHealth(): Promise<ServiceHealthStatus> {
    const startTime = Date.now();
    
    try {
      const connectedClients = this.wsService?.getConnectedClientsCount() || 0;
      const stats = this.wsService?.getServerStats();
      const responseTime = Date.now() - startTime;

      const isHealthy = stats?.running === true;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        connected: isHealthy,
        lastCheck: Date.now(),
        responseTime,
        errorCount: stats?.errorCount || 0,
        message: `WebSocket server operational with ${connectedClients} clients`
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        lastCheck: Date.now(),
        responseTime: Date.now() - startTime,
        errorCount: 1,
        message: `WebSocket health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async checkPythonBridgeHealth(): Promise<ServiceHealthStatus> {
    const startTime = Date.now();
    
    try {
      const bridgeHost = process.env.PYTHON_BRIDGE_HOST || 'localhost';
      const bridgePort = process.env.PYTHON_BRIDGE_PORT || '8814';
      
      // Simple HTTP check to Python bridge health endpoint
      const response = await fetch(`http://${bridgeHost}:${bridgePort}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      const responseTime = Date.now() - startTime;
      const isHealthy = response.ok;
      
      let data: any = {};
      try {
        data = await response.json();
      } catch (parseError) {
        // Ignore JSON parse errors
      }

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        connected: data.connected || false,
        lastCheck: Date.now(),
        responseTime,
        errorCount: 0,
        message: isHealthy 
          ? `Python bridge operational${data.connected ? ' and connected to SUMO' : ''}` 
          : 'Python bridge not responding'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        lastCheck: Date.now(),
        responseTime: Date.now() - startTime,
        errorCount: 1,
        message: `Python bridge health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private calculateOverallStatus(services: ServiceHealthStatus[]): 'healthy' | 'degraded' | 'unhealthy' {
    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;

    if (unhealthyCount >= 2) {
      return 'unhealthy';
    } else if (unhealthyCount >= 1 || degradedCount >= 2) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  private getMemoryMetrics() {
    const memoryUsage = process.memoryUsage();
    const totalMemory = memoryUsage.heapTotal;
    const usedMemory = memoryUsage.heapUsed;
    const freeMemory = totalMemory - usedMemory;
    const percentage = (usedMemory / totalMemory) * 100;

    return {
      used: Math.round(usedMemory / 1024 / 1024), // MB
      free: Math.round(freeMemory / 1024 / 1024), // MB
      total: Math.round(totalMemory / 1024 / 1024), // MB
      percentage: Math.round(percentage * 100) / 100
    };
  }

  private getConnectionMetrics() {
    const websocketConnections = this.wsService?.getConnectedClientsCount() || 0;
    const maxWebSocketConnections = parseInt(process.env.WEBSOCKET_MAX_CONNECTIONS || '100');

    return {
      websocket: websocketConnections,
      maxWebSocket: maxWebSocketConnections
    };
  }

  private getErrorMetrics() {
    // This would integrate with ErrorHandler to get error statistics
    return {
      total: 0,
      recent: 0,
      byType: {}
    };
  }

  private async performHealthCheck(): Promise<void> {
    const health = await this.getHealthStatus();
    
    // Log degraded or unhealthy status
    if (health.status !== 'healthy') {
      logger.warn('System health degraded:', {
        status: health.status,
        services: health.services,
        metrics: health.metrics
      });
    }

    // You could implement alerts here based on health status
    if (health.status === 'unhealthy') {
      this.handleUnhealthyStatus(health);
    }
  }

  private handleUnhealthyStatus(health: HealthStatus): void {
    // Implement alerting logic here
    logger.error('System is unhealthy:', {
      status: health.status,
      failedServices: Object.entries(health.services)
        .filter(([, service]) => service.status === 'unhealthy')
        .map(([name]) => name)
    });
  }
}
