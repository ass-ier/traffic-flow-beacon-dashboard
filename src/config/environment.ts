// Environment configuration
interface Config {
  // API Configuration
  apiBaseUrl: string;
  websocketUrl: string;
  
  // Map Configuration
  mapConfig: {
    defaultZoom: number;
    defaultCenter: {
      lat: number;
      lng: number;
    };
    tileUrl: string;
    attribution: string;
  };
  
  // Development Settings
  isDevelopment: boolean;
  isProduction: boolean;
  debugLogging: boolean;
  mockDataMode: boolean;
  
  // Performance Settings
  updateInterval: number;
  maxVehiclesDisplay: number;
  websocketReconnectInterval: number;
  
  // Feature Flags
  features: {
    emergencyVehicles: boolean;
    trafficLightControl: boolean;
    analytics: boolean;
    realTimeUpdates: boolean;
  };
}

const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = import.meta.env[key];
  if (value === undefined && defaultValue === undefined) {
    console.warn(`Environment variable ${key} is not defined and no default provided`);
  }
  return value ?? defaultValue ?? '';
};

const getBooleanEnvVar = (key: string, defaultValue: boolean = false): boolean => {
  const value = getEnvVar(key);
  if (!value) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
};

const getNumberEnvVar = (key: string, defaultValue: number): number => {
  const value = getEnvVar(key);
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
};

const getFloatEnvVar = (key: string, defaultValue: number): number => {
  const value = getEnvVar(key);
  if (!value) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

// Create the configuration object
export const config: Config = {
  // API Configuration
  apiBaseUrl: getEnvVar('VITE_API_BASE_URL', 'http://localhost:3001/api'),
  websocketUrl: getEnvVar('VITE_WEBSOCKET_URL', 'ws://localhost:3001/ws'),
  
  // Map Configuration
  mapConfig: {
    defaultZoom: getNumberEnvVar('VITE_MAP_DEFAULT_ZOOM', 13),
    defaultCenter: {
      lat: getFloatEnvVar('VITE_MAP_DEFAULT_LAT', 9.0331), // Addis Ababa
      lng: getFloatEnvVar('VITE_MAP_DEFAULT_LNG', 38.7500),
    },
    tileUrl: getEnvVar('VITE_MAP_TILE_URL', 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'),
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  },
  
  // Development Settings
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
  debugLogging: getBooleanEnvVar('VITE_ENABLE_DEBUG_LOGGING', import.meta.env.DEV),
  mockDataMode: getBooleanEnvVar('VITE_MOCK_DATA_MODE', false),
  
  // Performance Settings
  updateInterval: getNumberEnvVar('VITE_UPDATE_INTERVAL_MS', 1000),
  maxVehiclesDisplay: getNumberEnvVar('VITE_MAX_VEHICLES_DISPLAY', 500),
  websocketReconnectInterval: getNumberEnvVar('VITE_WEBSOCKET_RECONNECT_INTERVAL', 5000),
  
  // Feature Flags
  features: {
    emergencyVehicles: getBooleanEnvVar('VITE_ENABLE_EMERGENCY_VEHICLES', true),
    trafficLightControl: getBooleanEnvVar('VITE_ENABLE_TRAFFIC_LIGHT_CONTROL', true),
    analytics: getBooleanEnvVar('VITE_ENABLE_ANALYTICS', true),
    realTimeUpdates: true, // Always enabled for this app
  },
};

// Validation function
export const validateConfig = (): string[] => {
  const errors: string[] = [];
  
  if (!config.apiBaseUrl) {
    errors.push('API base URL is not configured');
  }
  
  if (!config.websocketUrl) {
    errors.push('WebSocket URL is not configured');
  }
  
  if (config.mapConfig.defaultCenter.lat < -90 || config.mapConfig.defaultCenter.lat > 90) {
    errors.push('Invalid map center latitude');
  }
  
  if (config.mapConfig.defaultCenter.lng < -180 || config.mapConfig.defaultCenter.lng > 180) {
    errors.push('Invalid map center longitude');
  }
  
  if (config.updateInterval < 100 || config.updateInterval > 10000) {
    errors.push('Update interval should be between 100ms and 10000ms');
  }
  
  return errors;
};

// Initialize configuration
const configErrors = validateConfig();
if (configErrors.length > 0) {
  console.error('Configuration errors:', configErrors);
  if (config.isProduction) {
    throw new Error(`Configuration validation failed: ${configErrors.join(', ')}`);
  }
}

// Log configuration in development
if (config.debugLogging) {
  console.log('Application configuration:', {
    ...config,
    // Don't log sensitive information
    apiBaseUrl: config.apiBaseUrl.replace(/\/\/.+@/, '//***@'),
  });
}

export default config;
