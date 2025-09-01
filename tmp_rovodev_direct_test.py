#!/usr/bin/env python3
"""
Direct TraCI test to force vehicles to appear
"""
import sys
import os

try:
    import traci
    print("✅ TraCI imported successfully")
except ImportError:
    print("❌ TraCI not found")
    sys.exit(1)

def test_direct_traci():
    """Test TraCI directly"""
    try:
        print("🔌 Connecting to existing SUMO on port 8813...")
        traci.connect(port=8813, host='localhost')
        print("✅ Connected to SUMO")
        
        # Check current state
        current_time = traci.simulation.getTime()
        loaded = traci.simulation.getLoadedNumber()
        departed = traci.simulation.getDepartedNumber()
        vehicle_ids = traci.vehicle.getIDList()
        
        print(f"📊 Current state:")
        print(f"   Time: {current_time}")
        print(f"   Loaded: {loaded}")
        print(f"   Departed: {departed}")
        print(f"   Active vehicles: {len(vehicle_ids)}")
        
        if len(vehicle_ids) == 0:
            print("⏭️ No vehicles yet, advancing simulation...")
            
            # Force simulation steps
            for step in range(60):  # Try 60 steps (60 seconds)
                traci.simulationStep()
                
                new_time = traci.simulation.getTime()
                new_loaded = traci.simulation.getLoadedNumber()
                new_departed = traci.simulation.getDepartedNumber()
                new_vehicles = traci.vehicle.getIDList()
                
                if step % 10 == 0 or len(new_vehicles) > 0:
                    print(f"Step {step}: Time={new_time}, Loaded={new_loaded}, Departed={new_departed}, Active={len(new_vehicles)}")
                
                if len(new_vehicles) > 0:
                    print(f"🎉 SUCCESS! Found {len(new_vehicles)} vehicles at time {new_time}")
                    for vid in new_vehicles[:5]:  # Show first 5
                        pos = traci.vehicle.getPosition(vid)
                        speed = traci.vehicle.getSpeed(vid)
                        print(f"   Vehicle {vid}: pos={pos}, speed={speed:.2f} m/s")
                    break
            else:
                print("❌ No vehicles appeared after 60 steps")
        else:
            print(f"✅ Found {len(vehicle_ids)} vehicles already active!")
            
        traci.close()
        return len(vehicle_ids) > 0 or len(new_vehicles) > 0
        
    except Exception as e:
        print(f"❌ Error: {e}")
        try:
            traci.close()
        except:
            pass
        return False

if __name__ == "__main__":
    success = test_direct_traci()
    print(f"\n{'🎉 SUCCESS' if success else '💥 FAILED'}: Direct TraCI test completed")