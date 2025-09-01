/**
 * Professional Configuration Management System
 * Provides type-safe, validated, and secure configuration management
 */

import { z } from 'zod';
import { Logger } from '../utils/Logger.js';
import * as fs from 'fs';
import * as path from 'path';

const logger = new Logger('ConfigManager');

// Enhanced Configuration Schemas
const ServerConfigSchema = z.object({
  port: z.number().int().min(1).max(65535).default(3001),
  host: z.string().default('localhost'),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  corsOrigins: z.array(z.string()).default(['http://localhost:3000', 'http://localhost:5173']),
  enableHttps: z.boolean().default(false),
  requestTimeout: z.number().default(30000)
});

const SUMOConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().int().min(1).max(65535).default(8813),
  updateInterval: z.number().int().min(100).default(1000),
  reconnectInterval: z.number().int().min(1000).default(5000),
  maxReconnectAttempts: z.number().int().min(1).default(10),
  timeout: z.number().int().min(1000).default(10000),
  enableMockData: z.boolean().default(true)
});

const PerformanceConfigSchema = z.object({
  maxVehiclesDisplayed: z.number().int().min(1).default(1000),
  updateThrottleMs: z.number().int().min(50).default(100),
  enableCaching: z.boolean().default(true),
  cacheSize: z.number().int().min(1).default(1000),
  maxConcurrentRequests: z.number().int().min(1).default(100)
});

const WebSocketConfigSchema = z.object({
  port: z.number().int().min(1).max(65535).optional(),
  pingInterval: z.number().int().min(1000).default(30000),
  maxConnections: z.number().int().min(1).default(1000),
  messageQueueSize: z.number().int().min(1).default(1000)
});

const SecurityConfigSchema = z.object({
  enableRateLimit: z.boolean().default(true),
  rateLimitWindow: z.number().int().min(1000).default(900000),
  rateLimitMax: z.number().int().min(1).default(100),
  enableInputValidation: z.boolean().default(true),
  jwtSecret: z.string().optional(),
  apiKey: z.string().optional()
});

const AppConfigSchema = z.object({
  environment: z.enum(['development', 'production', 'test']).default('development'),
  server: ServerConfigSchema,
  sumo: SUMOConfigSchema,
  performance: PerformanceConfigSchema,
  websocket: WebSocketConfigSchema,
  security: SecurityConfigSchema,
  features: z.object({
    enableMetrics: z.boolean().default(true),
    enableHealthChecks: z.boolean().default(true),
    enableDebugMode: z.boolean().default(false),
    enableRealTimeUpdates: z.boolean().default(true),
    enableDataPersistence: z.boolean().default(false),
    enableAdvancedAnalytics: z.boolean().default(false),
    enableNotifications: z.boolean().default(true),
    enableExport: z.boolean().default(true)
  })
});

export type AppConfig = z.infer<typeof AppConfigSchema>;
export type ServerConfig = z.infer<typeof ServerConfigSchema>;
export type SUMOConnectionConfig = z.infer<typeof SUMOConfigSchema>;
export type PerformanceConfig = z.infer<typeof PerformanceConfigSchema>;
export type WebSocketConfig = z.infer<typeof WebSocketConfigSchema>;
export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;

export class ConfigManager {
  private config: AppConfig;
  private configFilePath?: string;
  private watchers: Map<string, fs.FSWatcher> = new Map();
  private listeners: Set<(config: AppConfig) => void> = new Set();

  constructor(configFilePath?: string) {
    this.configFilePath = configFilePath;
    this.config = this.loadConfiguration();
    this.validateConfiguration();
    this.setupConfigWatching();
    
    logger.info('Configuration manager initialized', {
      environment: this.config.environment,
      configFile: configFilePath
    });
  }

