#!/usr/bin/env python3
"""
Test script to verify that the TraCI fix properly loads vehicles.
"""

import os
import sys
import time

# Add SUMO tools to path
if 'SUMO_HOME' in os.environ:
    tools = os.path.join(os.environ['SUMO_HOME'], 'tools')
    sys.path.append(tools)
else:
    sys.exit("Please declare environment variable 'SUMO_HOME'")

import traci

def test_traci_connection():
    """Test TraCI connection with proper route loading"""
    
    print("=" * 60)
    print("TESTING TRACI VEHICLE LOADING FIX")
    print("=" * 60)
    
    # Configuration
    config_dir = os.path.join(os.getcwd(), "AddisAbabaSumo")
    config_file = "AddisAbaba.sumocfg"
    config_path = os.path.join(config_dir, config_file)
    
    # Check if config exists
    if not os.path.exists(config_path):
        print(f"❌ Config file not found: {config_path}")
        return False
    
    print(f"✅ Using config: {config_path}")
    
    # Build SUMO command (using the fixed approach)
    sumo_cmd = [
        "sumo",  # Use sumo-gui if you want to see the GUI
        "-c", config_file,
        "--step-length", "1.0",
        "--no-warnings",
        "--no-step-log",
        "--quit-on-end"
        # IMPORTANT: No --start flag!
    ]
    
    print(f"Command: {' '.join(sumo_cmd)}")
    
    # Store original directory
    original_cwd = os.getcwd()
    
    try:
        # CRITICAL: Change to config directory
        os.chdir(config_dir)
        print(f"Working directory: {os.getcwd()}")
        
        # Start SUMO with traci.start()
        print("\nStarting SUMO with traci.start()...")
        traci.start(sumo_cmd)
        
        # Wait for initialization
        time.sleep(0.5)
        
        # Check initial state
        sim_time = traci.simulation.getTime()
        loaded = traci.simulation.getLoadedNumber()
        departed = traci.simulation.getDepartedNumber()
        
        print(f"\n✅ Connected successfully!")
        print(f"Initial state:")
        print(f"  Time: {sim_time}")
        print(f"  Loaded vehicles: {loaded}")
        print(f"  Departed vehicles: {departed}")
        
        # Run simulation for several steps
        print(f"\nRunning simulation...")
        print("-" * 40)
        
        vehicle_seen = False
        for step in range(20):
            traci.simulationStep()
            
            # Get current state
            sim_time = traci.simulation.getTime()
            vehicles = traci.vehicle.getIDList()
            loaded = traci.simulation.getLoadedNumber()
            departed = traci.simulation.getDepartedNumber()
            arrived = traci.simulation.getArrivedNumber()
            
            print(f"Step {step+1}: Time={sim_time:.1f}s, Active={len(vehicles)}, "
                  f"Loaded={loaded}, Departed={departed}, Arrived={arrived}")
            
            # Show first few vehicle IDs
            if len(vehicles) > 0:
                vehicle_seen = True
                print(f"  Vehicle IDs: {list(vehicles)[:5]}{'...' if len(vehicles) > 5 else ''}")
                
                # Get details of first vehicle
                first_veh = list(vehicles)[0]
                position = traci.vehicle.getPosition(first_veh)
                speed = traci.vehicle.getSpeed(first_veh)
                edge = traci.vehicle.getRoadID(first_veh)
                print(f"  First vehicle '{first_veh}': edge={edge}, speed={speed:.2f} m/s")
            
            time.sleep(0.1)  # Small delay to see output
        
        print("-" * 40)
        
        # Final statistics
        print(f"\nFinal Statistics:")
        print(f"  Total loaded: {traci.simulation.getLoadedNumber()}")
        print(f"  Total departed: {traci.simulation.getDepartedNumber()}")
        print(f"  Total arrived: {traci.simulation.getArrivedNumber()}")
        print(f"  Currently active: {len(traci.vehicle.getIDList())}")
        
        # Close connection
        traci.close()
        
        # Result
        print("\n" + "=" * 60)
        if vehicle_seen:
            print("✅ SUCCESS: Vehicles were loaded and appeared in simulation!")
            print("\nThe fix works! The key points are:")
            print("  1. Use traci.start() instead of manual server + traci.init()")
            print("  2. Change to the config directory before starting")
            print("  3. Don't use the --start flag")
            return True
        else:
            print("❌ FAILURE: No vehicles appeared in simulation")
            print("\nPossible issues:")
            print("  1. Route file might be empty or invalid")
            print("  2. Vehicle departure times might be too late")
            print("  3. Network edges in routes might not exist")
            return False
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False
        
    finally:
        # Restore original directory
        os.chdir(original_cwd)
        
        # Make sure TraCI is closed
        try:
            traci.close()
        except:
            pass

if __name__ == "__main__":
    success = test_traci_connection()
    
    if success:
        print("\n📝 TO APPLY THIS FIX TO YOUR PROJECT:")
        print("-" * 40)
        print("1. Update your sumo_bridge.py to use traci.start() method")
        print("2. Remove the --start flag from SUMO command arguments")
        print("3. Always change to config directory before starting SUMO")
        print("4. Use the fixed version in sumo_bridge_fixed.py as reference")
        print("\nYou can replace the connect_to_sumo() method in your")
        print("existing sumo_bridge.py with connect_to_sumo_fixed() from")
        print("the new file.")
    
    sys.exit(0 if success else 1)
