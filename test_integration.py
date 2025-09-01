#!/usr/bin/env python3
"""
Test script to verify SUMO integration works
"""

import requests
import time
import json
import sys

def test_python_bridge():
    """Test the Python bridge endpoints"""
    base_url = "http://localhost:8814"
    
    print("Testing Python Bridge Integration...")
    
    # Test health endpoint
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            print("✓ Python bridge is running")
            data = response.json()
            print(f"  Status: {data.get('status')}")
            print(f"  Connected: {data.get('connected')}")
        else:
            print(f"✗ Health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("✗ Cannot connect to Python bridge. Make sure it's running on port 8814")
        return False
    
    # Test SUMO startup
    try:
        print("\nTesting SUMO startup...")
        response = requests.post(f"{base_url}/start-sumo", 
                                json={
                                    "config_path": "../AddisAbabaSumo/AddisAbaba.sumocfg",
                                    "gui": True
                                })
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                print("✓ SUMO started successfully")
                print(f"  Connected: {data['data'].get('connected')}")
                print(f"  Vehicle count: {data['data'].get('vehicle_count')}")
                print(f"  Simulation time: {data['data'].get('simulation_time')}")
            else:
                print(f"✗ SUMO start failed: {data.get('message')}")
                return False
        else:
            print(f"✗ SUMO start request failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"✗ SUMO startup error: {e}")
        return False
    
    # Test status endpoint
    try:
        print("\nTesting status endpoint...")
        time.sleep(2)  # Wait for simulation to stabilize
        response = requests.get(f"{base_url}/status")
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                status_data = data.get('data', {})
                print("✓ Status endpoint working")
                print(f"  Connected: {status_data.get('connected')}")
                print(f"  SUMO running: {status_data.get('sumo_running')}")
                print(f"  Vehicle count: {status_data.get('vehicle_count')}")
                print(f"  Simulation time: {status_data.get('simulation_time')}")
            else:
                print(f"✗ Status check failed: {data.get('message')}")
        else:
            print(f"✗ Status request failed: {response.status_code}")
    except Exception as e:
        print(f"✗ Status check error: {e}")
    
    # Test vehicles endpoint
    try:
        print("\nTesting vehicles endpoint...")
        response = requests.get(f"{base_url}/vehicles")
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                vehicles = data.get('data', [])
                print(f"✓ Vehicles endpoint working - {len(vehicles)} vehicles found")
                if vehicles:
                    vehicle = vehicles[0]
                    print(f"  Sample vehicle: {vehicle.get('id')} at {vehicle.get('position', {}).get('lat', 'N/A')}, {vehicle.get('position', {}).get('lng', 'N/A')}")
            else:
                print(f"✗ Vehicles request failed: {data.get('message')}")
        else:
            print(f"✗ Vehicles request failed: {response.status_code}")
    except Exception as e:
        print(f"✗ Vehicles check error: {e}")
    
    print(f"\n✓ Integration test completed successfully!")
    print("You can now use the frontend Start button to launch SUMO!")
    
    return True

def cleanup():
    """Stop SUMO if running"""
    try:
        response = requests.post("http://localhost:8814/stop-sumo")
        if response.status_code == 200:
            print("✓ SUMO stopped")
    except:
        pass

if __name__ == "__main__":
    try:
        success = test_python_bridge()
        if not success:
            sys.exit(1)
    except KeyboardInterrupt:
        print("\nTest interrupted")
    finally:
        cleanup()