  private loadConfiguration(): AppConfig {
    let fileConfig = {};
    
    // Load from file if provided
    if (this.configFilePath && fs.existsSync(this.configFilePath)) {
      try {
        const configContent = fs.readFileSync(this.configFilePath, 'utf-8');
        fileConfig = JSON.parse(configContent);
        logger.info('Configuration file loaded', { path: this.configFilePath });
      } catch (error) {
        logger.warn('Failed to load configuration file', {
          path: this.configFilePath,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    // Load from environment
    const envConfig = this.loadFromEnvironment();
    
    // Merge configurations
    const mergedConfig = this.mergeConfigurations(fileConfig, envConfig);
    
    try {
      return AppConfigSchema.parse(mergedConfig);
    } catch (error) {
      logger.error('Configuration validation failed', { error });
      throw new Error(`Invalid configuration: ${error}`);
    }
  }

  private loadFromEnvironment(): Partial<AppConfig> {
    const env = process.env;
    
    return {
      environment: (env.NODE_ENV as any) || 'development',
      server: {
        port: env.SERVER_PORT ? parseInt(env.SERVER_PORT) : 3001,
        host: env.HOST || 'localhost',
        logLevel: (env.LOG_LEVEL as any) || 'info',
        corsOrigins: env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',') : ['http://localhost:8080', 'http://localhost:5173'],
        enableHttps: env.ENABLE_HTTPS === 'true',
        requestTimeout: env.REQUEST_TIMEOUT ? parseInt(env.REQUEST_TIMEOUT) : 30000
      },
      sumo: {
        host: env.SUMO_HOST || 'localhost',
        port: env.SUMO_PORT ? parseInt(env.SUMO_PORT) : 8813,
        updateInterval: env.SUMO_UPDATE_INTERVAL ? parseInt(env.SUMO_UPDATE_INTERVAL) : 1000,
        reconnectInterval: env.SUMO_RECONNECT_INTERVAL ? parseInt(env.SUMO_RECONNECT_INTERVAL) : 5000,
        maxReconnectAttempts: env.SUMO_MAX_RECONNECT_ATTEMPTS ? parseInt(env.SUMO_MAX_RECONNECT_ATTEMPTS) : 5,
        timeout: env.SUMO_TIMEOUT ? parseInt(env.SUMO_TIMEOUT) : 10000,
        enableMockData: env.ENABLE_MOCK_DATA !== 'false'
      },
      performance: {
        maxVehiclesDisplayed: env.MAX_VEHICLES_TRACKED ? parseInt(env.MAX_VEHICLES_TRACKED) : 1000,
        updateThrottleMs: env.UPDATE_THROTTLE_MS ? parseInt(env.UPDATE_THROTTLE_MS) : 100,
        enableCaching: env.ENABLE_CACHING !== undefined ? env.ENABLE_CACHING === 'true' : true,
        cacheSize: env.CACHE_SIZE ? parseInt(env.CACHE_SIZE) : 1000,
        maxConcurrentRequests: env.MAX_CONCURRENT_REQUESTS ? parseInt(env.MAX_CONCURRENT_REQUESTS) : 10
      },
      security: {
        enableRateLimit: env.ENABLE_RATE_LIMIT !== undefined ? env.ENABLE_RATE_LIMIT === 'true' : true,
        rateLimitWindow: env.RATE_LIMIT_WINDOW_MS ? parseInt(env.RATE_LIMIT_WINDOW_MS) : 900000,
        rateLimitMax: env.RATE_LIMIT_MAX_REQUESTS ? parseInt(env.RATE_LIMIT_MAX_REQUESTS) : 100,
        enableInputValidation: env.ENABLE_INPUT_VALIDATION !== undefined ? env.ENABLE_INPUT_VALIDATION === 'true' : true,
        jwtSecret: env.JWT_SECRET,
        apiKey: env.API_KEY
      },
      websocket: {
        port: env.WEBSOCKET_PORT ? parseInt(env.WEBSOCKET_PORT) : 3002,
        pingInterval: env.WEBSOCKET_HEARTBEAT_INTERVAL ? parseInt(env.WEBSOCKET_HEARTBEAT_INTERVAL) : 30000,
        maxConnections: env.WEBSOCKET_MAX_CONNECTIONS ? parseInt(env.WEBSOCKET_MAX_CONNECTIONS) : 100,
        messageQueueSize: env.WEBSOCKET_MESSAGE_QUEUE_SIZE ? parseInt(env.WEBSOCKET_MESSAGE_QUEUE_SIZE) : 100
      },
      features: {
        enableMetrics: env.ENABLE_METRICS !== 'false',
        enableHealthChecks: env.ENABLE_HEALTH_CHECKS !== 'false',
        enableDebugMode: env.ENABLE_DEBUG_MODE === 'true',
        enableRealTimeUpdates: env.ENABLE_REAL_TIME_UPDATES !== 'false',
        enableDataPersistence: env.ENABLE_DATA_PERSISTENCE === 'true',
        enableAdvancedAnalytics: env.ENABLE_ADVANCED_ANALYTICS === 'true',
        enableNotifications: env.ENABLE_NOTIFICATIONS !== 'false',
        enableExport: env.ENABLE_EXPORT !== 'false'
      }
    };
  }

  private mergeConfigurations(...configs: any[]): any {
    return configs.reduce((merged, config) => {
      return { ...merged, ...config };
    }, {});
  }

  private validateConfiguration(): void {
    const issues: string[] = [];
    
    if (this.config.environment === 'production') {
      if (!this.config.security.jwtSecret) {
        issues.push('JWT secret is required in production');
      }
      if (this.config.server.logLevel === 'debug') {
        issues.push('Debug logging should be disabled in production');
      }
    }
    
    if (issues.length > 0) {
      logger.warn('Configuration validation issues', { issues });
      if (this.config.environment === 'production') {
        throw new Error(`Configuration validation failed: ${issues.join(', ')}`);
      }
    }
  }

  private setupConfigWatching(): void {
    if (!this.configFilePath || !fs.existsSync(this.configFilePath)) {
      return;
    }
    
    const watcher = fs.watch(this.configFilePath, (eventType) => {
      if (eventType === 'change') {
        logger.info('Configuration file changed, reloading...');
        this.reloadConfiguration();
      }
    });
    
    this.watchers.set('config', watcher);
  }

  public reloadConfiguration(): void {
    try {
      const newConfig = this.loadConfiguration();
      const oldConfig = this.config;
      this.config = newConfig;
      
      logger.info('Configuration reloaded successfully');
      this.notifyListeners();
    } catch (error) {
      logger.error('Failed to reload configuration', {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.config);
      } catch (error) {
        logger.error('Configuration listener failed', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    });
  }

  // Public API
  public getConfig(): AppConfig {
    return { ...this.config };
  }

  public getSUMOConfig(): SUMOConnectionConfig {
    return { ...this.config.sumo };
  }

  public getPerformanceConfig(): PerformanceConfig {
    return { ...this.config.performance };
  }

  public getServerConfig(): ServerConfig {
    return { ...this.config.server };
  }

  public getWebSocketConfig(): WebSocketConfig {
    return { ...this.config.websocket };
  }

  public getSecurityConfig(): SecurityConfig {
    return { ...this.config.security };
  }

  public isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.config.features[feature];
  }

  public getEnvironment(): string {
    return this.config.environment;
  }

  public isProduction(): boolean {
    return this.config.environment === 'production';
  }

  public isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  public updateConfig(updates: Partial<AppConfig>): void {
    if (this.isProduction()) {
      throw new Error('Runtime configuration updates not allowed in production');
    }
    
    const oldConfig = { ...this.config };
    this.config = AppConfigSchema.parse(
      this.mergeConfigurations(this.config, updates)
    );
    
    logger.info('Configuration updated at runtime', { updates });
    this.notifyListeners();
  }

  public updateSUMOConfig(updates: Partial<SUMOConnectionConfig>): void {
    const currentSumo = this.config.sumo;
    const mergedSumo = { ...currentSumo, ...updates };
    this.updateConfig({ sumo: mergedSumo });
  }

  public updatePerformanceConfig(updates: Partial<PerformanceConfig>): void {
    const currentPerformance = this.config.performance;
    const mergedPerformance = { ...currentPerformance, ...updates };
    this.updateConfig({ performance: mergedPerformance });
  }

  public onConfigurationChange(callback: (config: AppConfig) => void): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public cleanup(): void {
    for (const [name, watcher] of this.watchers) {
      try {
        watcher.close();
      } catch (error) {
        logger.warn('Failed to close config watcher', { name, error });
      }
    }
    
    this.watchers.clear();
    this.listeners.clear();
    logger.info('Configuration manager cleaned up');
  }
}