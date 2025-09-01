import { WebSocketServer, WebSocket } from 'ws';
import { Logger } from '../utils/Logger.js';
import { WebSocketConfig } from '../types/Configuration.js';
import { SimulationUpdate } from '../types/SUMOData.js';

const logger = new Logger('WebSocketService');

interface ClientSubscription {
  id: string;
  ws: WebSocket;
  subscriptions: Set<string>;
  lastPing: number;
  connectedAt: number;
  messageCount: number;
  dataFilters?: DataFilters;
  rateLimitTokens: number;
  lastTokenRefill: number;
}

interface DataFilters {
  vehicleTypes?: string[];
  speedRange?: { min: number; max: number };
  congestionLevels?: string[];
  emergencyOnly?: boolean;
  geoBounds?: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

interface BroadcastOptions {
  compress?: boolean;
  priority?: 'low' | 'normal' | 'high';
  throttle?: boolean;
}

interface MessageStats {
  totalSent: number;
  totalReceived: number;
  bytesTransferred: number;
  errorCount: number;
  lastActivity: number;
}

export class WebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, ClientSubscription> = new Map();
  private config: WebSocketConfig;
  private pingInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  private messageStats: MessageStats = {
    totalSent: 0,
    totalReceived: 0,
    bytesTransferred: 0,
    errorCount: 0,
    lastActivity: Date.now()
  };
  private messageQueue: Map<string, any[]> = new Map();
  private throttleTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(wss: WebSocketServer, config: WebSocketConfig) {
    this.wss = wss;
    this.config = config;
    this.setupWebSocketServer();
    this.startPingInterval();
    this.startCleanupInterval();
  }

  private setupWebSocketServer(): void {
    this.wss.on('connection', (ws: WebSocket, request) => {
      // Check connection limits
      if (this.clients.size >= this.config.maxConnections) {
        logger.warn('Max connections reached, rejecting new connection');
        ws.close(1013, 'Server overloaded');
        return;
      }

      const clientId = this.generateClientId();
      const clientInfo: ClientSubscription = {
        id: clientId,
        ws,
        subscriptions: new Set(),
        lastPing: Date.now(),
        connectedAt: Date.now(),
        messageCount: 0,
        rateLimitTokens: 100, // Initial tokens for rate limiting
        lastTokenRefill: Date.now()
      };

      // Auto-subscribe new clients to default data streams to ensure they receive updates
      const defaultSubscriptions = ['vehicles', 'intersections', 'roads', 'emergency-vehicles', 'simulation-update', 'traffic-metrics'];
      defaultSubscriptions.forEach((sub) => clientInfo.subscriptions.add(sub));

      this.clients.set(clientId, clientInfo);
      logger.info(`Client connected: ${clientId} from ${request.socket.remoteAddress} (${this.clients.size} total clients)`);

      // Send welcome message with enhanced capabilities
      this.sendToClient(clientId, 'connection-established', {
        clientId,
        timestamp: Date.now(),
        serverCapabilities: {
          compression: this.config.enableCompression,
          maxMessageSize: this.config.maxMessageSize,
          availableSubscriptions: [
            'vehicles',
            'intersections', 
            'roads',
            'emergency-vehicles',
            'traffic-metrics',
            'simulation-update',
            'sumo-connection-status'
          ],
          supportedFilters: [
            'vehicleTypes',
            'speedRange',
            'congestionLevels',
            'emergencyOnly',
            'geoBounds'
          ]
        }
      });

      // Inform client about active default subscriptions
      this.sendToClient(clientId, 'subscription-confirmed', {
        dataType: 'default',
        subscriptions: Array.from(clientInfo.subscriptions),
        timestamp: Date.now()
      });

      // Handle incoming messages
      ws.on('message', (data: Buffer) => {
        try {
          // Check message size limit
          if (data.length > this.config.maxMessageSize) {
            this.sendToClient(clientId, 'error', {
              message: 'Message too large',
              maxSize: this.config.maxMessageSize,
              timestamp: Date.now()
            });
            return;
          }

          // Rate limiting check
          if (!this.checkRateLimit(clientId)) {
            this.sendToClient(clientId, 'error', {
              message: 'Rate limit exceeded',
              timestamp: Date.now()
            });
            return;
          }

          const message = JSON.parse(data.toString());
          this.handleClientMessage(clientId, message);
          
          // Update stats
          this.messageStats.totalReceived++;
          this.messageStats.bytesTransferred += data.length;
          this.messageStats.lastActivity = Date.now();
          
          const client = this.clients.get(clientId);
          if (client) {
            client.messageCount++;
          }
          
        } catch (error) {
          this.messageStats.errorCount++;
          logger.error(`Invalid message from client ${clientId}:`, error);
          this.sendToClient(clientId, 'error', {
            message: 'Invalid message format',
            timestamp: Date.now()
          });
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.clients.delete(clientId);
        logger.info(`Client disconnected: ${clientId} (${this.clients.size} total clients)`);
      });

      // Handle WebSocket errors
      ws.on('error', (error) => {
        logger.error(`WebSocket error for client ${clientId}:`, error);
        this.clients.delete(clientId);
      });

      // Handle pong responses
      ws.on('pong', () => {
        const client = this.clients.get(clientId);
        if (client) {
          client.lastPing = Date.now();
        }
      });
    });

    this.wss.on('error', (error) => {
      logger.error('WebSocket server error:', error);
    });
  }

  private handleClientMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (message.type) {
      case 'subscribe':
        this.handleSubscription(clientId, message);
        break;

      case 'unsubscribe':
        this.handleUnsubscription(clientId, message);
        break;

      case 'set-filters':
        this.handleSetFilters(clientId, message);
        break;

      case 'clear-filters':
        this.handleClearFilters(clientId);
        break;

      case 'get-stats':
        this.handleGetStats(clientId);
        break;

      case 'ping':
        this.sendToClient(clientId, 'pong', { 
          timestamp: Date.now(),
          serverTime: Date.now()
        });
        break;

      case 'request-historical':
        this.handleHistoricalDataRequest(clientId, message);
        break;

      case 'sumo-command':
        this.handleSUMOCommand(clientId, message);
        break;

      default:
        logger.warn(`Unknown message type from client ${clientId}:`, message.type);
        this.sendToClient(clientId, 'error', {
          message: `Unknown message type: ${message.type}`,
          availableTypes: ['subscribe', 'unsubscribe', 'set-filters', 'clear-filters', 'get-stats', 'ping', 'request-historical'],
          timestamp: Date.now()
        });
    }
  }

