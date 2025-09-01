#!/usr/bin/env python3
import traci
import time

try:
    print("Attempting to connect to SUMO on port 8813...")
    traci.init(port=8813, host='localhost')
    print("✅ Successfully connected to SUMO!")
    
    # Get basic info
    current_time = traci.simulation.getTime()
    print(f"Current simulation time: {current_time}")
    
    # Get vehicle count
    vehicles = traci.vehicle.getIDList()
    print(f"Number of vehicles: {len(vehicles)}")
    
    # Get loaded vehicles
    loaded = traci.simulation.getLoadedNumber()
    departed = traci.simulation.getDepartedNumber()
    print(f"Loaded vehicles: {loaded}")
    print(f"Departed vehicles: {departed}")
    
    # Try to advance simulation by a few steps
    print("Advancing simulation...")
    for i in range(5):
        traci.simulationStep()
        current_time = traci.simulation.getTime()
        vehicles = traci.vehicle.getIDList()
        print(f"Step {i+1}: Time={current_time}, Vehicles={len(vehicles)}")
        time.sleep(0.5)
    
    traci.close()
    print("✅ Test completed successfully!")
    
except Exception as e:
    print(f"❌ Error: {e}")
    print(f"Error type: {type(e).__name__}")