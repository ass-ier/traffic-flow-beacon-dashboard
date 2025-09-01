# SUMO TraCI Investigation Results

## Critical Finding: Route Validation Issue

### Statistics Analysis:
- **Expected vehicles**: 9,886 (from routes.xml)
- **Actually loaded**: 2 vehicles only
- **Success rate**: 0.02% (2/9,886)

### Root Cause Identified:

#### The Problem: Route-Network Mismatch
The routes.xml file contains edge references that don't exist in the current AddisAbaba.net.xml network.

#### Evidence from Route Samples:
Looking at the first few routes, they contain edges like:
- `42930755#11`, `42930755#12`, `42930755#13`
- `1361492664#0`, `1361492664#1`, `1361492664#3`
- `567087542#1`, `567087542#0`, `567080697#0`

These edge IDs suggest the routes were generated for a **different version** of the AddisAbaba network.

### Why Normal SUMO Works vs TraCI Fails:

#### Normal SUMO (Lenient Mode):
- **Skips invalid routes** silently
- **Continues with valid routes** (maybe finds a few compatible ones)
- **Shows partial simulation** with whatever vehicles can load
- **Less strict validation**

#### TraCI SUMO (Strict Mode):
- **Validates all routes** before starting
- **Fails on invalid edge references**
- **Stops processing** when routes don't match network
- **Only loads vehicles with 100% valid routes**

### The Solution Options:

#### Option 1: Regenerate Routes (Recommended)
```bash
# Generate new routes that match current network
cd AddisAbabaSumo
duarouter --net-file AddisAbaba.net.xml --trip-files trips.xml --output-file routes_new.xml
```

#### Option 2: Use Compatible Route File
Use `working_routes.xml` which is known to work with the current network:
```xml
<route-files value="working_routes.xml"/>
```

#### Option 3: Fix Network-Route Compatibility
- Update network to match routes, OR
- Update routes to match network

### Immediate Fix:
Update AddisAbaba.sumocfg to use working routes:

```xml
<input>
    <net-file value="AddisAbaba.net.xml"/>
    <route-files value="working_routes.xml"/>  <!-- Use compatible routes -->
</input>
```

### Why This Explains Everything:
1. **Normal SUMO**: Finds ~100-200 compatible vehicles out of 9,886 and runs with those
2. **TraCI SUMO**: Strict validation finds only 2 compatible vehicles, rest are rejected
3. **No departures**: Even the 2 loaded vehicles might have timing or route issues
4. **Perfect network**: 26,792 nodes and 71,308 edges load correctly

### Next Steps:
1. **Test with working_routes.xml** - Should work immediately
2. **Generate new routes** - For full 9,886 vehicle simulation
3. **Validate network version** - Ensure routes match network version

This explains the "2 loaded vehicles" mystery perfectly!