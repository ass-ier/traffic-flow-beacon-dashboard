import express from 'express';
import { WebSocketConfig } from './types/Configuration';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { SUMOService } from './services/SUMOService.js';
import { WebSocketService } from './services/WebSocketService.js';
import { ConfigManager } from './config/ConfigManager.js';
import { Logger } from './utils/Logger.js';
import { ErrorHandler } from './utils/ErrorHandler.js';
import { HealthCheckService } from './services/HealthCheckService.js';
import { pythonBridgeManager } from './services/PythonBridgeManager.js';
import { integratedSUMOBridge } from './services/IntegratedSUMOBridge.js';

// Load environment variables
dotenv.config();

const logger = new Logger('Server');

class TrafficBackendServer {
  private app: express.Application;
  private server: any;
  private wss!: WebSocketServer;
  private sumoService!: SUMOService;
  private wsService!: WebSocketService;
  private configManager: ConfigManager;

  constructor() {
    this.app = express();
    this.configManager = new ConfigManager();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupServer();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
          connectSrc: ["'self'", "ws:", "wss:"],
        },
      },
      crossOriginEmbedderPolicy: false
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later',
      standardHeaders: true,
      legacyHeaders: false,
    });
    this.app.use('/api', limiter);

    // CORS configuration
    const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:8080', 'http://localhost:5173'];
    this.app.use(cors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Compression
    this.app.use(compression());

    // Request logging
    if (process.env.ENABLE_ACCESS_LOGS === 'true') {
      this.app.use(morgan('combined', {
        skip: (req, res) => res.statusCode < 400 // Only log errors in production
      }));
    }

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Note: Error handling will be done at the route level
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        sumoConnected: this.sumoService?.isConnected() || false
      });
    });

    // Configuration endpoints
    this.app.get('/api/config', (req, res) => {
      res.json(this.configManager.getConfig());
    });

    this.app.post('/api/config', (req, res) => {
      try {
        this.configManager.updateConfig(req.body);
        res.json({ success: true, message: 'Configuration updated' });
      } catch (error) {
        res.status(400).json({ 
          success: false, 
          message: error instanceof Error ? error.message : 'Configuration update failed' 
        });
      }
    });

    // WebSocket monitoring endpoints
    this.app.get('/api/websocket/stats', (req, res) => {
      res.json(this.wsService.getServerStats());
    });

    this.app.get('/api/websocket/clients', (req, res) => {
      res.json({
        clients: this.wsService.getAllClientsInfo(),
        totalCount: this.wsService.getConnectedClientsCount()
      });
    });

    this.app.get('/api/websocket/client/:clientId', (req, res) => {
      const clientInfo = this.wsService.getClientInfo(req.params.clientId);
      if (clientInfo) {
        res.json(clientInfo);
      } else {
        res.status(404).json({ error: 'Client not found' });
      }
    });

    // SUMO connection management
    this.app.post('/api/sumo/connect', async (req, res) => {
      try {
        await this.sumoService.connect();
        res.json({ success: true, message: 'Connected to SUMO' });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          message: error instanceof Error ? error.message : 'Connection failed' 
        });
      }
    });

    this.app.post('/api/sumo/disconnect', async (req, res) => {
      try {
        await this.sumoService.disconnect();
        res.json({ success: true, message: 'Disconnected from SUMO' });
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          message: error instanceof Error ? error.message : 'Disconnection failed' 
        });
      }
    });

    this.app.get('/api/sumo/stats', (req, res) => {
      const stats = this.sumoService.getProcessingStats();
      res.json({
        connected: this.sumoService.isConnected(),
        processingStats: stats,
        timestamp: Date.now()
      });
    });

    // SUMO simulation management (proxy to Python bridge)
    this.app.post('/api/sumo/start', async (req, res) => {
      try {
        const { configPath = 'AddisAbaba_dense.sumocfg', useGui = true } = req.body;
        
        // First ensure Python bridge is available
        const bridgeHealth = await fetch('http://localhost:8814/health').catch(() => null);
        if (!bridgeHealth || !bridgeHealth.ok) {
          res.status(503).json({
            success: false,
            message: 'Python bridge service is not available. Please start the Python bridge service first.'
          });
          return;
        }

        // Proxy the start-sumo request to Python bridge
        const response = await fetch('http://localhost:8814/start-sumo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            config_path: configPath,
            gui: useGui
          })
        });

        const result = await response.json();
        
        if (result.status === 'success') {
          res.json({
            success: true,
            message: 'SUMO simulation started successfully',
            data: result.data
          });
        } else {
          res.status(500).json({
            success: false,
            message: result.message || 'Failed to start SUMO simulation'
          });
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Failed to start SUMO simulation'
        });
      }
    });

    this.app.post('/api/sumo/stop', async (req, res) => {
      try {
        // Proxy the stop-sumo request to Python bridge
        const response = await fetch('http://localhost:8814/stop-sumo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const result = await response.json();
        
        if (result.status === 'success') {
          res.json({
            success: true,
            message: 'SUMO simulation stopped successfully'
          });
        } else {
          res.status(500).json({
            success: false,
            message: result.message || 'Failed to stop SUMO simulation'
          });
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Failed to stop SUMO simulation'
        });
      }
    });

    this.app.get('/api/sumo/status', async (req, res) => {
      try {
        // Proxy the status request to Python bridge
        const response = await fetch('http://localhost:8814/status');
        const result = await response.json();
        
        if (result.status === 'success') {
          res.json({
            success: true,
            data: result.data
          });
        } else {
          res.status(500).json({
            success: false,
            message: result.message || 'Failed to get SUMO status'
          });
        }
      } catch (error) {
        res.status(500).json({
          success: false,
          message: error instanceof Error ? error.message : 'Failed to get SUMO status'
        });
      }
    });

    // Python Bridge management endpoints
    this.app.post('/api/start-python-bridge', async (req, res) => {
      try {
        const result = await pythonBridgeManager.startBridge();
        if (result.success) {
          res.json({ 
            success: true, 
            message: 'Python bridge started successfully',
            pid: result.pid
          });
        } else {
          res.status(500).json({ 
            success: false, 
            message: result.error || 'Failed to start Python bridge'
          });
        }
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          message: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    this.app.post('/api/stop-python-bridge', async (req, res) => {
      try {
        const result = await pythonBridgeManager.stopBridge();
        if (result.success) {
          res.json({ 
            success: true, 
            message: 'Python bridge stopped successfully'
          });
        } else {
          res.status(500).json({ 
            success: false, 
            message: result.error || 'Failed to stop Python bridge'
          });
        }
      } catch (error) {
        res.status(500).json({ 
          success: false, 
          message: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    });

    this.app.get('/api/python-bridge/status', (req, res) => {
      res.json({
        running: pythonBridgeManager.isRunning(),
        pid: pythonBridgeManager.getPid(),
        port: 8814,
        timestamp: Date.now()
      });
    });
  }

  private setupServer(): void {
    this.server = createServer(this.app);
    
    // Setup WebSocket server
    this.wss = new WebSocketServer({ 
      server: this.server,
      path: '/ws'
    });

    // Get WebSocket configuration from config manager
    const wsConfig = this.configManager.getConfig().websocket;
    
    // Create WebSocket service with complete configuration
    const wsConfigWithDefaults: WebSocketConfig = {
      path: '/ws',
      enableCompression: true,
      pingInterval: wsConfig.pingInterval ?? 30000,
      pongTimeout: 5000,
      maxConnections: wsConfig.maxConnections ?? 100,
      maxMessageSize: 1048576, // 1MB
      port: wsConfig.port
    };
    
    this.wsService = new WebSocketService(this.wss, wsConfigWithDefaults);

    // Initialize services
    this.sumoService = new SUMOService(this.configManager, this.wsService);
    
    // Setup integrated SUMO bridge event handlers
    integratedSUMOBridge.on('vehicles', (vehicles) => {
      this.wsService.broadcastToSubscribers('vehicles', vehicles);
    });
    
    integratedSUMOBridge.on('intersections', (intersections) => {
      this.wsService.broadcastToSubscribers('intersections', intersections);
    });
    
    integratedSUMOBridge.on('roads', (roads) => {
      this.wsService.broadcastToSubscribers('roads', roads);
    });
    
    integratedSUMOBridge.on('emergency-vehicles', (emergencyVehicles) => {
      this.wsService.broadcastToSubscribers('emergency-vehicles', emergencyVehicles);
    });
    
    integratedSUMOBridge.on('simulation-update', (update) => {
      this.wsService.broadcastToSubscribers('simulation-update', update);
    });
    
    integratedSUMOBridge.on('data-update', (data) => {
      this.wsService.broadcastToSubscribers('simulation-update', data);
    });
  }

  public async start(): Promise<void> {
    const port = process.env.SERVER_PORT || 3001;
    
    return new Promise((resolve, reject) => {
      this.server.listen(port, async () => {
        logger.info(`Server running on port ${port}`);
        logger.info(`WebSocket server available at ws://localhost:${port}/ws`);
        
        // Start the integrated SUMO bridge for real-time data
        try {
          await integratedSUMOBridge.start();
          logger.info('Integrated SUMO bridge started successfully');
        } catch (err) {
          logger.warn('Failed to start integrated SUMO bridge:', err);
        }
        
        // Attempt to connect to SUMO (via Python bridge) on startup
        try {
          await this.sumoService.connect();
          logger.info('SUMO service connected on startup');
        } catch (err) {
          logger.warn('SUMO service failed to connect on startup, will use mock data until available');
        }
        
        resolve();
      });

      this.server.on('error', (error: Error) => {
        logger.error('Server startup error:', error);
        reject(error);
      });
    });
  }

  public async stop(): Promise<void> {
    logger.info('Shutting down server...');
    
    // Stop the integrated bridge
    integratedSUMOBridge.stop();
    
    if (this.sumoService) {
      await this.sumoService.disconnect();
    }
    
    if (this.wsService) {
      this.wsService.close();
    }
    
    if (this.server) {
      this.server.close();
    }
    
    logger.info('Server shutdown complete');
  }
}

// Start server
const server = new TrafficBackendServer();

server.start().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  await server.stop();
  process.exit(0);
});

export default server;