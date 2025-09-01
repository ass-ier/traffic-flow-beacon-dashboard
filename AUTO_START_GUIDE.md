# Python Bridge Auto-Start Setup

## Quick Start (Recommended)

To start both the Python bridge and frontend together:

```bash
npm run dev:full
```

Or double-click `start-dev-full.bat` on Windows.

## Manual Setup

If you prefer to start services separately:

### Terminal 1 - Python Bridge:
```bash
cd backend/python-bridge
py sumo_bridge.py
```

### Terminal 2 - Frontend:
```bash
npm run dev
```

## How It Works

1. **Auto-Detection**: When the frontend starts, it automatically checks if the Python bridge is running on `localhost:8814`
2. **Status Monitoring**: Real-time status updates are shown in the Service Status Panel
3. **Smart Connection**: If the bridge is detected, SUMO will automatically attempt to connect
4. **User Guidance**: If services are offline, clear instructions are provided in the UI

## NPM Scripts

- `npm run dev` - Start frontend only
- `npm run dev:full` - Start both Python bridge and frontend
- `npm run bridge:start` - Start Python bridge only

## Troubleshooting

If you see "Python bridge not available" errors:

1. Ensure Python is installed and in your PATH
2. Make sure SUMO is properly installed
3. Check that port 8814 is not in use
4. Use `npm run dev:full` for automatic startup

The system will provide real-time status updates and clear instructions in the Service Status Panel.