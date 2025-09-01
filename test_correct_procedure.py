#!/usr/bin/env python3
"""
SUMO Integration Test - Following Correct Specifications
Tests the proper startup sequence as specified in project requirements
"""

import subprocess
import requests
import time
import os
import json

def start_sumo_gui():
    """Start SUMO-GUI as per specifications: sumo-gui -c AddisAbaba.sumocfg --remote-port 8813 --step-length 1.0"""
    try:
        print("🚀 Starting SUMO-GUI with correct parameters...")
        
        # Change to AddisAbabaSumo directory
        os.chdir("AddisAbabaSumo")
        
        # Start SUMO-GUI as per specification
        cmd = [
            "sumo-gui",
            "-c", "AddisAbaba.sumocfg",
            "--remote-port", "8813",
            "--step-length", "1.0"
        ]
        
        print(f"📋 Running: {' '.join(cmd)}")
        print("📝 Note: SUMO-GUI will open and wait for TraCI connection")
        print("📝 You will need to manually click PLAY in SUMO-GUI after connection")
        
        # Start SUMO in background
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=os.getcwd()
        )
        
        print(f"✅ SUMO-GUI started with PID: {process.pid}")
        print("⏱️  Waiting 5 seconds for SUMO to initialize...")
        time.sleep(5)
        
        # Check if process is still running
        if process.poll() is None:
            print("✅ SUMO-GUI is running and waiting for TraCI connection")
            return True, process
        else:
            stdout, stderr = process.communicate()
            print(f"❌ SUMO-GUI terminated: {stderr.decode()}")
            return False, None
            
    except Exception as e:
        print(f"❌ Error starting SUMO-GUI: {e}")
        return False, None

def start_python_bridge():
    """Start Python bridge service"""
    try:
        print("🐍 Starting Python bridge service...")
        
        # Go back to root and navigate to python-bridge
        os.chdir("..")
        os.chdir("backend/python-bridge")
        
        # Start Python bridge
        process = subprocess.Popen(
            ["py", "sumo_bridge.py"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        print(f"✅ Python bridge started with PID: {process.pid}")
        print("⏱️  Waiting 3 seconds for bridge to initialize...")
        time.sleep(3)
        
        # Check if process is running
        if process.poll() is None:
            print("✅ Python bridge is running")
            return True, process
        else:
            stdout, stderr = process.communicate()
            print(f"❌ Python bridge failed: {stderr.decode()}")
            return False, None
            
    except Exception as e:
        print(f"❌ Error starting Python bridge: {e}")
        return False, None

def test_connection():
    """Test TraCI connection"""
    try:
        print("🔗 Testing TraCI connection...")
        
        response = requests.post(
            "http://localhost:8814/connect",
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            print("✅ TraCI Connection Response:", json.dumps(data, indent=2))
            
            if data.get('status') == 'success':
                return True
            else:
                print("❌ Connection failed:", data.get('message'))
                return False
        else:
            print(f"❌ Connection request failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Connection test error: {e}")
        return False

def check_status():
    """Check system status"""
    try:
        print("📊 Checking system status...")
        
        response = requests.get("http://localhost:8814/status", timeout=5)
        if response.status_code == 200:
            data = response.json()
            status_data = data.get('data', {})
            
            print(f"  - Connected: {status_data.get('connected')}")
            print(f"  - SUMO Running: {status_data.get('sumo_running')}")
            print(f"  - Vehicle Count: {status_data.get('vehicle_count')}")
            print(f"  - Simulation Time: {status_data.get('simulation_time')}")
            
            return status_data.get('connected', False)
        else:
            print(f"❌ Status check failed: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Status check error: {e}")
        return False

def main():
    """Main test function following correct specifications"""
    print("🔍 SUMO Integration Test - Correct Specifications")
    print("=" * 60)
    print("Following project specs:")
    print("1. Start SUMO-GUI with: sumo-gui -c AddisAbaba.sumocfg --remote-port 8813 --step-length 1.0")
    print("2. Start Python bridge: py sumo_bridge.py")
    print("3. Connect via TraCI (3-second delay)")
    print("4. Manual PLAY button in SUMO-GUI")
    print("=" * 60)
    
    # Step 1: Start SUMO-GUI
    print("\\n1. Starting SUMO-GUI...")
    sumo_ok, sumo_process = start_sumo_gui()
    
    if not sumo_ok:
        print("❌ Failed to start SUMO-GUI")
        return False
    
    # Step 2: Start Python Bridge
    print("\\n2. Starting Python Bridge...")
    bridge_ok, bridge_process = start_python_bridge()
    
    if not bridge_ok:
        print("❌ Failed to start Python bridge")
        if sumo_process:
            sumo_process.terminate()
        return False
    
    # Step 3: Wait and connect
    print("\\n3. Waiting for services to stabilize...")
    time.sleep(3)  # 3-second delay as per spec
    
    connection_ok = test_connection()
    
    # Step 4: Check status
    print("\\n4. Checking system status...")
    status_ok = check_status()
    
    # Final instructions
    print("\\n" + "=" * 60)
    print("📋 NEXT STEPS")
    print("=" * 60)
    
    if connection_ok and status_ok:
        print("🎉 SUMO and Python bridge are connected!")
        print("👆 Now manually click the PLAY button (▶) in SUMO-GUI")
        print("🚗 Vehicles should start appearing and moving")
        print("🌐 You can now use the frontend dashboard")
    else:
        print("⚠️  Connection issues detected")
        print("🔧 Check SUMO-GUI window for error messages")
    
    print("\\n📝 Processes running:")
    print(f"  - SUMO-GUI PID: {sumo_process.pid if sumo_process else 'Not running'}")
    print(f"  - Python Bridge PID: {bridge_process.pid if bridge_process else 'Not running'}")
    print("\\n🛑 To stop: Close SUMO-GUI window and press Ctrl+C in Python bridge terminal")
    
    return connection_ok and status_ok

if __name__ == '__main__':
    try:
        main()
    except KeyboardInterrupt:
        print("\\n🛑 Test interrupted by user")
    except Exception as e:
        print(f"\\n❌ Test failed with error: {e}")