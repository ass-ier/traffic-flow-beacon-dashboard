#!/usr/bin/env python3
"""
Test SUMO Integration - Final Test
"""

import requests
import time
import json

def test_bridge_health():
    """Test if Python bridge is running"""
    try:
        response = requests.get("http://localhost:8814/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✅ Python Bridge Health:", data)
            return True
        else:
            print(f"❌ Bridge health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Bridge health check error: {e}")
        return False

def test_sumo_startup():
    """Test SUMO startup with quick configuration"""
    try:
        print("🚀 Starting SUMO with quick configuration...")
        response = requests.post(
            "http://localhost:8814/start-sumo", 
            json={},  # Will use quick_test.sumocfg by default
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ SUMO Start Response:", json.dumps(data, indent=2))
            
            if data.get('status') == 'success' and data.get('data', {}).get('connected'):
                return True, data.get('data', {})
            else:
                print("❌ SUMO started but not connected properly")
                return False, data
        else:
            print(f"❌ SUMO start failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False, None
            
    except Exception as e:
        print(f"❌ SUMO start error: {e}")
        return False, None

def test_vehicle_data():
    """Test vehicle data retrieval"""
    try:
        print("🚗 Checking for vehicles...")
        response = requests.get("http://localhost:8814/vehicles", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            vehicles = data.get('data', [])
            print(f"✅ Vehicle Data Retrieved: {len(vehicles)} vehicles found")
            
            if vehicles:
                print("Sample vehicle data:")
                for i, vehicle in enumerate(vehicles[:3]):
                    print(f"  {i+1}. ID: {vehicle.get('id')}, Speed: {vehicle.get('speed', 0):.1f} km/h")
                return True
            else:
                print("⚠️  No vehicles found yet")
                return False
        else:
            print(f"❌ Vehicle data failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Vehicle data error: {e}")
        return False

def test_status():
    """Test status endpoint"""
    try:
        response = requests.get("http://localhost:8814/status", timeout=5)
        if response.status_code == 200:
            data = response.json()
            status_data = data.get('data', {})
            print("📊 System Status:")
            print(f"  - Connected: {status_data.get('connected')}")
            print(f"  - SUMO Running: {status_data.get('sumo_running')}")
            print(f"  - Vehicle Count: {status_data.get('vehicle_count')}")
            print(f"  - Simulation Time: {status_data.get('simulation_time')}")
            return True
        else:
            print(f"❌ Status check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Status check error: {e}")
        return False

def main():
    """Main test function"""
    print("🔍 SUMO Integration - Final Test")
    print("=" * 50)
    
    # Test 1: Bridge Health
    print("\n1. Testing Python Bridge Health...")
    bridge_ok = test_bridge_health()
    
    if not bridge_ok:
        print("❌ Python bridge is not running. Please start it first:")
        print("   cd backend/python-bridge")
        print("   py sumo_bridge.py")
        return False
    
    # Test 2: SUMO Startup
    print("\n2. Testing SUMO Startup...")
    sumo_ok, sumo_data = test_sumo_startup()
    
    if not sumo_ok:
        print("❌ SUMO startup failed")
        return False
    
    # Test 3: Wait and check status
    print("\n3. Waiting for simulation to initialize...")
    time.sleep(3)
    test_status()
    
    # Test 4: Vehicle Data
    print("\n4. Testing Vehicle Data...")
    vehicles_ok = test_vehicle_data()
    
    # Test 5: Wait and try again if no vehicles
    if not vehicles_ok:
        print("\n5. Waiting longer and retrying...")
        time.sleep(5)
        vehicles_ok = test_vehicle_data()
    
    # Final Status
    print("\n" + "=" * 50)
    print("📊 FINAL TEST RESULTS")
    print("=" * 50)
    
    if bridge_ok and sumo_ok and vehicles_ok:
        print("🎉 ALL TESTS PASSED! SUMO integration is working!")
        print("✅ Python Bridge: Running")
        print("✅ SUMO Connection: Connected")
        print("✅ Vehicle Data: Available")
        print("\n🚀 You can now use the frontend START button!")
        return True
    else:
        print("⚠️  Some tests failed:")
        print(f"  - Python Bridge: {'✅' if bridge_ok else '❌'}")
        print(f"  - SUMO Connection: {'✅' if sumo_ok else '❌'}")
        print(f"  - Vehicle Data: {'✅' if vehicles_ok else '❌'}")
        return False

if __name__ == '__main__':
    main()