#!/usr/bin/env python3
"""
TraCI Diagnosis Script for AddisAbaba SUMO Configuration
"""

import os
import sys
import subprocess
import time

def test_sumo_availability():
    """Test if SUMO is available and working"""
    print("=== SUMO Availability Test ===")
    
    # Check SUMO_HOME
    sumo_home = os.environ.get('SUMO_HOME')
    print(f"SUMO_HOME: {sumo_home}")
    
    if sumo_home:
        sumo_gui_path = os.path.join(sumo_home, 'bin', 'sumo-gui.exe')
        sumo_path = os.path.join(sumo_home, 'bin', 'sumo.exe')
        print(f"SUMO GUI path: {sumo_gui_path} (exists: {os.path.exists(sumo_gui_path)})")
        print(f"SUMO path: {sumo_path} (exists: {os.path.exists(sumo_path)})")
    
    # Test SUMO version
    try:
        result = subprocess.run(['sumo', '--version'], capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print(f"SUMO version: {result.stdout.split()[0]}")
        else:
            print(f"SUMO version check failed: {result.stderr}")
    except Exception as e:
        print(f"SUMO not available in PATH: {e}")

def test_config_files():
    """Test SUMO configuration files"""
    print("\n=== Configuration Files Test ===")
    
    config_dir = "AddisAbabaSumo"
    configs_to_test = [
        "test_working.sumocfg",
        "working_config.sumocfg", 
        "AddisAbaba.sumocfg"
    ]
    
    for config in configs_to_test:
        config_path = os.path.join(config_dir, config)
        exists = os.path.exists(config_path)
        print(f"{config}: {'EXISTS' if exists else 'MISSING'}")
        
        if exists:
            # Test if SUMO can load the config
            try:
                result = subprocess.run([
                    'sumo', '--check-route-files', '-c', config_path
                ], capture_output=True, text=True, timeout=30, cwd=config_dir)
                
                if result.returncode == 0:
                    print(f"  ✓ Config validation: PASSED")
                else:
                    print(f"  ✗ Config validation: FAILED")
                    print(f"    Error: {result.stderr[:200]}...")
                    
            except Exception as e:
                print(f"  ✗ Config test failed: {e}")

def test_network_and_routes():
    """Test network and route files"""
    print("\n=== Network and Routes Test ===")
    
    config_dir = "AddisAbabaSumo"
    
    # Check network file
    network_file = os.path.join(config_dir, "AddisAbaba.net.xml")
    print(f"Network file: {'EXISTS' if os.path.exists(network_file) else 'MISSING'}")
    
    if os.path.exists(network_file):
        # Get file size
        size_mb = os.path.getsize(network_file) / (1024 * 1024)
        print(f"  Size: {size_mb:.1f} MB")
    
    # Check route files
    route_files = ["routes.xml", "working_routes.xml", "simple_routes.xml"]
    for route_file in route_files:
        route_path = os.path.join(config_dir, route_file)
        exists = os.path.exists(route_path)
        print(f"Route file {route_file}: {'EXISTS' if exists else 'MISSING'}")
        
        if exists:
            size_mb = os.path.getsize(route_path) / (1024 * 1024)
            print(f"  Size: {size_mb:.1f} MB")

def test_traci_connection():
    """Test TraCI connection with working config"""
    print("\n=== TraCI Connection Test ===")
    
    try:
        import traci
        print("✓ TraCI module imported successfully")
    except ImportError as e:
        print(f"✗ TraCI import failed: {e}")
        return
    
    # Test with working configuration
    config_dir = "AddisAbabaSumo"
    config_file = "test_working.sumocfg"
    
    print(f"Testing TraCI with {config_file}...")
    
    # Start SUMO process
    sumo_cmd = [
        'sumo',
        '-c', config_file,
        '--remote-port', '8813',
        '--start'
    ]
    
    try:
        print(f"Starting SUMO: {' '.join(sumo_cmd)}")
        sumo_process = subprocess.Popen(
            sumo_cmd,
            cwd=config_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait for SUMO to start
        print("Waiting for SUMO to initialize...")
        time.sleep(5)
        
        # Check if process is running
        if sumo_process.poll() is not None:
            stdout, stderr = sumo_process.communicate()
            print(f"✗ SUMO process terminated early")
            print(f"STDOUT: {stdout[:500]}")
            print(f"STDERR: {stderr[:500]}")
            return
        
        # Try TraCI connection
        print("Attempting TraCI connection...")
        traci.connect(port=8813)
        
        # Test basic operations
        sim_time = traci.simulation.getTime()
        vehicle_count = len(traci.vehicle.getIDList())
        loaded_count = traci.simulation.getLoadedNumber()
        
        print(f"✓ TraCI connected successfully!")
        print(f"  Simulation time: {sim_time}")
        print(f"  Active vehicles: {vehicle_count}")
        print(f"  Loaded vehicles: {loaded_count}")
        
        # Try a few simulation steps
        print("Testing simulation steps...")
        for i in range(5):
            traci.simulationStep()
            new_vehicle_count = len(traci.vehicle.getIDList())
            print(f"  Step {i+1}: {new_vehicle_count} vehicles")
        
        # Clean up
        traci.close()
        sumo_process.terminate()
        sumo_process.wait(timeout=10)
        
        print("✓ TraCI test completed successfully!")
        
    except Exception as e:
        print(f"✗ TraCI test failed: {e}")
        try:
            traci.close()
        except:
            pass
        try:
            sumo_process.terminate()
            sumo_process.wait(timeout=5)
        except:
            pass

if __name__ == "__main__":
    print("SUMO TraCI Diagnosis Tool")
    print("=" * 50)
    
    test_sumo_availability()
    test_config_files()
    test_network_and_routes()
    test_traci_connection()
    
    print("\n" + "=" * 50)
    print("Diagnosis complete!")