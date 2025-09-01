// Test script to manually test the play button functionality

async function testPlayButton() {
    console.log('Testing play button functionality...\n');

    // Test 1: Check backend health
    console.log('1. Testing backend health...');
    try {
        const healthResponse = await fetch('http://localhost:3001/health');
        const healthData = await healthResponse.json();
        console.log('✅ Backend health:', healthData);
    } catch (error) {
        console.log('❌ Backend not available:', error.message);
        return;
    }

    // Test 2: Check Python bridge health
    console.log('\n2. Testing Python bridge health...');
    try {
        const bridgeResponse = await fetch('http://localhost:8814/health');
        const bridgeData = await bridgeResponse.json();
        console.log('✅ Python bridge health:', bridgeData);
    } catch (error) {
        console.log('❌ Python bridge not available:', error.message);
        return;
    }

    // Test 3: Test SUMO stats endpoint
    console.log('\n3. Testing SUMO stats endpoint...');
    try {
        const statsResponse = await fetch('http://localhost:3001/api/sumo/stats');
        const statsData = await statsResponse.json();
        console.log('✅ SUMO stats:', statsData);
    } catch (error) {
        console.log('❌ SUMO stats failed:', error.message);
    }

    // Test 4: Test SUMO start endpoint
    console.log('\n4. Testing SUMO start endpoint...');
    try {
        const startResponse = await fetch('http://localhost:3001/api/sumo/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                configPath: 'AddisAbaba_dense.sumocfg',
                useGui: true
            })
        });

        console.log('Response status:', startResponse.status);
        const responseText = await startResponse.text();
        console.log('Response text:', responseText.substring(0, 500) + '...');

        try {
            const startData = JSON.parse(responseText);
            if (startResponse.ok && startData.success) {
                console.log('✅ SUMO started successfully!');
            } else {
                console.log('❌ SUMO start failed:', startData.message);
            }
        } catch (jsonError) {
            console.log('❌ Response is not JSON. Likely an HTML error page.');
        }
    } catch (error) {
        console.log('❌ SUMO start request failed:', error.message);
    }
}

testPlayButton();