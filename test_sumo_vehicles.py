#!/usr/bin/env python3
"""
SUMO Vehicle Loading Test
Tests if vehicles are properly loading from routes.xml
"""

import subprocess
import os
import time
import sys
import xml.etree.ElementTree as ET

def count_vehicles_in_routes():
    """Count vehicles defined in routes.xml"""
    routes_file = "AddisAbabaSumo/routes.xml"
    
    if not os.path.exists(routes_file):
        print(f"❌ Routes file not found: {routes_file}")
        return 0
    
    try:
        tree = ET.parse(routes_file)
        root = tree.getroot()
        
        vehicle_count = len(root.findall('.//vehicle'))
        flow_count = len(root.findall('.//flow'))
        
        print(f"✓ Routes file found: {routes_file}")
        print(f"  - Vehicles defined: {vehicle_count}")
        print(f"  - Flows defined: {flow_count}")
        
        # Check departure times of first few vehicles
        vehicles = root.findall('.//vehicle')[:5]
        print(f"  - First 5 vehicle departure times:")
        for i, vehicle in enumerate(vehicles):
            depart_time = vehicle.get('depart', 'unknown')
            vehicle_id = vehicle.get('id', 'unknown')
            print(f"    {i+1}. {vehicle_id}: depart={depart_time}")
        
        return vehicle_count + flow_count
        
    except Exception as e:
        print(f"❌ Error parsing routes file: {e}")
        return 0

def test_sumo_config():
    """Test SUMO configuration file"""
    config_file = "AddisAbabaSumo/AddisAbaba.sumocfg"
    
    if not os.path.exists(config_file):
        print(f"❌ Config file not found: {config_file}")
        return False
    
    try:
        tree = ET.parse(config_file)
        root = tree.getroot()
        
        # Check route files
        route_files = root.find('.//route-files')
        if route_files is not None:
            route_value = route_files.get('value')
            print(f"✓ Config file found: {config_file}")
            print(f"  - Route files: {route_value}")
        
        # Check simulation time
        begin_elem = root.find('.//begin')
        end_elem = root.find('.//end')
        
        if begin_elem is not None and end_elem is not None:
            begin_time = begin_elem.get('value', '0')
            end_time = end_elem.get('value', 'unknown')
            print(f"  - Simulation time: {begin_time} to {end_time} seconds")
        
        return True
        
    except Exception as e:
        print(f"❌ Error parsing config file: {e}")
        return False

def test_sumo_installation():
    """Test if SUMO is properly installed"""
    try:
        result = subprocess.run(['sumo', '--version'], 
                              capture_output=True, text=True, timeout=10)
        
        if result.returncode == 0:
            version = result.stdout.split('\n')[0]
            print(f"✓ SUMO installation found: {version}")
            return True
        else:
            print(f"❌ SUMO installation issue: {result.stderr}")
            return False
            
    except FileNotFoundError:
        print("❌ SUMO not found in PATH. Please install SUMO and add to PATH.")
        return False
    except Exception as e:
        print(f"❌ Error checking SUMO: {e}")
        return False

def test_sumo_dry_run():
    """Test SUMO with dry run to check for configuration issues"""
    config_file = "AddisAbabaSumo/AddisAbaba.sumocfg"
    
    if not os.path.exists(config_file):
        print(f"❌ Cannot run dry test: config file not found")
        return False
    
    try:
        print("🔄 Running SUMO dry test (first 10 seconds)...")
        
        # Change to AddisAbabaSumo directory
        original_dir = os.getcwd()
        os.chdir("AddisAbabaSumo")
        
        cmd = [
            'sumo',
            '-c', 'AddisAbaba.sumocfg',
            '--begin', '0',
            '--end', '10',  # Only run for 10 seconds
            '--no-step-log',
            '--verbose'
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        
        os.chdir(original_dir)  # Restore original directory
        
        if result.returncode == 0:
            print("✓ SUMO dry run successful!")
            
            # Look for vehicle information in output
            output = result.stdout + result.stderr
            if 'vehicles' in output.lower() or 'loaded' in output.lower():
                print("  - Vehicles appear to be loading correctly")
                
                # Extract some statistics from output
                lines = output.split('\n')
                for line in lines:
                    if 'loaded' in line.lower() or 'departed' in line.lower():
                        print(f"  - {line.strip()}")
                        
            return True
        else:
            print(f"❌ SUMO dry run failed:")
            print(f"  Return code: {result.returncode}")
            if result.stderr:
                print(f"  Error output: {result.stderr}")
            return False
            
    except subprocess.TimeoutExpired:
        print("❌ SUMO dry run timed out")
        return False
    except Exception as e:
        print(f"❌ Error in dry run: {e}")
        return False

def main():
    """Main diagnostic function"""
    print("🔍 SUMO Vehicle Loading Diagnostic Test")
    print("=" * 50)
    
    # Test 1: SUMO Installation
    print("\n1. Testing SUMO Installation...")
    sumo_ok = test_sumo_installation()
    
    # Test 2: Configuration Files
    print("\n2. Testing Configuration Files...")
    config_ok = test_sumo_config()
    
    # Test 3: Vehicle Definitions
    print("\n3. Testing Vehicle Definitions...")
    vehicle_count = count_vehicles_in_routes()
    
    # Test 4: SUMO Dry Run
    print("\n4. Testing SUMO Dry Run...")
    dry_run_ok = test_sumo_dry_run()
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 DIAGNOSTIC SUMMARY")
    print("=" * 50)
    
    tests_passed = 0
    total_tests = 4
    
    if sumo_ok:
        print("✅ SUMO Installation: OK")
        tests_passed += 1
    else:
        print("❌ SUMO Installation: FAILED")
    
    if config_ok:
        print("✅ Configuration Files: OK")
        tests_passed += 1
    else:
        print("❌ Configuration Files: FAILED")
    
    if vehicle_count > 0:
        print(f"✅ Vehicle Definitions: OK ({vehicle_count} vehicles/flows)")
        tests_passed += 1
    else:
        print("❌ Vehicle Definitions: FAILED (no vehicles found)")
    
    if dry_run_ok:
        print("✅ SUMO Dry Run: OK")
        tests_passed += 1
    else:
        print("❌ SUMO Dry Run: FAILED")
    
    print(f"\nOverall Score: {tests_passed}/{total_tests} tests passed")
    
    if tests_passed == total_tests:
        print("🎉 All tests passed! SUMO should work with vehicles.")
    else:
        print("⚠️  Some tests failed. Please fix the issues above.")
        
    return tests_passed == total_tests

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)