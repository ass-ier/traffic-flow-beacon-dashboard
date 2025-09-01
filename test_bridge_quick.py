#!/usr/bin/env python3
"""
Quick test for SUMO bridge connection and data retrieval
"""

import requests
import time

def test_bridge_connection():
    """Test if the Python bridge is working correctly with SUMO"""
    base_url = "http://localhost:8814"
    
    print("🔍 Testing SUMO Bridge Connection...")
    
    try:
        # Test health endpoint
        response = requests.get(f"{base_url}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Bridge Health: {data.get('status')}")
            print(f"   Connected: {data.get('connected')}")
            print(f"   Simulation Running: {data.get('simulation_running')}")
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to Python bridge on port 8814")
        print("   Make sure to start the bridge with: cd backend/python-bridge && py sumo_bridge.py")
        return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

    try:
        # Test status endpoint
        response = requests.get(f"{base_url}/status", timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'success':
                status_info = data.get('data', {})
                print(f"✅ Status Check:")
                print(f"   SUMO Connected: {status_info.get('connected')}")
                print(f"   Simulation Time: {status_info.get('simulation_time', 0)}")
                print(f"   Vehicle Count: {status_info.get('vehicle_count', 0)}")
            else:
                print(f"❌ Status error: {data.get('message')}")
                return False
        else:
            print(f"❌ Status request failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Status check error: {e}")
        return False

    try:
        # Test vehicles endpoint
        response = requests.get(f"{base_url}/vehicles", timeout=5)
        if response.status_code == 200:
            data = response.json()
            vehicles = data.get('data', [])
            print(f"✅ Vehicles Data:")
            print(f"   Total Vehicles: {len(vehicles)}")
            
            if vehicles:
                sample_vehicle = vehicles[0]
                print(f"   Sample Vehicle ID: {sample_vehicle.get('id')}")
                print(f"   Position: {sample_vehicle.get('position', {})}")
                print(f"   Speed: {sample_vehicle.get('speed', 0)} km/h")
            else:
                print("   ⚠️ No vehicles found - check if simulation is running")
                
        else:
            print(f"❌ Vehicles request failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Vehicles check error: {e}")
        return False

    print("\n🎉 All tests passed! The SUMO bridge is working correctly.")
    print("\n💡 Next steps:")
    print("   1. Check SUMO-GUI window for vehicle movement")
    print("   2. Use play/pause controls in SUMO to control simulation")
    print("   3. The frontend dashboard should now show real-time data")
    
    return True

if __name__ == "__main__":
    success = test_bridge_connection()
    if not success:
        print("\n🔧 Troubleshooting:")
        print("   1. Make sure SUMO is started with the frontend Start button")
        print("   2. Ensure Python bridge is running: cd backend/python-bridge && py sumo_bridge.py")
        print("   3. Check that SUMO is running with --remote-port 8813")