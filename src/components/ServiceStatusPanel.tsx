import React, { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, XCircle, Loader } from "lucide-react";
import { useSUMOContext } from "../contexts/SUMOContext";

interface ServiceStatus {
  name: string;
  status: "checking" | "online" | "offline";
  description: string;
  error?: string;
}

const ServiceStatusPanel: React.FC = () => {
  const { bridgeStatus } = useSUMOContext();
  const [backendStatus, setBackendStatus] = useState<
    "checking" | "online" | "offline"
  >("checking");

  const checkBackendStatus = async (): Promise<"online" | "offline"> => {
    try {
      const response = await fetch("http://localhost:3001/health", {
        method: "GET",
        timeout: 5000,
      } as RequestInit);
      return response.ok ? "online" : "offline";
    } catch (error) {
      return "offline";
    }
  };

  useEffect(() => {
    // Check backend status
    checkBackendStatus().then(setBackendStatus);
    const interval = setInterval(() => {
      checkBackendStatus().then(setBackendStatus);
    }, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const refreshServices = () => {
    checkBackendStatus().then(setBackendStatus);
  };

  const services = [
    {
      name: "Python Bridge",
      status: bridgeStatus.running ? "online" : "offline",
      description: "SUMO TraCI Integration Service",
      error: bridgeStatus.error,
    },
    {
      name: "Backend API",
      status: backendStatus,
      description: "Main Backend Server",
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "offline":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "checking":
        return <Loader className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "text-green-600 bg-green-50 border-green-200";
      case "offline":
        return "text-red-600 bg-red-50 border-red-200";
      case "checking":
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-yellow-600 bg-yellow-50 border-yellow-200";
    }
  };

  const allServicesOnline = services.every(
    (service) => service.status === "online"
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-gray-800">System Status</h3>
        <button
          onClick={refreshServices}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-2">
        {services.map((service) => (
          <div
            key={service.name}
            className={`flex items-center justify-between p-3 rounded-lg border ${getStatusColor(
              service.status
            )}`}
          >
            <div className="flex items-center space-x-3">
              {getStatusIcon(service.status)}
              <div>
                <div className="font-medium">{service.name}</div>
                <div className="text-sm opacity-75">{service.description}</div>
                {service.error && (
                  <div className="text-xs text-red-600 mt-1">
                    {service.error}
                  </div>
                )}
              </div>
            </div>
            <div className="text-sm font-medium capitalize">
              {service.status}
            </div>
          </div>
        ))}
      </div>

      {!allServicesOnline && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">
              Some services are offline
            </span>
          </div>
          <div className="mt-2 space-y-1 text-sm text-yellow-700">
            <div>To start all services together:</div>
            <div className="bg-yellow-100 p-2 rounded font-mono text-xs">
              npm run dev:full
            </div>
            <div className="text-xs mt-2">Or start manually:</div>
            <div className="bg-yellow-100 p-2 rounded text-xs space-y-1">
              <div>
                1. Terminal 1:{" "}
                <code>cd backend/python-bridge && py sumo_bridge.py</code>
              </div>
              <div>
                2. Terminal 2: <code>npm run dev</code>
              </div>
            </div>
          </div>
        </div>
      )}

      {allServicesOnline && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              All services are online - Ready to start SUMO!
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServiceStatusPanel;