  private handleSubscription(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (message.dataType && typeof message.dataType === 'string') {
      client.subscriptions.add(message.dataType);
      logger.debug(`Client ${clientId} subscribed to ${message.dataType}`);
      
      this.sendToClient(clientId, 'subscription-confirmed', {
        dataType: message.dataType,
        filters: client.dataFilters,
        timestamp: Date.now()
      });

      // Send initial data if available
      this.sendInitialData(clientId, message.dataType);
    } else {
      this.sendToClient(clientId, 'error', {
        message: 'Invalid subscription request: dataType is required',
        timestamp: Date.now()
      });
    }
  }

  private handleUnsubscription(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (message.dataType && typeof message.dataType === 'string') {
      client.subscriptions.delete(message.dataType);
      logger.debug(`Client ${clientId} unsubscribed from ${message.dataType}`);
      
      this.sendToClient(clientId, 'unsubscription-confirmed', {
        dataType: message.dataType,
        timestamp: Date.now()
      });
    }
  }

  private handleSetFilters(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    try {
      // Validate and set filters
      const filters: DataFilters = {};
      
      if (message.filters.vehicleTypes && Array.isArray(message.filters.vehicleTypes)) {
        filters.vehicleTypes = message.filters.vehicleTypes;
      }
      
      if (message.filters.speedRange && typeof message.filters.speedRange === 'object') {
        filters.speedRange = message.filters.speedRange;
      }
      
      if (message.filters.congestionLevels && Array.isArray(message.filters.congestionLevels)) {
        filters.congestionLevels = message.filters.congestionLevels;
      }
      
      if (typeof message.filters.emergencyOnly === 'boolean') {
        filters.emergencyOnly = message.filters.emergencyOnly;
      }
      
      if (message.filters.geoBounds && typeof message.filters.geoBounds === 'object') {
        filters.geoBounds = message.filters.geoBounds;
      }

      client.dataFilters = filters;
      
      this.sendToClient(clientId, 'filters-updated', {
        filters,
        timestamp: Date.now()
      });
      
      logger.debug(`Client ${clientId} updated filters:`, filters);
      
    } catch (error) {
      this.sendToClient(clientId, 'error', {
        message: 'Invalid filter configuration',
        timestamp: Date.now()
      });
    }
  }

  private handleClearFilters(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.dataFilters = undefined;
    
    this.sendToClient(clientId, 'filters-cleared', {
      timestamp: Date.now()
    });
    
    logger.debug(`Client ${clientId} cleared filters`);
  }

