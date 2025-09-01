import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { sumoDataService, ConnectionStatus } from "../services/SUMODataService";
import {
  pythonBridgeLauncher,
  BridgeProcessStatus,
} from "../services/pythonBridgeLauncher";

interface SUMOContextType {
  connectionStatus: ConnectionStatus;
  bridgeStatus: BridgeProcessStatus;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
  isBridgeRunning: boolean;
  setDataFilters: (filters: any) => void;
  clearDataFilters: () => void;
}

const SUMOContext = createContext<SUMOContextType | undefined>(undefined);

interface SUMOProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
  serverUrl?: string;
}

export const SUMOProvider: React.FC<SUMOProviderProps> = ({
  children,
  autoConnect = true,
  serverUrl,
}) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: false,
    lastUpdate: 0,
    latency: 0,
    reconnectAttempts: 0,
  });

  const [bridgeStatus, setBridgeStatus] = useState<BridgeProcessStatus>({
    running: false,
    port: 8814,
  });

  useEffect(() => {
    // Subscribe to connection status updates
    const unsubscribe =
      sumoDataService.subscribeToConnection(setConnectionStatus);

    // Subscribe to bridge status updates
    const unsubscribeBridge =
      pythonBridgeLauncher.subscribeToStatusUpdates(setBridgeStatus);

    // Initialize services
    const initializeServices = async () => {
      try {
        console.log("Initializing services...");

        // Check for Python bridge availability
        const bridgeAvailable = await pythonBridgeLauncher.autoStart();

        if (bridgeAvailable && autoConnect) {
          console.log("Python bridge found, attempting SUMO connection...");
          try {
            await connect();
          } catch (error) {
            console.error("SUMO connection failed:", error);
          }
        } else {
          console.log(
            "Python bridge not available. Start both services with: npm run dev:full"
          );
        }
      } catch (error) {
        console.error("Service initialization failed:", error);
      }
    };

    initializeServices();

    return () => {
      unsubscribe();
      unsubscribeBridge();
      sumoDataService.disconnect();
    };
  }, [autoConnect]);

  const connect = async (): Promise<void> => {
    try {
      await sumoDataService.connect();
    } catch (error) {
      console.error("Connection failed:", error);
      throw error;
    }
  };

  const disconnect = (): void => {
    sumoDataService.disconnect();
  };

  const setDataFilters = (filters: any): void => {
    sumoDataService.setDataFilters(filters);
  };

  const clearDataFilters = (): void => {
    sumoDataService.clearDataFilters();
  };

  const contextValue: SUMOContextType = {
    connectionStatus,
    bridgeStatus,
    connect,
    disconnect,
    isConnected: connectionStatus.connected,
    isBridgeRunning: bridgeStatus.running,
    setDataFilters,
    clearDataFilters,
  };

  return (
    <SUMOContext.Provider value={contextValue}>{children}</SUMOContext.Provider>
  );
};

export function useSUMOContext(): SUMOContextType {
  const context = useContext(SUMOContext);
  if (context === undefined) {
    throw new Error("useSUMOContext must be used within a SUMOProvider");
  }
  return context;
}
