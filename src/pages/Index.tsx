import { useState } from "react";
import { TrafficMap } from "@/components/TrafficMap";
import { ControlPanel } from "@/components/ControlPanel";
import { StatisticsPanel } from "@/components/StatisticsPanel";
import { SystemLog } from "@/components/SystemLog";
import { MapViewToggle } from "@/components/MapViewToggle";
import { SUMOSettings } from "@/components/SUMOSettings";
import ServiceStatusPanel from "@/components/ServiceStatusPanel";
import { Card } from "@/components/ui/card";

const Index = () => {
  const [simulationState, setSimulationState] = useState("stopped");
  const [trafficMode, setTrafficMode] = useState("conventional");
  const [mapView, setMapView] = useState("congestion");

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-lg">
        <div className="flex items-center justify-between max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center space-x-4">
            <img
              src="/lovable-uploads/e10366fa-da5b-4c9d-a4ab-f574c262dd0f.png"
              alt="Ethiopian Federal Police Logo"
              className="h-12 w-12 rounded-full"
            />
            <div>
              <h1 className="text-2xl font-bold">Traffic Control System</h1>
              <p className="text-slate-300 text-sm">
                Load-Aware Traffic Light Management Dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-slate-300">System Status</p>
              <p className="font-semibold capitalize text-green-400">
                {simulationState}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-300">Traffic Mode</p>
              <p className="font-semibold capitalize">{trafficMode}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Top Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ControlPanel
            simulationState={simulationState}
            setSimulationState={setSimulationState}
            trafficMode={trafficMode}
            setTrafficMode={setTrafficMode}
          />
          <MapViewToggle mapView={mapView} setMapView={setMapView} />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Map Section */}
          <div className="xl:col-span-2">
            <Card className="p-0 h-[600px] overflow-hidden">
              <TrafficMap mapView={mapView} simulationState={simulationState} />
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            <ServiceStatusPanel />
            <SUMOSettings />
            <StatisticsPanel />
            <SystemLog />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;