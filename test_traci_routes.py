#!/usr/bin/env python3
"""
Test script to verify SUMO TraCI properly loads routes from AddisAbaba.sumocfg
"""

import os
import sys
import time
import traci
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_traci_connection():
    """Test TraCI connection with AddisAbaba.sumocfg"""
    
    print("\n" + "=" * 60)
    print("TESTING TRACI CONNECTION WITH ADDISABABA.SUMOCFG")
    print("=" * 60 + "\n")
    
    # Get paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    sumo_dir = os.path.join(script_dir, "AddisAbabaSumo")
    config_file = "AddisAbaba.sumocfg"
    
    # Check if config exists
    config_path = os.path.join(sumo_dir, config_file)
    if not os.path.exists(config_path):
        print(f"❌ Config file not found: {config_path}")
        return False
    
    print(f"✅ Found config: {config_path}")
    
    # Determine SUMO binary
    sumo_home = os.environ.get('SUMO_HOME')
    if sumo_home:
        sumo_binary = os.path.join(sumo_home, 'bin', 'sumo.exe')
        if not os.path.exists(sumo_binary):
            sumo_binary = "sumo"
    else:
        sumo_binary = "sumo"
    
    print(f"Using SUMO binary: {sumo_binary}")
    
    # Build TraCI command
    sumo_cmd = [
        sumo_binary,
        "-c", config_file,
        "--step-length", "1.0",
        "--no-warnings",
        "--no-step-log",
        "--quit-on-end",
        "--delay", "0",
        "--begin", "0",
        "--end", "3600"  # 1 hour simulation
    ]
    
    print(f"\nCommand: {' '.join(sumo_cmd)}")
    print(f"Working directory: {sumo_dir}\n")
    
    # Store original directory
    original_cwd = os.getcwd()
    
    try:
        # Close any existing connection
        try:
            traci.close()
        except:
            pass
        
        # CRITICAL: Change to config directory
        os.chdir(sumo_dir)
        
        # Start TraCI
        print("Starting TraCI connection...")
        traci.start(sumo_cmd)
        
        # Wait for initialization
        time.sleep(2)
        
        # Get initial state
        sim_time = traci.simulation.getTime()
        loaded = traci.simulation.getLoadedNumber()
        departed = traci.simulation.getDepartedNumber()
        active = len(traci.vehicle.getIDList())
        
        print(f"\n✅ Connected successfully!")
        print(f"Initial state:")
        print(f"  - Simulation time: {sim_time}s")
        print(f"  - Loaded vehicles: {loaded}")
        print(f"  - Departed vehicles: {departed}")
        print(f"  - Active vehicles: {active}")
        
        # If no vehicles loaded, advance simulation
        if loaded == 0 or active == 0:
            print("\n⚠️ No vehicles initially, advancing simulation...")
            
            for i in range(100):
                traci.simulationStep()
                
                if i % 10 == 0:
                    sim_time = traci.simulation.getTime()
                    loaded = traci.simulation.getLoadedNumber()
                    departed = traci.simulation.getDepartedNumber()
                    active = len(traci.vehicle.getIDList())
                    
                    print(f"  Step {i}: Time={sim_time:.1f}s, Loaded={loaded}, Departed={departed}, Active={active}")
                    
                    if active > 0:
                        vehicle_ids = traci.vehicle.getIDList()
                        print(f"\n✅ VEHICLES DETECTED!")
                        print(f"  First 5 vehicle IDs: {vehicle_ids[:5]}")
                        break
        
        # Final statistics
        print("\n" + "-" * 40)
        print("FINAL STATISTICS:")
        sim_time = traci.simulation.getTime()
        loaded = traci.simulation.getLoadedNumber()
        departed = traci.simulation.getDepartedNumber()
        arrived = traci.simulation.getArrivedNumber()
        active = len(traci.vehicle.getIDList())
        
        print(f"  - Simulation time: {sim_time}s")
        print(f"  - Loaded vehicles: {loaded}")
        print(f"  - Departed vehicles: {departed}")
        print(f"  - Arrived vehicles: {arrived}")
        print(f"  - Active vehicles: {active}")
        
        if active > 0:
            print("\n✅ SUCCESS: TraCI is working correctly with routes.xml!")
            success = True
        else:
            print("\n❌ PROBLEM: No vehicles loaded from routes.xml")
            print("\nPossible issues:")
            print("  1. routes.xml may be empty or invalid")
            print("  2. Vehicle departure times may be too far in the future")
            print("  3. Routes may reference non-existent edges")
            success = False
        
        # Close connection
        traci.close()
        
        return success
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print(f"Error type: {type(e).__name__}")
        return False
        
    finally:
        # Restore original directory
        os.chdir(original_cwd)
        
        # Make sure connection is closed
        try:
            traci.close()
        except:
            pass

def main():
    """Main function"""
    print("\n" + "=" * 60)
    print("SUMO TRACI ROUTE LOADING TEST")
    print("=" * 60)
    
    # Check environment
    sumo_home = os.environ.get('SUMO_HOME')
    if sumo_home:
        print(f"✅ SUMO_HOME: {sumo_home}")
    else:
        print("⚠️ SUMO_HOME not set, will try to use SUMO from PATH")
    
    # Run test
    success = test_traci_connection()
    
    print("\n" + "=" * 60)
    if success:
        print("✅ TEST PASSED - TraCI is working correctly!")
        print("\nThe SUMO bridge should now work properly when you click")
        print("the play button on the frontend.")
    else:
        print("❌ TEST FAILED - TraCI issues detected")
        print("\nPlease check:")
        print("  1. routes.xml file exists and contains valid vehicle definitions")
        print("  2. Network file (AddisAbaba.net.xml) is valid")
        print("  3. Edge IDs in routes match the network")
    print("=" * 60)

if __name__ == "__main__":
    main()
