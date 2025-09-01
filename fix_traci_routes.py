#!/usr/bin/env python3
"""
Diagnostic and fix script for SUMO TraCI route loading issues.
This script helps identify why vehicles don't appear when using TraCI.
"""

import os
import sys
import time
import subprocess
import traci
import xml.etree.ElementTree as ET

def check_environment():
    """Check SUMO environment setup"""
    print("=" * 60)
    print("1. CHECKING ENVIRONMENT")
    print("=" * 60)
    
    sumo_home = os.environ.get('SUMO_HOME')
    if sumo_home:
        print(f"✅ SUMO_HOME is set: {sumo_home}")
        sumo_bin = os.path.join(sumo_home, 'bin')
        if os.path.exists(sumo_bin):
            print(f"✅ SUMO bin directory exists: {sumo_bin}")
        else:
            print(f"❌ SUMO bin directory not found: {sumo_bin}")
    else:
        print("❌ SUMO_HOME is not set")
        
    # Try to find SUMO in PATH
    try:
        result = subprocess.run(['sumo', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ SUMO found in PATH")
            print(f"   Version: {result.stdout.split()[0] if result.stdout else 'Unknown'}")
    except:
        print("❌ SUMO not found in PATH")
    
    print()

def check_config_files(config_path):
    """Check if all files referenced in config exist"""
    print("=" * 60)
    print("2. CHECKING CONFIG FILES")
    print("=" * 60)
    
    if not os.path.exists(config_path):
        print(f"❌ Config file not found: {config_path}")
        return False
        
    print(f"✅ Config file exists: {config_path}")
    
    # Parse config to check referenced files
    try:
        tree = ET.parse(config_path)
        root = tree.getroot()
        
        config_dir = os.path.dirname(config_path)
        
        # Check net file
        net_file = root.find('.//net-file')
        if net_file is not None:
            net_path = os.path.join(config_dir, net_file.get('value'))
            if os.path.exists(net_path):
                print(f"✅ Network file exists: {net_file.get('value')}")
                file_size = os.path.getsize(net_path) / (1024 * 1024)  # MB
                print(f"   Size: {file_size:.2f} MB")
            else:
                print(f"❌ Network file not found: {net_path}")
                
        # Check route files
        route_files = root.find('.//route-files')
        if route_files is not None:
            route_path = os.path.join(config_dir, route_files.get('value'))
            if os.path.exists(route_path):
                print(f"✅ Route file exists: {route_files.get('value')}")
                
                # Count vehicles in route file
                route_tree = ET.parse(route_path)
                vehicles = len(route_tree.findall('.//vehicle'))
                flows = len(route_tree.findall('.//flow'))
                trips = len(route_tree.findall('.//trip'))
                
                print(f"   Contains: {vehicles} vehicles, {flows} flows, {trips} trips")
                
                if vehicles == 0 and flows == 0 and trips == 0:
                    print("   ⚠️ WARNING: Route file contains no vehicles/flows/trips!")
            else:
                print(f"❌ Route file not found: {route_path}")
                print(f"   Looking for alternatives...")
                
                # List available route files
                route_alternatives = [f for f in os.listdir(config_dir) if f.endswith('.rou.xml') or f.endswith('routes.xml')]
                if route_alternatives:
                    print(f"   Found alternative route files: {', '.join(route_alternatives)}")
                
        # Check additional files
        additional_files = root.find('.//additional-files')
        if additional_files is not None:
            add_path = os.path.join(config_dir, additional_files.get('value'))
            if os.path.exists(add_path):
                print(f"✅ Additional file exists: {additional_files.get('value')}")
            else:
                print(f"⚠️ Additional file not found: {add_path} (may not be critical)")
                
    except Exception as e:
        print(f"❌ Error parsing config: {e}")
        return False
        
    print()
    return True

def test_direct_sumo(config_path, use_gui=False):
    """Test running SUMO directly without TraCI"""
    print("=" * 60)
    print("3. TESTING DIRECT SUMO EXECUTION")
    print("=" * 60)
    
    sumo_cmd = 'sumo-gui' if use_gui else 'sumo'
    
    # Build command
    cmd = [
        sumo_cmd,
        '-c', config_path,
        '--step-length', '1.0',
        '--duration-log.statistics',
        '--quit-on-end',
        '--end', '10'  # Run for 10 seconds only
    ]
    
    print(f"Running: {' '.join(cmd)}")
    
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=os.path.dirname(config_path))
        
        if result.returncode == 0:
            print("✅ Direct SUMO execution successful")
            
            # Parse output for vehicle info
            if "Vehicles:" in result.stdout:
                print(f"   {[line for line in result.stdout.split('\\n') if 'Vehicles:' in line][0]}")
        else:
            print(f"❌ Direct SUMO execution failed")
            print(f"   Error: {result.stderr[:500] if result.stderr else 'No error message'}")
            
    except Exception as e:
        print(f"❌ Error running SUMO: {e}")
    
    print()

def test_traci_methods(config_path):
    """Test different TraCI connection methods"""
    print("=" * 60)
    print("4. TESTING TRACI CONNECTION METHODS")
    print("=" * 60)
    
    config_dir = os.path.dirname(os.path.abspath(config_path))
    config_file = os.path.basename(config_path)
    
    # Method 1: Using traci.start (recommended)
    print("\n--- Method 1: traci.start() ---")
    try:
        sumo_binary = "sumo"
        sumo_cmd = [
            sumo_binary,
            "-c", config_file,
            "--step-length", "1.0",
            "--no-warnings",
            "--no-step-log",
            "--quit-on-end",
            "--start"  # Auto-start simulation
        ]
        
        print(f"Starting with: {' '.join(sumo_cmd)}")
        print(f"Working directory: {config_dir}")
        
        # Change to config directory for relative paths
        original_cwd = os.getcwd()
        os.chdir(config_dir)
        
        traci.start(sumo_cmd)
        
        # Wait a moment for initialization
        time.sleep(1)
        
        # Get initial state
        sim_time = traci.simulation.getTime()
        loaded = traci.simulation.getLoadedNumber()
        departed = traci.simulation.getDepartedNumber()
        
        print(f"✅ Connected via traci.start()")
        print(f"   Initial time: {sim_time}")
        print(f"   Loaded vehicles: {loaded}")
        print(f"   Departed vehicles: {departed}")
        
        # Run a few steps
        print("\n   Running simulation steps...")
        for i in range(10):
            traci.simulationStep()
            vehicles = traci.vehicle.getIDList()
            loaded = traci.simulation.getLoadedNumber()
            departed = traci.simulation.getDepartedNumber()
            print(f"   Step {i+1}: Active={len(vehicles)}, Loaded={loaded}, Departed={departed}")
            
            if len(vehicles) > 0:
                print(f"   ✅ Vehicles detected! IDs: {vehicles[:5]}...")
                break
        
        if len(traci.vehicle.getIDList()) == 0:
            print("   ⚠️ No vehicles appeared after 10 steps")
            
            # Check for pending vehicles
            pending = traci.simulation.getPendingVehicles()
            if pending:
                print(f"   Pending vehicles: {pending}")
                
        traci.close()
        os.chdir(original_cwd)
        
    except Exception as e:
        print(f"❌ Method 1 failed: {e}")
        os.chdir(original_cwd)
    
    time.sleep(2)  # Wait between methods
    
    # Method 2: Manual server start with explicit port
    print("\n--- Method 2: Manual server with traci.init() ---")
    try:
        port = 8813
        sumo_cmd = [
            "sumo",
            "-c", config_file,
            "--remote-port", str(port),
            "--step-length", "1.0",
            "--no-warnings",
            "--no-step-log"
        ]
        
        print(f"Starting server: {' '.join(sumo_cmd)}")
        
        # Start SUMO as server
        process = subprocess.Popen(sumo_cmd, cwd=config_dir)
        
        # Wait for server to start
        print("Waiting for server to initialize...")
        time.sleep(3)
        
        # Connect via TraCI
        traci.init(port=port)
        
        print(f"✅ Connected via traci.init()")
        
        # Get initial state
        sim_time = traci.simulation.getTime()
        loaded = traci.simulation.getLoadedNumber()
        departed = traci.simulation.getDepartedNumber()
        
        print(f"   Initial time: {sim_time}")
        print(f"   Loaded vehicles: {loaded}")
        print(f"   Departed vehicles: {departed}")
        
        # Run a few steps
        print("\n   Running simulation steps...")
        for i in range(10):
            traci.simulationStep()
            vehicles = traci.vehicle.getIDList()
            loaded = traci.simulation.getLoadedNumber()
            departed = traci.simulation.getDepartedNumber()
            print(f"   Step {i+1}: Active={len(vehicles)}, Loaded={loaded}, Departed={departed}")
            
            if len(vehicles) > 0:
                print(f"   ✅ Vehicles detected! IDs: {vehicles[:5]}...")
                break
                
        if len(traci.vehicle.getIDList()) == 0:
            print("   ⚠️ No vehicles appeared after 10 steps")
            
        traci.close()
        process.terminate()
        process.wait()
        
    except Exception as e:
        print(f"❌ Method 2 failed: {e}")
        try:
            process.terminate()
        except:
            pass
    
    print()

def create_test_routes(output_dir):
    """Create a simple test route file that should definitely work"""
    print("=" * 60)
    print("5. CREATING TEST ROUTE FILE")
    print("=" * 60)
    
    test_route_content = """<?xml version="1.0" encoding="UTF-8"?>
<routes xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://sumo.dlr.de/xsd/routes_file.xsd">
    <!-- Simple vehicle type -->
    <vType id="car" accel="2.6" decel="4.5" sigma="0.5" length="5.0" maxSpeed="30.0"/>
    
    <!-- Test vehicles with immediate departure -->
    <vehicle id="test_0" type="car" depart="0.00">
        <route edges="-1606228606#0 -1606228606#1"/>
    </vehicle>
    
    <vehicle id="test_1" type="car" depart="1.00">
        <route edges="-1606228606#0 -1606228606#1"/>
    </vehicle>
    
    <vehicle id="test_2" type="car" depart="2.00">
        <route edges="-1606228606#0 -1606228606#1"/>
    </vehicle>
    
    <!-- Flow for continuous vehicle generation -->
    <flow id="flow_0" type="car" begin="0" end="100" number="20">
        <route edges="-1606228606#0 -1606228606#1"/>
    </flow>
</routes>"""
    
    # First, find valid edges from the network file
    net_file = os.path.join(output_dir, "AddisAbaba.net.xml")
    if os.path.exists(net_file):
        try:
            tree = ET.parse(net_file)
            edges = tree.findall('.//edge[@id]')
            
            # Find some valid edges (not internal)
            valid_edges = [e.get('id') for e in edges if not e.get('id').startswith(':')][:10]
            
            if len(valid_edges) >= 2:
                print(f"✅ Found {len(valid_edges)} valid edges in network")
                
                # Create route with actual edges
                edge_pair = f"{valid_edges[0]} {valid_edges[1]}"
                test_route_content = test_route_content.replace("-1606228606#0 -1606228606#1", edge_pair)
                print(f"   Using edges: {edge_pair}")
            else:
                print("⚠️ Could not find enough valid edges, using defaults")
                
        except Exception as e:
            print(f"⚠️ Could not parse network file: {e}")
    
    # Save test route file
    test_route_file = os.path.join(output_dir, "test_traci_routes.xml")
    with open(test_route_file, 'w') as f:
        f.write(test_route_content)
    
    print(f"✅ Created test route file: test_traci_routes.xml")
    
    # Create test config
    test_config_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<configuration xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:noNamespaceSchemaLocation="http://sumo.dlr.de/xsd/sumoConfiguration.xsd">
    <input>
        <net-file value="AddisAbaba.net.xml"/>
        <route-files value="test_traci_routes.xml"/>
    </input>
    
    <time>
        <begin value="0"/>
        <end value="1000"/>
        <step-length value="1.0"/>
    </time>
    
    <processing>
        <ignore-route-errors value="true"/>
        <time-to-teleport value="300"/>
    </processing>
    
    <report>
        <verbose value="true"/>
        <no-step-log value="false"/>
    </report>
</configuration>"""
    
    test_config_file = os.path.join(output_dir, "test_traci.sumocfg")
    with open(test_config_file, 'w') as f:
        f.write(test_config_content)
    
    print(f"✅ Created test config file: test_traci.sumocfg")
    
    return test_config_file

def main():
    print("\n" + "=" * 60)
    print("SUMO TRACI ROUTE LOADING DIAGNOSTIC")
    print("=" * 60 + "\n")
    
    # Check environment
    check_environment()
    
    # Set working directory to AddisAbabaSumo
    sumo_dir = os.path.join(os.getcwd(), "AddisAbabaSumo")
    if not os.path.exists(sumo_dir):
        print(f"❌ AddisAbabaSumo directory not found at: {sumo_dir}")
        return
        
    os.chdir(sumo_dir)
    print(f"Changed to directory: {os.getcwd()}\n")
    
    # Test with existing config
    existing_config = "AddisAbaba.sumocfg"
    if os.path.exists(existing_config):
        print(f"Testing with existing config: {existing_config}\n")
        
        # Check config files
        if check_config_files(existing_config):
            # Test direct execution
            test_direct_sumo(existing_config)
            
            # Test TraCI methods
            test_traci_methods(existing_config)
    else:
        print(f"❌ Config file not found: {existing_config}")
    
    # Create and test with simple test files
    print("\n" + "=" * 60)
    print("TESTING WITH SIMPLIFIED CONFIG")
    print("=" * 60 + "\n")
    
    test_config = create_test_routes(os.getcwd())
    
    # Test the simplified config
    if check_config_files(test_config):
        test_direct_sumo(test_config)
        test_traci_methods(test_config)
    
    print("\n" + "=" * 60)
    print("DIAGNOSTIC COMPLETE")
    print("=" * 60)
    
    print("\n📋 SUMMARY OF FINDINGS:")
    print("-" * 40)
    print("If vehicles appear in direct SUMO but not TraCI:")
    print("  1. Route file paths may be incorrect when running from different directory")
    print("  2. The --start flag might be causing timing issues")
    print("  3. Routes might be loading after TraCI connects")
    print("\nRECOMMENDED FIXES:")
    print("  1. Use traci.start() instead of manual server + traci.init()")
    print("  2. Always change to config directory before starting")
    print("  3. Use absolute paths or ensure relative paths are correct")
    print("  4. Remove --start flag and control simulation via TraCI")
    print("  5. Add small delay after connection before first step")

if __name__ == "__main__":
    main()
