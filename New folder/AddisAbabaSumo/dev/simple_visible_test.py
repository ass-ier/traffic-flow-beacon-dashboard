#!/usr/bin/env python3
"""
Simple Visible Test - Creates obvious traffic for troubleshooting
"""

import random

def create_simple_visible_test():
    """Create simple, very visible traffic"""
    
    print("🔍 Creating simple visible test...")
    
    # Use actual edge IDs from the network
    test_edges = [
        "-1006330615#1", "-1007600929#1", "-1008288320",
        "-1008647395", "-1010492351#2", "-1010492351#3",
        "-1010492352", "-101558947#0", "-101558947#1",
        "-101558949", "-1017312864#1", "-1017312864#2",
        "-1017312865", "-1017317048", "-1017321336#1"
    ]
    
    # Vehicle types
    vehicle_types = ['personal', 'taxi', 'motorcycle']
    
    # Create very simple, visible trips
    trips = []
    trip_id = 0
    
    # Generate 500 trips that should be very visible
    for i in range(500):
        # Use only the test edges
        start_edge = random.choice(test_edges)
        end_edge = random.choice(test_edges)
        
        # Make sure start and end are different
        while end_edge == start_edge:
            end_edge = random.choice(test_edges)
        
        # Random vehicle type
        vtype = random.choice(vehicle_types)
        
        # Departure time - start immediately and spread over 100 seconds
        depart_time = random.randint(0, 100)
        
        trip = {
            'id': f"visible_trip_{trip_id}",
            'from': start_edge,
            'to': end_edge,
            'depart': depart_time,
            'type': vtype
        }
        
        trips.append(trip)
        trip_id += 1
        
        # Add additional vehicles for density (50% chance)
        if random.random() < 0.5:
            additional_depart = depart_time + random.randint(1, 2)
            additional_trip = {
                'id': f"visible_trip_{trip_id}_add",
                'from': start_edge,
                'to': end_edge,
                'depart': additional_depart,
                'type': vtype
            }
            trips.append(additional_trip)
            trip_id += 1
    
    # Sort trips by departure time
    trips.sort(key=lambda x: x['depart'])
    
    # Write to XML file
    with open("simple_visible_routes.xml", "w") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n')
        f.write('<routes>\n')
        
        for trip in trips:
            f.write(f'    <trip id="{trip["id"]}" from="{trip["from"]}" to="{trip["to"]}" depart="{trip["depart"]}" type="{trip["type"]}"/>\n')
        
        f.write('</routes>\n')
    
    print(f"✅ Generated {len(trips)} simple visible trips")
    print("🚗 Using common road edges that should be visible")
    print("🎯 Run: sumo-gui -c simple_visible.sumocfg")
    print("\n📋 Troubleshooting tips:")
    print("1. Check the status bar for vehicle count")
    print("2. Look for the 'Vehicles' tab in the right panel")
    print("3. Try zooming in on the network")
    print("4. Check if simulation is paused (play button)")

if __name__ == "__main__":
    create_simple_visible_test() 