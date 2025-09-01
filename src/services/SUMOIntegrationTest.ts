// SUMO Integration Test Utilities
import { sumoDataService } from './SUMODataService';
import { sumoCommandService } from './SUMOCommandService';

export class SUMOIntegrationTest {
  private testResults: { [key: string]: boolean } = {};

  public async runTests(): Promise<{ [key: string]: boolean }> {
    console.log('Starting SUMO-Leaflet integration tests...');

    // Test 1: WebSocket Connection
    this.testResults['websocket_connection'] = await this.testWebSocketConnection();

    // Test 2: Data Reception
    this.testResults['data_reception'] = await this.testDataReception();

    // Test 3: Command Sending
    this.testResults['command_sending'] = await this.testCommandSending();

    console.log('Integration test results:', this.testResults);
    return this.testResults;
  }

  private async testWebSocketConnection(): Promise<boolean> {
    try {
      await sumoDataService.connect();
      const status = sumoDataService.getConnectionStatus();
      return status.connected;
    } catch (error) {
      console.error('WebSocket connection test failed:', error);
      return false;
    }
  }

  private async testDataReception(): Promise<boolean> {
    return new Promise((resolve) => {
      let dataReceived = false;
      
      const unsubscribe = sumoDataService.subscribeToVehicles((vehicles) => {
        if (vehicles && vehicles.length >= 0) {
          dataReceived = true;
          unsubscribe();
          resolve(true);
        }
      });

      setTimeout(() => {
        if (!dataReceived) {
          unsubscribe();
          resolve(false);
        }
      }, 5000);
    });
  }

  private async testCommandSending(): Promise<boolean> {
    try {
      await sumoCommandService.connect();
      await sumoCommandService.overrideTrafficLight('test_intersection', 'green', 10);
      return true;
    } catch (error) {
      console.error('Command sending test failed:', error);
      return false;
    }
  }
}

export const sumoIntegrationTest = new SUMOIntegrationTest();