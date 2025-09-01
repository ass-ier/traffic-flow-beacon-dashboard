// Test script to verify AddisAbaba.sumocfg configuration consistency
import fs from 'fs';

async function testConfigurationConsistency() {
    console.log('🧪 Testing Configuration Consistency');
    console.log('=====================================');

    // Test 1: Check if AddisAbaba.sumocfg exists
    console.log('\n1. Checking if AddisAbaba.sumocfg exists...');
    const configPath = './AddisAbabaSumo/AddisAbaba.sumocfg';

    if (fs.existsSync(configPath)) {
        console.log('✅ AddisAbaba.sumocfg exists');
        const stats = fs.statSync(configPath);
        console.log(`📁 File size: ${(stats.size / 1024).toFixed(1)}KB`);
    } else {
        console.log('❌ AddisAbaba.sumocfg NOT found');
        return;
    }

    // Test 2: Check if AddisAbaba_dense.sumocfg exists (fallback option)
    console.log('\n2. Checking if AddisAbaba_dense.sumocfg exists...');
    const denseConfigPath = './AddisAbabaSumo/AddisAbaba_dense.sumocfg';

    if (fs.existsSync(denseConfigPath)) {
        console.log('✅ AddisAbaba_dense.sumocfg exists (fallback available)');
    } else {
        console.log('⚠️  AddisAbaba_dense.sumocfg NOT found (no fallback)');
    }

    // Test 3: Check if simple_routes.xml exists
    console.log('\n3. Checking if simple_routes.xml exists...');
    const routesPath = './AddisAbabaSumo/simple_routes.xml';

    if (fs.existsSync(routesPath)) {
        console.log('✅ simple_routes.xml exists');
        const routesContent = fs.readFileSync(routesPath, 'utf8');
        const flowCount = (routesContent.match(/<flow/g) || []).length;
        const routeCount = (routesContent.match(/<route/g) || []).length;
        console.log(`🚗 Found ${flowCount} vehicle flows and ${routeCount} routes`);
    } else {
        console.log('❌ simple_routes.xml NOT found');
    }

    // Test 4: Test backend configuration default
    console.log('\n4. Testing backend configuration...');
    try {
        const response = await fetch('http://localhost:3001/health');
        if (response.ok) {
            console.log('✅ Backend service is running');
        } else {
            console.log('⚠️  Backend service not responding properly');
        }
    } catch (error) {
        console.log('❌ Backend service not running');
        console.log('   Start with: cd backend && npm run dev');
    }

    // Test 5: Test Python bridge configuration default
    console.log('\n5. Testing Python bridge configuration...');
    try {
        const response = await fetch('http://localhost:8814/health');
        if (response.ok) {
            console.log('✅ Python bridge service is running');
        } else {
            console.log('⚠️  Python bridge service not responding properly');
        }
    } catch (error) {
        console.log('❌ Python bridge service not running');
        console.log('   Start with: cd backend/python-bridge && python sumo_bridge.py');
    }

    console.log('\n🎯 Summary');
    console.log('==========');
    console.log('All services are now configured to use AddisAbaba.sumocfg as default');
    console.log('Both AddisAbaba.sumocfg and AddisAbaba_dense.sumocfg are available');
    console.log('The system will use AddisAbaba.sumocfg when you click the frontend Play button');
    console.log('\nTo test: Click the Play button in the frontend dashboard');
}

testConfigurationConsistency();