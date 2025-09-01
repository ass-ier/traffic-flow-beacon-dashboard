#!/usr/bin/env python3
"""
Simple TraCI Test for SUMO Route Loading Issue
"""

import subprocess
import time
import os

def test_sumo_basic():
    """Test basic SUMO functionality"""
    print("=== Testing SUMO Basic Functionality ===")
    
    # Test SUMO version
    try:
        result = subprocess.run(['sumo', '--version'], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print(f"✓ SUMO available: {result.stdout.strip().split()[0]}")
        else:
            print(f"✗ SUMO version check failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"✗ SUMO not available: {e}")
        return False
    
    return True

def test_config_validation():
    """Test configuration file validation"""
    print("\n=== Testing Configuration Files ===")
    
    configs = [
        ("AddisAbabaSumo/traci_test.sumocfg", "TraCI Test Config"),
        ("AddisAbabaSumo/test_working.sumocfg", "Working Config"),
    ]
    
    for config_path, name in configs:
        if not os.path.exists(config_path):
            print(f"✗ {name}: File not found")
            continue
            
        try:
            # Test config validation (just check if file loads)
            result = subprocess.run([
                'sumo', '-c', config_path, '--duration-log.disable'
            ], capture_output=True, text=True, timeout=10)
            
            if result.returncode == 0:
                print(f"✓ {name}: Configuration valid")
            else:
                print(f"✗ {name}: Configuration invalid")
                print(f"  Error: {result.stderr[:200]}")
                
        except Exception as e:
            print(f"✗ {name}: Test failed - {e}")

def test_traci_connection():
    """Test TraCI connection with working routes"""
    print("\n=== Testing TraCI Connection ===")
    
    try:
        import traci
        print("✓ TraCI module available")
    except ImportError as e:
        print(f"✗ TraCI not available: {e}")
        return False
    
    # Use the working configuration
    config_path = "AddisAbabaSumo/traci_test.sumocfg"
    
    if not os.path.exists(config_path):
        print(f"✗ Config file not found: {config_path}")
        return False
    
    print(f"Starting SUMO with {config_path}...")
    
    # Start SUMO with TraCI
    sumo_cmd = [
        'sumo',
        '-c', 'traci_test.sumocfg',
        '--remote-port', '8813',
        '--start'
    ]
    
    sumo_process = None
    try:
        print(f"Command: {' '.join(sumo_cmd)}")
        sumo_process = subprocess.Popen(
            sumo_cmd,
            cwd='AddisAbabaSumo',
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait for SUMO to start
        print("Waiting for SUMO to initialize...")
        time.sleep(3)
        
        # Check if process is still running
        if sumo_process.poll() is not None:
            stdout, stderr = sumo_process.communicate()
            print(f"✗ SUMO process terminated early")
            print(f"STDOUT: {stdout}")
            print(f"STDERR: {stderr}")
            return False
        
        print("Attempting TraCI connection...")
        traci.connect(port=8813)
        
        # Test basic TraCI operations
        sim_time = traci.simulation.getTime()
        vehicle_ids = traci.vehicle.getIDList()
        loaded_count = traci.simulation.getLoadedNumber()
        departed_count = traci.simulation.getDepartedNumber()
        min_expected = traci.simulation.getMinExpectedNumber()
        
        print(f"✓ TraCI connected successfully!")
        print(f"  Simulation time: {sim_time}")
        print(f"  Active vehicles: {len(vehicle_ids)}")
        print(f"  Loaded vehicles: {loaded_count}")
        print(f"  Departed vehicles: {departed_count}")
        print(f"  Expected vehicles: {min_expected}")
        
        # Test simulation stepping
        print("\nTesting simulation steps...")
        for step in range(10):
            traci.simulationStep()
            new_time = traci.simulation.getTime()
            new_vehicle_count = len(traci.vehicle.getIDList())
            print(f"  Step {step+1}: Time={new_time}, Vehicles={new_vehicle_count}")
            
            if new_vehicle_count > 0:
                print(f"✓ Vehicles appeared at step {step+1}!")
                break
        
        # Final status
        final_vehicles = len(traci.vehicle.getIDList())
        if final_vehicles > 0:
            print(f"✓ SUCCESS: {final_vehicles} vehicles are active in simulation")
        else:
            print("⚠ WARNING: No vehicles active, but TraCI connection works")
        
        return True
        
    except Exception as e:
        print(f"✗ TraCI test failed: {e}")
        return False
        
    finally:
        # Clean up
        try:
            traci.close()
        except:
            pass
        
        if sumo_process:
            try:
                sumo_process.terminate()
                sumo_process.wait(timeout=5)
            except:
                try:
                    sumo_process.kill()
                except:
                    pass

def main():
    print("SUMO TraCI Route Loading Investigation")
    print("=" * 50)
    
    if not test_sumo_basic():
        print("Basic SUMO test failed. Cannot continue.")
        return
    
    test_config_validation()
    
    success = test_traci_connection()
    
    print("\n" + "=" * 50)
    if success:
        print("✓ TraCI test completed successfully!")
        print("The issue is likely with the large routes.xml file.")
        print("Recommendation: Use working_routes.xml for TraCI mode.")
    else:
        print("✗ TraCI test failed.")
        print("Check SUMO installation and configuration files.")

if __name__ == "__main__":
    main()