  private handleGetStats(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const clientStats = {
      clientId,
      connectedAt: client.connectedAt,
      messageCount: client.messageCount,
      subscriptions: Array.from(client.subscriptions),
      hasFilters: !!client.dataFilters,
      uptime: Date.now() - client.connectedAt
    };

    this.sendToClient(clientId, 'client-stats', {
      client: clientStats,
      server: this.getServerStats(),
      timestamp: Date.now()
    });
  }

  private handleHistoricalDataRequest(clientId: string, message: any): void {
    // Placeholder for historical data - would integrate with historical data service
    this.sendToClient(clientId, 'historical-data-response', {
      message: 'Historical data feature not yet implemented',
      requestId: message.requestId,
      timestamp: Date.now()
    });
  }

  private handleSUMOCommand(clientId: string, message: any): void {
    logger.info(`Received SUMO command from client ${clientId}:`, message.command);
    
    // Forward command to SUMO service if available
    // This would be injected via dependency injection in a real implementation
    this.sendToClient(clientId, 'command-response', {
      commandId: message.command?.timestamp,
      success: true,
      message: 'Command processed (demo mode)',
      timestamp: Date.now()
    });
  }

  public broadcast(eventType: string, data: any, options: BroadcastOptions = {}): void {
    const filteredClients = this.getSubscribedClients(eventType);
    
    if (filteredClients.length === 0) {
      return;
    }

    // Apply data filtering per client
    const clientMessages = new Map<string, any>();
    
    filteredClients.forEach(client => {
      let filteredData = data;
      
      // Apply client-specific filters
      if (client.dataFilters) {
        filteredData = this.applyDataFilters(data, client.dataFilters, eventType);
      }
      
      if (filteredData && (Array.isArray(filteredData) ? filteredData.length > 0 : true)) {
        clientMessages.set(client.id, filteredData);
      }
    });

    if (clientMessages.size === 0) {
      return;
    }

    // Handle throttling for high-frequency updates
    if (options.throttle && this.throttleTimers.has(eventType)) {
      return; // Skip this update due to throttling
    }

    let sentCount = 0;
    const timestamp = Date.now();

    clientMessages.forEach((filteredData, clientId) => {
      const client = this.clients.get(clientId);
      if (!client || client.ws.readyState !== WebSocket.OPEN) {
        return;
      }

      try {
        const message = JSON.stringify({
          type: eventType,
          data: filteredData,
          timestamp,
          compressed: options.compress || false
        });

        client.ws.send(message);
        sentCount++;
        
        // Update stats
        this.messageStats.totalSent++;
        this.messageStats.bytesTransferred += message.length;
        
      } catch (error) {
        this.messageStats.errorCount++;
        logger.error(`Failed to send message to client ${clientId}:`, error);
        this.removeClient(clientId);
      }
    });

    // Set up throttling timer if requested
    if (options.throttle) {
      this.throttleTimers.set(eventType, setTimeout(() => {
        this.throttleTimers.delete(eventType);
      }, 100)); // 100ms throttle
    }

    this.messageStats.lastActivity = timestamp;
    
    if (sentCount > 0) {
      logger.debug(`Broadcasted ${eventType} to ${sentCount}/${filteredClients.length} clients`);
    }
  }

  public broadcastToSubscribers(eventType: string, data: any, options: BroadcastOptions = {}): void {
    // Enhanced broadcast that only sends to explicitly subscribed clients
    this.broadcast(eventType, data, { ...options, throttle: true });
  }

  public broadcastSimulationUpdate(update: SimulationUpdate): void {
    // Broadcast different parts of the simulation update to appropriate subscribers
    if (update.vehicles) {
      this.broadcast('vehicles', update.vehicles, { throttle: true });
    }
    
    if (update.intersections) {
      this.broadcast('intersections', update.intersections, { throttle: true });
    }
    
    if (update.roads) {
      this.broadcast('roads', update.roads, { throttle: true });
    }
    
    if (update.emergencyVehicles) {
      this.broadcast('emergency-vehicles', update.emergencyVehicles, { priority: 'high' });
    }
    
    if (update.metrics) {
      this.broadcast('traffic-metrics', update.metrics);
    }
    
    // Send complete update to clients subscribed to 'simulation-update'
    this.broadcast('simulation-update', update, { compress: true });
  }

  public sendToClient(clientId: string, eventType: string, data: any): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = JSON.stringify({
      type: eventType,
      data,
      timestamp: Date.now()
    });

