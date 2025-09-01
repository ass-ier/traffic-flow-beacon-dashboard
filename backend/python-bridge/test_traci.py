#!/usr/bin/env python3
"""
Simple TraCI connection test
"""

import traci
import sys

def test_traci_connection():
    try:
        print("Testing TraCI connection to SUMO...")
        print("Attempting to connect to localhost:8813")
        
        # Try to connect
        traci.init(port=8813, host='localhost')
        print("✅ Successfully connected to SUMO!")
        
        # Test basic commands
        current_time = traci.simulation.getTime()
        print(f"Current simulation time: {current_time}")
        
        # Get vehicle list
        vehicles = traci.vehicle.getIDList()
        print(f"Number of vehicles: {len(vehicles)}")
        if vehicles:
            print(f"Vehicle IDs: {vehicles[:5]}...")  # Show first 5
        
        # Get traffic light list
        tls = traci.trafficlight.getIDList()
        print(f"Number of traffic lights: {len(tls)}")
        if tls:
            print(f"Traffic light IDs: {tls[:3]}...")  # Show first 3
        
        # Get edge list
        edges = traci.edge.getIDList()
        print(f"Number of edges: {len(edges)}")
        if edges:
            print(f"Edge IDs: {edges[:5]}...")  # Show first 5
        
        print("✅ TraCI connection test successful!")
        
        # Close connection
        traci.close()
        return True
        
    except Exception as e:
        print(f"❌ TraCI connection failed: {e}")
        print(f"Error type: {type(e).__name__}")
        return False

if __name__ == '__main__':
    success = test_traci_connection()
    sys.exit(0 if success else 1)