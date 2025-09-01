import React, { useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { useSUMOContext } from "../contexts/SUMOContext";

export const SUMOSettings: React.FC = () => {
  const {
    connectionStatus,
    connect,
    disconnect,
    setDataFilters,
    clearDataFilters,
  } = useSUMOContext();
  const [serverUrl, setServerUrl] = useState("ws://localhost:3001/ws");
  const [filters, setFilters] = useState({
    vehicleTypes: {
      cars: true,
      buses: true,
      trucks: true,
      emergency: true,
    },
    speedRange: {
      min: 0,
      max: 100,
    },
    emergencyOnly: false,
  });

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error("Connection failed:", error);
    }
  };

  const handleApplyFilters = () => {
    const activeVehicleTypes = Object.entries(filters.vehicleTypes)
      .filter(([_, enabled]) => enabled)
      .map(([type, _]) => type);

    setDataFilters({
      vehicleTypes: activeVehicleTypes,
      speedRange: filters.speedRange,
      emergencyOnly: filters.emergencyOnly,
    });
  };

  const handleClearFilters = () => {
    clearDataFilters();
    setFilters({
      vehicleTypes: {
        cars: true,
        buses: true,
        trucks: true,
        emergency: true,
      },
      speedRange: {
        min: 0,
        max: 100,
      },
      emergencyOnly: false,
    });
  };

  return (
    <Card className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">SUMO Settings</h3>

      {/* Connection Settings */}
      <div className="space-y-2">
        <Label htmlFor="serverUrl">Server URL</Label>
        <Input
          id="serverUrl"
          value={serverUrl}
          onChange={(e) => setServerUrl(e.target.value)}
          placeholder="ws://localhost:3002/ws"
        />
        <div className="flex space-x-2">
          <Button
            onClick={handleConnect}
            disabled={connectionStatus.connected}
            size="sm"
          >
            Connect
          </Button>
          <Button
            onClick={disconnect}
            disabled={!connectionStatus.connected}
            variant="outline"
            size="sm"
          >
            Disconnect
          </Button>
        </div>
      </div>

      {/* Data Filters */}
      <div className="space-y-3">
        <h4 className="font-medium">Data Filters</h4>

        {/* Vehicle Type Filters */}
        <div className="space-y-2">
          <Label>Vehicle Types</Label>
          {Object.entries(filters.vehicleTypes).map(([type, enabled]) => (
            <div key={type} className="flex items-center space-x-2">
              <Switch
                checked={enabled}
                onCheckedChange={(checked) =>
                  setFilters((prev) => ({
                    ...prev,
                    vehicleTypes: {
                      ...prev.vehicleTypes,
                      [type]: checked,
                    },
                  }))
                }
              />
              <Label className="capitalize">{type}</Label>
            </div>
          ))}
        </div>

        {/* Speed Range */}
        <div className="space-y-2">
          <Label>Speed Range (km/h)</Label>
          <div className="flex space-x-2">
            <Input
              type="number"
              placeholder="Min"
              value={filters.speedRange.min}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  speedRange: {
                    ...prev.speedRange,
                    min: parseInt(e.target.value) || 0,
                  },
                }))
              }
            />
            <Input
              type="number"
              placeholder="Max"
              value={filters.speedRange.max}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  speedRange: {
                    ...prev.speedRange,
                    max: parseInt(e.target.value) || 100,
                  },
                }))
              }
            />
          </div>
        </div>

        {/* Emergency Only */}
        <div className="flex items-center space-x-2">
          <Switch
            checked={filters.emergencyOnly}
            onCheckedChange={(checked) =>
              setFilters((prev) => ({
                ...prev,
                emergencyOnly: checked,
              }))
            }
          />
          <Label>Emergency Vehicles Only</Label>
        </div>

        {/* Filter Actions */}
        <div className="flex space-x-2">
          <Button onClick={handleApplyFilters} size="sm">
            Apply Filters
          </Button>
          <Button onClick={handleClearFilters} variant="outline" size="sm">
            Clear Filters
          </Button>
        </div>
      </div>
    </Card>
  );
};
