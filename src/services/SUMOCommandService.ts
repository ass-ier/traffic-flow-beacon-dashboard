// SUMO Command Service for sending real-time commands to SUMO simulation
export interface SUMOCommand {
  type: 'traffic-light-override' | 'emergency-vehicle-priority' | 'route-change' | 'speed-limit';
  target: string;
  parameters: Record<string, any>;
  timestamp: number;
}

import config from '../config/environment';

export class SUMOCommandService {
  private ws: WebSocket | null = null;
  private serverUrl: string;

  constructor(serverUrl: string = config.websocketUrl) {
    this.serverUrl = serverUrl;
  }

  public async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.serverUrl);
        
        this.ws.onopen = () => {
          console.log('SUMO Command Service connected');
          resolve();
        };

        this.ws.onerror = (error) => {
          console.error('SUMO Command Service connection error:', error);
          reject(new Error('Failed to connect to SUMO command service'));
        };

        this.ws.onclose = () => {
          console.log('SUMO Command Service disconnected');
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public async overrideTrafficLight(intersectionId: string, phase: 'red' | 'green' | 'yellow', duration?: number): Promise<void> {
    const command: SUMOCommand = {
      type: 'traffic-light-override',
      target: intersectionId,
      parameters: {
        phase,
        duration: duration || 30
      },
      timestamp: Date.now()
    };

    return this.sendCommand(command);
  }

  private async sendCommand(command: SUMOCommand): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('SUMO Command Service not connected');
    }

    const message = {
      type: 'sumo-command',
      command
    };

    this.ws.send(JSON.stringify(message));
  }
}

export const sumoCommandService = new SUMOCommandService();