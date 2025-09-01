/**
 * Test Script for Real-Time SUMO Data Integration
 * Verifies that all data types are streaming properly from SUMO to the frontend via WebSocket
 */

const WebSocket = require('ws');

// WebSocket configuration
const WS_URL = 'ws://localhost:3001/ws';
const PYTHON_BRIDGE_URL = 'http://localhost:8814';
const BACKEND_URL = 'http://localhost:3001/api';

console.log('====================================');
console.log('REAL-TIME SUMO DATA FLOW TEST');
console.log('====================================\n');

// Data statistics
const stats = {
    vehicles: 0,
    intersections: 0,
    roads: 0,
    emergencyVehicles: 0,
    trafficMetrics: 0,
    simulationUpdates: 0,
    totalMessages: 0,
    startTime: Date.now(),
    lastUpdate: Date.now()
};

// Check Python bridge status
async function checkPythonBridge() {
    try {
        const response = await fetch(`${PYTHON_BRIDGE_URL}/health`);
        const data = await response.json();
        console.log('✓ Python Bridge Status:', data.status === 'healthy' ? 'HEALTHY' : 'UNHEALTHY');
        console.log('  Connected to SUMO:', data.connected || false);
        console.log('  Simulation running:', data.simulation_running || false);
        return data.connected;
    } catch (error) {
        console.log('✗ Python Bridge: NOT AVAILABLE');
        return false;
    }
}

// Check backend service status
async function checkBackendService() {
    try {
        const response = await fetch(`${BACKEND_URL}/websocket/stats`);
        const data = await response.json();
        console.log('✓ Backend WebSocket Service: RUNNING');
        console.log('  Connected clients:', data.connectedClients);
        console.log('  Messages sent:', data.messageStats?.totalSent || 0);
        return true;
    } catch (error) {
        console.log('✗ Backend Service: NOT AVAILABLE');
        return false;
    }
}

// Connect to WebSocket and monitor data
function connectWebSocket() {
    const ws = new WebSocket(WS_URL);
    
    ws.on('open', () => {
        console.log('\n✓ WebSocket Connected to:', WS_URL);
        console.log('  Waiting for real-time data...\n');
        console.log('  Data Types Monitoring:');
        console.log('  - vehicles');
        console.log('  - intersections');
        console.log('  - roads');
        console.log('  - emergency-vehicles');
        console.log('  - traffic-metrics');
        console.log('  - simulation-update');
        console.log('\n' + '='.repeat(50));
    });
    
    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data);
            stats.totalMessages++;
            stats.lastUpdate = Date.now();
            
            // Track different data types
            switch (message.type) {
                case 'vehicles':
                    stats.vehicles++;
                    console.log(`📍 VEHICLES: ${message.data?.length || 0} vehicles`);
                    if (message.data && message.data.length > 0) {
                        const sample = message.data[0];
                        console.log(`   Sample: ID=${sample.id}, Speed=${sample.speed?.toFixed(1)}km/h, Pos=(${sample.position?.lat?.toFixed(4)}, ${sample.position?.lng?.toFixed(4)})`);
                    }
                    break;
                    
                case 'intersections':
                    stats.intersections++;
                    console.log(`🚦 INTERSECTIONS: ${message.data?.length || 0} intersections`);
                    if (message.data && message.data.length > 0) {
                        const sample = message.data[0];
                        console.log(`   Sample: ID=${sample.id}, Phase=${sample.trafficLights?.[0]?.phase}, Congestion=${sample.congestionLevel}`);
                    }
                    break;
                    
                case 'roads':
                    stats.roads++;
                    console.log(`🛣️  ROADS: ${message.data?.length || 0} roads`);
                    if (message.data && message.data.length > 0) {
                        const sample = message.data[0];
                        console.log(`   Sample: ID=${sample.id}, Congestion=${sample.congestionLevel}, Lanes=${sample.lanes?.length || 0}`);
                    }
                    break;
                    
                case 'emergency-vehicles':
                    stats.emergencyVehicles++;
                    console.log(`🚨 EMERGENCY: ${message.data?.length || 0} emergency vehicles`);
                    if (message.data && message.data.length > 0) {
                        const sample = message.data[0];
                        console.log(`   Sample: Type=${sample.emergencyType}, Status=${sample.status}, Priority=${sample.priority}`);
                    }
                    break;
                    
                case 'traffic-metrics':
                    stats.trafficMetrics++;
                    console.log(`📊 METRICS: Update received`);
                    if (message.data) {
                        console.log(`   Stats:`, JSON.stringify(message.data).substring(0, 100) + '...');
                    }
                    break;
                    
                case 'simulation-update':
                    stats.simulationUpdates++;
                    const update = message.data;
                    console.log(`🔄 FULL UPDATE: V=${update?.vehicles?.length || 0}, I=${update?.intersections?.length || 0}, R=${update?.roads?.length || 0}, E=${update?.emergencyVehicles?.length || 0}`);
                    break;
                    
                case 'connection-established':
                    console.log('✓ Connection established with server');
                    console.log('  Client ID:', message.data?.clientId);
                    console.log('  Subscriptions:', message.data?.serverCapabilities?.availableSubscriptions?.join(', '));
                    break;
                    
                case 'subscription-confirmed':
                    console.log('✓ Subscriptions confirmed:', message.data?.subscriptions?.join(', '));
                    break;
                    
                default:
                    console.log(`ℹ️  ${message.type}:`, message.data);
            }
            
        } catch (error) {
            console.error('Error parsing message:', error.message);
        }
    });
    
    ws.on('error', (error) => {
        console.error('✗ WebSocket error:', error.message);
    });
    
    ws.on('close', () => {
        console.log('\n✗ WebSocket connection closed');
        printSummary();
    });
    
    return ws;
}

