# Manual SUMO Test Instructions

Since we're having persistent TraCI connection issues with the Python bridge, let's test SUMO manually to isolate the problem.

## Step 1: Manual SUMO Start

Open a new Command Prompt and run:

```bash
cd AddisAbabaSumo
%SUMO_HOME%\bin\sumo-gui.exe -c AddisAbaba.sumocfg --remote-port 8813 --start
```

**Expected Result:**
- SUMO-GUI window opens
- Addis Ababa network loads
- Vehicles should appear and move
- Time should advance automatically

## Step 2: If Manual SUMO Works

If you see vehicles in the manual SUMO, then the issue is purely with the Python bridge connection.

## Step 3: Test Python Bridge Connection

With SUMO running manually, test if Python bridge can connect:

```python
import requests
response = requests.get("http://localhost:8814/health")
print(response.json())
```

## Step 4: Alternative Solutions

### Option A: Use Different Configuration
Try with a simpler config:
```bash
%SUMO_HOME%\bin\sumo-gui.exe -c test_minimal.sumocfg --remote-port 8813 --start
```

### Option B: Check SUMO Installation
Verify SUMO is properly installed:
```bash
%SUMO_HOME%\bin\sumo.exe --version
```

### Option C: Use Different Port
Try different TraCI port:
```bash
%SUMO_HOME%\bin\sumo-gui.exe -c AddisAbaba.sumocfg --remote-port 8815 --start
```

## Debugging Questions

1. **Does manual SUMO show vehicles?**
   - Yes → Python bridge connection issue
   - No → Configuration/routes issue

2. **Does SUMO-GUI open at all?**
   - Yes → Network loads, check routes
   - No → SUMO installation issue

3. **Do you see any error messages?**
   - Note any error messages in SUMO console

## Next Steps Based on Results

**If manual SUMO works with vehicles:**
- Issue is Python bridge TraCI connection
- Need to fix connection logic

**If manual SUMO has no vehicles:**
- Issue is with AddisAbaba.sumocfg configuration
- Need to fix routes or network

**If SUMO doesn't start:**
- Issue is SUMO installation or paths
- Need to fix SUMO_HOME or installation

Please try the manual SUMO command and let me know what you see!