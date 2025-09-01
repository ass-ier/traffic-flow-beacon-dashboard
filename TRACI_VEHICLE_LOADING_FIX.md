# SUMO TraCI Vehicle Loading Fix

## Problem Description
When running SUMO through TraCI (Python bridge), vehicles were not appearing in the simulation even though:
- The same configuration file works perfectly when run directly with SUMO GUI
- The network file (.net.xml) loads correctly
- The route file (.rou.xml) contains valid vehicle definitions

## Root Cause
The issue was caused by the way SUMO was being started through TraCI:

1. **Wrong Connection Method**: Using manual subprocess + `traci.init()` instead of `traci.start()`
2. **Working Directory Issue**: Not changing to the config directory, causing relative paths in config files to fail
3. **Command Flag Issue**: Using `--start` flag which causes timing issues with TraCI

## The Solution

### Before (Problematic Code)
```python
# Manual subprocess approach - DOESN'T LOAD VEHICLES PROPERLY
sumo_process = subprocess.Popen([
    'sumo',
    '-c', config_path,
    '--remote-port', '8813',
    '--start'  # This flag causes issues!
])
time.sleep(5)
traci.init(port=8813)  # Manual connection
```

### After (Fixed Code)
```python
# Proper TraCI approach - LOADS VEHICLES CORRECTLY
config_dir = os.path.dirname(config_path)
config_file = os.path.basename(config_path)

# CRITICAL: Change to config directory
original_cwd = os.getcwd()
os.chdir(config_dir)

# Build command WITHOUT --start flag
sumo_cmd = [
    'sumo',
    '-c', config_file,
    '--step-length', '1.0',
    '--no-warnings',
    '--no-step-log',
    '--quit-on-end'
    # NO --start flag!
]

# Use traci.start() - the proper way
traci.start(sumo_cmd)

# Restore original directory after starting
os.chdir(original_cwd)
```

## Key Points for the Fix

### 1. Use `traci.start()` Instead of Manual Server
- `traci.start()` properly handles the SUMO process lifecycle
- It ensures proper synchronization between SUMO and TraCI
- Automatically manages the connection setup

### 2. Change Working Directory
- SUMO config files often use relative paths for route and network files
- Must change to the config directory before starting SUMO
- Restore the original directory after starting

### 3. Remove `--start` Flag
- The `--start` flag causes SUMO to begin simulation immediately
- This can cause synchronization issues with TraCI
- Let TraCI control when the simulation starts

### 4. Additional Optimization Flags
For large networks and route files, add these flags:
```python
'--xml-validation', 'never',      # Skip XML validation for speed
'--ignore-route-errors',          # Continue even with invalid routes
'--eager-insert',                 # Insert vehicles as soon as possible
'--max-depart-delay', '3600',     # Allow delayed departures
'--time-to-teleport', '300'       # Teleport stuck vehicles
```

## Implementation Steps

### Step 1: Update Your SUMO Bridge
Replace the connection method in your `sumo_bridge.py` with the fixed version from `sumo_bridge_fixed.py`.

### Step 2: Test the Fix
Run the test script to verify vehicles are loading:
```bash
python test_traci_fix.py
```

### Step 3: Update Your Application
Update any code that starts SUMO through TraCI to use the new approach.

## Files Created

1. **`fix_traci_routes.py`** - Diagnostic script to identify the issue
2. **`sumo_bridge_fixed.py`** - Fixed version of the SUMO bridge with proper TraCI connection
3. **`test_traci_fix.py`** - Simple test to verify the fix works

## Verification
After applying the fix, you should see:
- Vehicles appearing immediately when simulation starts
- Proper vehicle counts in `traci.simulation.getLoadedNumber()`
- Vehicles visible in `traci.vehicle.getIDList()`
- If using GUI, vehicles visible on the map

## Common Pitfalls to Avoid

1. **Don't mix approaches** - Either use `traci.start()` OR manual subprocess, not both
2. **Don't skip directory change** - Always change to config directory for relative paths
3. **Don't use --start with TraCI** - Let TraCI control simulation timing
4. **Don't forget to close** - Always call `traci.close()` when done

## Testing Different Configurations

If you have multiple SUMO configurations, test each one:

```python
configs = [
    'AddisAbaba.sumocfg',
    'AddisAbaba_working.sumocfg',
    'test_traci.sumocfg'
]

for config in configs:
    config_path = os.path.join('AddisAbabaSumo', config)
    if os.path.exists(config_path):
        # Test with the fixed connection method
        success = test_connection(config_path)
        print(f"{config}: {'✅ Working' if success else '❌ Failed'}")
```

## Conclusion
The vehicle loading issue in TraCI was caused by improper connection setup and working directory management. Using `traci.start()` with proper directory handling resolves the issue completely. Vehicles now appear correctly in both headless and GUI modes when using TraCI.
