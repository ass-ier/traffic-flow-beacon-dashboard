import React, { useState } from "react";
import { useSUMOContext } from "../contexts/SUMOContext";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { ChevronDown, ChevronUp, Wifi, WifiOff, Activity } from "lucide-react";

export const SUMOConnectionStatus: React.FC = () => {
  const { connectionStatus, connect, disconnect, isConnected } =
    useSUMOContext();
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = () => {
    if (isConnected) return "bg-green-500";
    if (connectionStatus.reconnectAttempts > 0) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getStatusText = () => {
    if (isConnected) return "Connected";
    if (connectionStatus.reconnectAttempts > 0) return "Reconnecting...";
    return "Disconnected";
  };

  const formatLatency = (latency: number) => {
    if (latency === 0) return "N/A";
    return `${latency}ms`;
  };

  const formatLastUpdate = (timestamp: number) => {
    if (timestamp === 0) return "Never";
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ago`;
  };

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error("Manual connection failed:", error);
    }
  };

  const StatusIcon = isConnected ? Wifi : WifiOff;

  return (
    <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-lg shadow-sm">
      {/* Compact Status Bar */}
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <StatusIcon
            className={`h-4 w-4 ${
              isConnected ? "text-green-600" : "text-red-600"
            }`}
          />
          <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
          <span className="text-sm font-medium text-gray-700">SUMO</span>
          <Badge
            variant={isConnected ? "default" : "destructive"}
            className="text-xs px-2 py-0.5"
          >
            {getStatusText()}
          </Badge>
        </div>

        <div className="flex items-center space-x-2">
          {isConnected && (
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Activity className="h-3 w-3" />
              <span>{formatLatency(connectionStatus.latency)}</span>
            </div>
          )}
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <CardContent className="px-3 py-2 border-t border-gray-100">
          <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Latency:</span>
              <span className="font-mono text-gray-700">
                {formatLatency(connectionStatus.latency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last Update:</span>
              <span className="font-mono text-gray-700">
                {formatLastUpdate(connectionStatus.lastUpdate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Attempts:</span>
              <span className="font-mono text-gray-700">
                {connectionStatus.reconnectAttempts}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status:</span>
              <span className="text-gray-700">
                {isConnected ? "Online" : "Offline"}
              </span>
            </div>
          </div>

          {connectionStatus.error && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-xs">
              <strong>Error:</strong> {connectionStatus.error}
            </div>
          )}

          <div className="flex space-x-2">
            {!isConnected ? (
              <Button onClick={handleConnect} size="sm" className="h-7 text-xs">
                Connect
              </Button>
            ) : (
              <Button
                onClick={disconnect}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
              >
                Disconnect
              </Button>
            )}
          </div>
        </CardContent>
      )}
    </div>
  );
};
