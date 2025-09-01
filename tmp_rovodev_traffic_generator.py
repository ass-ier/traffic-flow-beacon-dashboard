#!/usr/bin/env python3
"""
Generate SUMO traffic flows based on Addis Ababa traffic data
"""
import xml.etree.ElementTree as ET

# Traffic flow data from the document
traffic_data = {
    "Meskel_Square": {"flow": 1600, "delay": 400, "los": "F"},
    "Jacros": {"flow": 1500, "delay": 431, "los": "F"},
    "Lebu": {"flow": 1500, "delay": 126, "los": "F"},
    "Imperial": {"flow": 1500, "delay": 710, "los": "F"},
    "Saris_Abo": {"flow": 1300, "delay": 350, "los": "F"},
    "Megenagna": {"flow": 1400, "delay": 350, "los": "F"},
    "Bole_Medhanealem": {"flow": 1400, "delay": 375, "los": "F"},
    "Ayat": {"flow": 1200, "delay": 350, "los": "F"},
    "Gofa_Sefer": {"flow": 1200, "delay": 275, "los": "E"},
    "Moyale_Mexico": {"flow": 1200, "delay": 350, "los": "E"},
    "Tersebi_Torhayloch": {"flow": 1200, "delay": 400, "los": "E"},
    "Gerji_Coptic": {"flow": 1000, "delay": 200, "los": "D"},
    "Atlas": {"flow": 1200, "delay": 300, "los": "E"},
    "Kera": {"flow": 1000, "delay": 250, "los": "E"}
}

# Vehicle composition from the document
vehicle_composition = {
    "passenger": 0.70,
    "minibus": 0.20,
    "truck": 0.10
}

def create_vehicle_types():
    """Create vehicle type definitions"""
    root = ET.Element("additional")
    
    # Passenger car
    vtype = ET.SubElement(root, "vType")
    vtype.set("id", "passenger")
    vtype.set("accel", "2.6")
    vtype.set("decel", "4.5")
    vtype.set("sigma", "0.5")
    vtype.set("length", "4.5")
    vtype.set("maxSpeed", "50")
    vtype.set("color", "blue")
    
    # Minibus
    vtype = ET.SubElement(root, "vType")
    vtype.set("id", "minibus")
    vtype.set("accel", "1.8")
    vtype.set("decel", "4.0")
    vtype.set("sigma", "0.6")
    vtype.set("length", "7.0")
    vtype.set("maxSpeed", "45")
    vtype.set("color", "yellow")
    
    # Truck
    vtype = ET.SubElement(root, "vType")
    vtype.set("id", "truck")
    vtype.set("accel", "1.2")
    vtype.set("decel", "3.5")
    vtype.set("sigma", "0.7")
    vtype.set("length", "12.0")
    vtype.set("maxSpeed", "40")
    vtype.set("color", "red")
    
    return root

def create_flows():
    """Create traffic flows based on the data"""
    root = ET.Element("routes")
    
    # Add vehicle types
    vtypes = create_vehicle_types()
    for vtype in vtypes:
        root.append(vtype)
    
    flow_id = 0
    
    # Create flows for each intersection area
    for intersection, data in traffic_data.items():
        base_flow = data["flow"]
        
        # Create flows for different vehicle types
        for vtype, proportion in vehicle_composition.items():
            flow_id += 1
            flow = ET.SubElement(root, "flow")
            flow.set("id", f"flow_{intersection}_{vtype}_{flow_id}")
            flow.set("type", vtype)
            flow.set("begin", "0")
            flow.set("end", "3600")
            flow.set("vehsPerHour", str(int(base_flow * proportion)))
            flow.set("departLane", "random")
            flow.set("departSpeed", "random")
            
            # Add route (simplified - using main edges)
            route = ET.SubElement(flow, "route")
            route.set("edges", "edge1 edge2 edge3")  # Placeholder - needs actual network edges
    
    return root

def main():
    """Generate the traffic flow file"""
    flows = create_flows()
    
    # Write to file
    tree = ET.ElementTree(flows)
    ET.indent(tree, space="  ", level=0)
    tree.write("AddisAbabaSumo/enhanced_traffic_flows.xml", encoding="utf-8", xml_declaration=True)
    
    print("Generated enhanced_traffic_flows.xml with Addis Ababa traffic data")
    print(f"Total intersections: {len(traffic_data)}")
    print("Vehicle composition: 70% passenger, 20% minibus, 10% truck")

if __name__ == "__main__":
    main()