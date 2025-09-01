#!/usr/bin/env python3
"""
Simple SUMO demo that creates vehicles and runs simulation
"""

import traci
import time
import sys

def run_demo():
    try:
        print("🚀 Starting SUMO demo...")
        
        # Connect to SUMO
        print("📡 Connecting to SUMO on port 8813...")
        traci.init(port=8813, host='localhost')
        print("✅ Connected to SUMO!")
        
        # Get simulation info
        current_time = traci.simulation.getTime()
        print(f"⏰ Current simulation time: {current_time}")
        
        # Check loaded vehicles
        loaded = traci.simulation.getLoadedNumber()
        print(f"🚗 Loaded vehicles: {loaded}")
        
        if loaded == 0:
            print("⚠️  No vehicles loaded from routes file")
            print("🔧 Creating demo vehicles...")
            
            # Get available edges
            edges = traci.edge.getIDList()
            if len(edges) > 0:
                # Use first available edge
                edge = edges[0]
                print(f"🛣️  Using edge: {edge}")
                
                # Add some vehicles manually
                for i in range(5):
                    vehicle_id = f"demo_car_{i}"
                    try:
                        traci.vehicle.add(vehicle_id, "", typeID="DEFAULT_VEHTYPE", depart=str(i))
                        traci.vehicle.changeTarget(vehicle_id, edge)
                        print(f"➕ Added vehicle: {vehicle_id}")
                    except Exception as e:
                        print(f"❌ Failed to add vehicle {vehicle_id}: {e}")
        
        print("\n🎬 Running simulation...")
        
        # Run simulation for 30 steps
        for step in range(30):
            traci.simulationStep()
            
            current_time = traci.simulation.getTime()
            vehicles = traci.vehicle.getIDList()
            departed = traci.simulation.getDepartedNumber()
            
            print(f"Step {step+1:2d}: Time={current_time:5.1f}s, Active vehicles={len(vehicles):2d}, Departed={departed:2d}")
            
            # Show vehicle details
            if len(vehicles) > 0:
                for vid in vehicles[:3]:  # Show first 3 vehicles
                    try:
                        pos = traci.vehicle.getPosition(vid)
                        speed = traci.vehicle.getSpeed(vid)
                        print(f"  🚗 {vid}: pos=({pos[0]:.1f}, {pos[1]:.1f}), speed={speed:.1f} m/s")
                    except:
                        pass
            
            time.sleep(0.5)  # Pause for visibility
        
        print("\n✅ Demo completed successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print(f"Error type: {type(e).__name__}")
        return False
    
    finally:
        try:
            traci.close()
            print("🔌 Disconnected from SUMO")
        except:
            pass
    
    return True

if __name__ == "__main__":
    success = run_demo()
    sys.exit(0 if success else 1)