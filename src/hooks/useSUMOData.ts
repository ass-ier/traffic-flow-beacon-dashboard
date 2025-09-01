import { useState, useEffect, useCallback } from 'react';
import { sumoDataService, VehicleData, IntersectionData, RoadData, EmergencyVehicleData, ConnectionStatus } from '../services/SUMODataService';

// Hook for vehicle data
export const useSUMOVehicles = () => {
  const [vehicles, setVehicles] = useState<VehicleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = sumoDataService.subscribeToVehicles((data) => {
      console.log('Vehicles received in hook:', data);
      setVehicles(data);
      setLoading(false);
      setError(null);
    });

    return unsubscribe;
  }, []);

  return { vehicles, loading, error };
};

// Hook for intersection data
export const useSUMOIntersections = () => {
  const [intersections, setIntersections] = useState<IntersectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = sumoDataService.subscribeToIntersections((data) => {
      console.log('Intersections received in hook:', data);
      setIntersections(data);
      setLoading(false);
      setError(null);
    });

    return unsubscribe;
  }, []);

  return { intersections, loading, error };
};

// Hook for road data
export const useSUMORoads = () => {
  const [roads, setRoads] = useState<RoadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = sumoDataService.subscribeToRoads((data) => {
      setRoads(data);
      setLoading(false);
      setError(null);
    });

    return unsubscribe;
  }, []);

  return { roads, loading, error };
};

// Hook for emergency vehicles
export const useSUMOEmergencyVehicles = () => {
  const [emergencyVehicles, setEmergencyVehicles] = useState<EmergencyVehicleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = sumoDataService.subscribeToEmergencyVehicles((data) => {
      setEmergencyVehicles(data);
      setLoading(false);
      setError(null);
    });

    return unsubscribe;
  }, []);

  return { emergencyVehicles, loading, error };
};

// Hook for connection status
export const useSUMOConnection = () => {
  const [status, setStatus] = useState<ConnectionStatus>({
    connected: false,
    lastUpdate: 0,
    latency: 0,
    reconnectAttempts: 0
  });

  useEffect(() => {
    const unsubscribe = sumoDataService.subscribeToConnection(setStatus);
    return unsubscribe;
  }, []);

  const connect = useCallback(async () => {
    try {
      await sumoDataService.connect();
    } catch (error) {
      console.error('Connection failed:', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    sumoDataService.disconnect();
  }, []);

  return {
    status,
    connect,
    disconnect,
    isConnected: status.connected
  };
};

// Combined hook for all SUMO data
export const useSUMOData = () => {
  const vehicles = useSUMOVehicles();
  const intersections = useSUMOIntersections();
  const roads = useSUMORoads();
  const emergencyVehicles = useSUMOEmergencyVehicles();
  const connection = useSUMOConnection();

  const loading = vehicles.loading || intersections.loading || roads.loading || emergencyVehicles.loading;
  const error = vehicles.error || intersections.error || roads.error || emergencyVehicles.error;

  return {
    vehicles: vehicles.vehicles,
    intersections: intersections.intersections,
    roads: roads.roads,
    emergencyVehicles: emergencyVehicles.emergencyVehicles,
    connection,
    loading,
    error
  };
};