// Print statistics summary
function printSummary() {
    const duration = (Date.now() - stats.startTime) / 1000;
    const avgRate = stats.totalMessages / duration;
    
    console.log('\n' + '='.repeat(50));
    console.log('TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Duration: ${duration.toFixed(1)} seconds`);
    console.log(`Total Messages: ${stats.totalMessages}`);
    console.log(`Average Rate: ${avgRate.toFixed(2)} msg/sec`);
    console.log('\nData Type Counts:');
    console.log(`  - Vehicle Updates: ${stats.vehicles}`);
    console.log(`  - Intersection Updates: ${stats.intersections}`);
    console.log(`  - Road Updates: ${stats.roads}`);
    console.log(`  - Emergency Vehicle Updates: ${stats.emergencyVehicles}`);
    console.log(`  - Traffic Metrics: ${stats.trafficMetrics}`);
    console.log(`  - Full Simulation Updates: ${stats.simulationUpdates}`);
    
    const allTypesReceived = stats.vehicles > 0 && 
                            stats.intersections > 0 && 
                            stats.roads > 0;
    
    console.log('\n' + '='.repeat(50));
    if (allTypesReceived) {
        console.log('✅ TEST PASSED: All main data types received');
    } else {
        console.log('⚠️ TEST INCOMPLETE: Some data types not received');
        if (stats.vehicles === 0) console.log('  - Missing: vehicles');
        if (stats.intersections === 0) console.log('  - Missing: intersections');
        if (stats.roads === 0) console.log('  - Missing: roads');
    }
    console.log('='.repeat(50));
}

// Main test runner
async function runTest() {
    console.log('Starting Real-Time Data Flow Test...\n');
    
    // Step 1: Check services
    console.log('STEP 1: Checking Services');
    console.log('-'.repeat(30));
    const pythonBridgeOk = await checkPythonBridge();
    const backendOk = await checkBackendService();
    
    if (!pythonBridgeOk) {
        console.log('\n⚠️ Python bridge not connected to SUMO.');
        console.log('Please ensure SUMO is running with: py backend/python-bridge/sumo_bridge.py');
    }
    
    if (!backendOk) {
        console.log('\n⚠️ Backend service not available.');
        console.log('Please ensure backend is running with: cd backend && npm run dev');
        process.exit(1);
    }
    
    // Step 2: Connect WebSocket
    console.log('\nSTEP 2: Connecting to WebSocket');
    console.log('-'.repeat(30));
    const ws = connectWebSocket();
    
    // Step 3: Monitor for specified duration
    const TEST_DURATION = 30; // seconds
    console.log(`\nSTEP 3: Monitoring data for ${TEST_DURATION} seconds...`);
    
    // Periodic status update
    const statusInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - stats.startTime) / 1000);
        const timeSinceLastUpdate = (Date.now() - stats.lastUpdate) / 1000;
        
        if (timeSinceLastUpdate > 5) {
            console.log(`\n⚠️ No data received for ${timeSinceLastUpdate.toFixed(1)} seconds`);
        }
        
        if (elapsed % 10 === 0) {
            console.log(`\n--- Status at ${elapsed}s ---`);
            console.log(`Messages: ${stats.totalMessages}, Rate: ${(stats.totalMessages/elapsed).toFixed(2)} msg/s`);
        }
    }, 1000);
    
    // End test after duration
    setTimeout(() => {
        clearInterval(statusInterval);
        ws.close();
    }, TEST_DURATION * 1000);
}

// Handle process termination
process.on('SIGINT', () => {
    console.log('\n\nTest interrupted by user');
    printSummary();
    process.exit(0);
});

// Run the test
runTest().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
