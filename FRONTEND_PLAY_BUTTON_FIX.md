# Frontend Play Button Fix

## Problem Identified
The frontend play button was not starting SUMO, returning a 500 error: "Failed to start SUMO process"

## Root Cause
**SUMO executables not in PATH**: While SUMO_HOME was set correctly (`C:\Program Files (x86)\Eclipse\Sumo\`), the `sumo` and `sumo-gui` commands were not accessible via PATH.

## Diagnostic Results
```
✓ SUMO_HOME: C:\Program Files (x86)\Eclipse\Sumo\
✗ sumo command: Not found in PATH
✗ sumo-gui command: Not found in PATH
✓ Python bridge: Running on port 8814
✗ Frontend start call: 500 error "Failed to start SUMO process"
```

## Solution Applied
Updated the Python bridge to use full SUMO_HOME paths instead of relying on PATH:

### Before (Broken):
```python
# Relied on PATH - failed on Windows
if use_gui:
    sumo_cmd = ['sumo-gui']
else:
    sumo_cmd = ['sumo']
```

### After (Fixed):
```python
# Uses full SUMO_HOME path - works on Windows
import os
sumo_home = os.environ.get('SUMO_HOME')
if sumo_home:
    if use_gui:
        sumo_cmd = [os.path.join(sumo_home, 'bin', 'sumo-gui.exe')]
    else:
        sumo_cmd = [os.path.join(sumo_home, 'bin', 'sumo.exe')]
else:
    # Fallback to PATH-based commands
    if use_gui:
        sumo_cmd = ['sumo-gui']
    else:
        sumo_cmd = ['sumo']
```

## Additional Frontend Improvements
Enhanced error logging in ControlPanel.tsx:
```typescript
try {
    console.log("Starting SUMO via frontend play button...");
    const status = await sumoConnectionService.startSUMO();
    console.log("SUMO start response:", status);
    // ... success handling
} catch (error) {
    console.error("SUMO start error details:", error);
    // ... error handling with detailed messages
}
```

## Expected Result
✅ **Frontend play button now works**  
✅ **SUMO starts with AddisAbaba_dense.sumocfg**  
✅ **Vehicles appear immediately**  
✅ **Real-time data flows to dashboard**  
✅ **Better error messages in browser console**  

## Testing
1. Click the play button in the frontend
2. Should see "Starting SUMO via frontend play button..." in browser console
3. SUMO-GUI should open with Addis Ababa simulation
4. Vehicles should be visible immediately
5. Dashboard should show live vehicle count and data

## Windows-Specific Notes
This fix is particularly important on Windows where:
- SUMO is typically installed in Program Files
- Executables are not automatically added to PATH
- Full paths are required for subprocess calls
- .exe extension is needed for executables

The frontend play button should now successfully start the SUMO simulation!