    try {
      client.ws.send(message);
      this.messageStats.totalSent++;
      this.messageStats.bytesTransferred += message.length;
      this.messageStats.lastActivity = Date.now();
    } catch (error) {
      this.messageStats.errorCount++;
      logger.error(`Failed to send message to client ${clientId}:`, error);
      this.removeClient(clientId);
    }
  }

  private getSubscribedClients(eventType: string): ClientSubscription[] {
    const subscribedClients: ClientSubscription[] = [];
    
    this.clients.forEach(client => {
      if (client.subscriptions.has(eventType) || eventType === 'sumo-connection-status') {
        if (client.ws.readyState === WebSocket.OPEN) {
          subscribedClients.push(client);
        }
      }
    });
    
    return subscribedClients;
  }

  private applyDataFilters(data: any, filters: DataFilters, eventType: string): any {
    if (!data || !filters) return data;

    try {
      switch (eventType) {
        case 'vehicles':
        case 'emergency-vehicles':
          return this.filterVehicleData(data, filters);
        
        case 'intersections':
          return this.filterIntersectionData(data, filters);
        
        case 'roads':
          return this.filterRoadData(data, filters);
        
        case 'simulation-update':
          return this.filterSimulationUpdate(data, filters);
        
        default:
          return data;
      }
    } catch (error) {
      logger.warn('Error applying data filters:', error);
      return data; // Return unfiltered data on error
    }
  }

  private filterVehicleData(vehicles: any[], filters: DataFilters): any[] {
    if (!Array.isArray(vehicles)) return vehicles;

    return vehicles.filter(vehicle => {
      // Filter by vehicle type
      if (filters.vehicleTypes && !filters.vehicleTypes.includes(vehicle.type)) {
        return false;
      }

      // Filter by speed range
      if (filters.speedRange) {
        if (vehicle.speed < filters.speedRange.min || vehicle.speed > filters.speedRange.max) {
          return false;
        }
      }

      // Filter by geographic bounds
      if (filters.geoBounds) {
        const pos = vehicle.position;
        if (pos.lat < filters.geoBounds.south || pos.lat > filters.geoBounds.north ||
            pos.lng < filters.geoBounds.west || pos.lng > filters.geoBounds.east) {
          return false;
        }
      }

      // Emergency vehicles only filter
      if (filters.emergencyOnly && vehicle.type !== 'emergency') {
        return false;
      }

      return true;
    });
  }

  private filterIntersectionData(intersections: any[], filters: DataFilters): any[] {
    if (!Array.isArray(intersections)) return intersections;

    return intersections.filter(intersection => {
      // Filter by congestion level
      if (filters.congestionLevels && !filters.congestionLevels.includes(intersection.congestionLevel)) {
        return false;
      }

      // Filter by geographic bounds
      if (filters.geoBounds) {
        const pos = intersection.position;
        if (pos.lat < filters.geoBounds.south || pos.lat > filters.geoBounds.north ||
            pos.lng < filters.geoBounds.west || pos.lng > filters.geoBounds.east) {
          return false;
        }
      }

      return true;
    });
  }

  private filterRoadData(roads: any[], filters: DataFilters): any[] {
    if (!Array.isArray(roads)) return roads;

    return roads.filter(road => {
      // Filter by congestion level
      if (filters.congestionLevels && !filters.congestionLevels.includes(road.congestionLevel)) {
        return false;
      }

      return true;
    });
  }

  private filterSimulationUpdate(update: any, filters: DataFilters): any {
    const filtered = { ...update };

    if (update.vehicles) {
      filtered.vehicles = this.filterVehicleData(update.vehicles, filters);
    }

    if (update.emergencyVehicles) {
      filtered.emergencyVehicles = this.filterVehicleData(update.emergencyVehicles, filters);
    }

    if (update.intersections) {
      filtered.intersections = this.filterIntersectionData(update.intersections, filters);
    }

    if (update.roads) {
      filtered.roads = this.filterRoadData(update.roads, filters);
    }

    return filtered;
  }

  private sendInitialData(clientId: string, dataType: string): void {
    // This would send any cached/initial data for the subscription
    // For now, just send a confirmation that subscription is active
    this.sendToClient(clientId, 'subscription-active', {
      dataType,
      message: `Subscription to ${dataType} is active. Data will be sent when available.`,
      timestamp: Date.now()
    });
  }

  private checkRateLimit(clientId: string): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    const now = Date.now();
    const timeSinceRefill = now - client.lastTokenRefill;
    
    // Refill tokens (1 token per 10ms, max 100 tokens)
    if (timeSinceRefill > 10) {
      const tokensToAdd = Math.floor(timeSinceRefill / 10);
      client.rateLimitTokens = Math.min(100, client.rateLimitTokens + tokensToAdd);
      client.lastTokenRefill = now;
    }

    // Check if client has tokens
    if (client.rateLimitTokens > 0) {
      client.rateLimitTokens--;
      return true;
    }

    return false;
  }

  private removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.close();
      }
      this.clients.delete(clientId);
      logger.info(`Client removed: ${clientId} (${this.clients.size} total clients)`);
    }
  }

  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  public getClientSubscriptions(clientId: string): string[] {
    const client = this.clients.get(clientId);
    return client ? Array.from(client.subscriptions) : [];
  }

  public getClientInfo(clientId: string): any {
    const client = this.clients.get(clientId);
    if (!client) return null;

    return {
      id: client.id,
      connectedAt: client.connectedAt,
      messageCount: client.messageCount,
      subscriptions: Array.from(client.subscriptions),
      hasFilters: !!client.dataFilters,
      rateLimitTokens: client.rateLimitTokens,
      uptime: Date.now() - client.connectedAt
    };
  }

  public getAllClientsInfo(): any[] {
    return Array.from(this.clients.values()).map(client => ({
      id: client.id,
      connectedAt: client.connectedAt,
      messageCount: client.messageCount,
      subscriptions: Array.from(client.subscriptions),
      hasFilters: !!client.dataFilters,
      uptime: Date.now() - client.connectedAt
    }));
  }

  public getServerStats(): any {
    return {
      connectedClients: this.clients.size,
      maxConnections: this.config.maxConnections,
      messageStats: { ...this.messageStats },
      uptime: Date.now() - this.messageStats.lastActivity,
      activeSubscriptions: this.getSubscriptionStats()
    };
  }

  private getSubscriptionStats(): Record<string, number> {
    const stats: Record<string, number> = {};
    
    this.clients.forEach(client => {
      client.subscriptions.forEach(subscription => {
        stats[subscription] = (stats[subscription] || 0) + 1;
      });
    });
    
    return stats;
  }

  public updateConfiguration(config: WebSocketConfig): void {
    this.config = config;
    logger.info('WebSocket configuration updated');
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      const now = Date.now();
      const staleClients: string[] = [];

      this.clients.forEach((client, clientId) => {
        const timeSinceLastPing = now - client.lastPing;
        
        if (timeSinceLastPing > this.config.pongTimeout) {
          staleClients.push(clientId);
        } else if (client.ws.readyState === WebSocket.OPEN) {
          try {
            client.ws.ping();
          } catch (error) {
            logger.error(`Failed to ping client ${clientId}:`, error);
            staleClients.push(clientId);
          }
        }
      });

      // Remove stale clients
      staleClients.forEach(clientId => {
        logger.info(`Removing stale client: ${clientId} (no pong for ${this.config.pongTimeout}ms)`);
        this.removeClient(clientId);
      });
      
      // Log connection stats periodically
      if (this.clients.size > 0) {
        logger.debug(`Active connections: ${this.clients.size}, Messages sent: ${this.messageStats.totalSent}, Errors: ${this.messageStats.errorCount}`);
      }
      
    }, this.config.pingInterval);
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      // Clean up old throttle timers
      this.throttleTimers.forEach((timer, eventType) => {
        // Timers clean themselves up, this is just for safety
      });
      
      // Clean up message queues if they get too large
      this.messageQueue.forEach((queue, clientId) => {
        if (queue.length > 100) {
          this.messageQueue.set(clientId, queue.slice(-50)); // Keep only last 50 messages
        }
      });
      
      // Reset rate limit tokens for all clients
      this.clients.forEach(client => {
        client.rateLimitTokens = Math.min(100, client.rateLimitTokens + 10);
      });
      
    }, 60000); // Run every minute
  }

  public close(): void {
    logger.info('Closing WebSocket service...');
    
    // Clear all intervals
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }
    
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    // Clear all throttle timers
    this.throttleTimers.forEach(timer => clearTimeout(timer));
    this.throttleTimers.clear();

    // Close all client connections gracefully
    this.clients.forEach((client, clientId) => {
      try {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.send(JSON.stringify({
            type: 'server-shutdown',
            message: 'Server is shutting down',
            timestamp: Date.now()
          }));
          client.ws.close(1001, 'Server shutdown');
        }
      } catch (error) {
        logger.warn(`Error closing client ${clientId}:`, error);
      }
    });

    // Clear all data structures
    this.clients.clear();
    this.messageQueue.clear();
    
    // Close WebSocket server
    this.wss.close(() => {
      logger.info('WebSocket server closed');
    });
    
    // Log final stats
    logger.info('Final WebSocket stats:', {
      totalMessagesSent: this.messageStats.totalSent,
      totalMessagesReceived: this.messageStats.totalReceived,
      totalBytesTransferred: this.messageStats.bytesTransferred,
      totalErrors: this.messageStats.errorCount
    });
  }
}