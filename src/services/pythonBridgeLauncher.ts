// Python Bridge Launcher Service
// Automatically starts the Python bridge when frontend starts

export interface BridgeProcessStatus {
  running: boolean;
  pid?: number;
  port: number;
  error?: string;
  startTime?: number;
}

export class PythonBridgeLauncher {
  private static instance: PythonBridgeLauncher;
  private processStatus: BridgeProcessStatus = {
    running: false,
    port: 8814
  };
  
  private statusCallbacks = new Set<(status: BridgeProcessStatus) => void>();
  private checkInterval?: number;

  private constructor() {}

  public static getInstance(): PythonBridgeLauncher {
    if (!PythonBridgeLauncher.instance) {
      PythonBridgeLauncher.instance = new PythonBridgeLauncher();
    }
    return PythonBridgeLauncher.instance;
  }

  public async startBridge(): Promise<boolean> {
    try {
      // First check if it's already running
      const isRunning = await this.checkBridgeStatus();
      if (isRunning) {
        console.log('Python bridge is already running');
        return true;
      }

      console.log('Python bridge not found. Manual start required.');
      this.processStatus = {
        running: false,
        port: 8814,
        error: 'Manual start required - see Service Status Panel for instructions'
      };
      this.notifyStatusChange();
      return false;
      
    } catch (error) {
      console.error('Failed to start Python bridge:', error);
      this.processStatus = {
        running: false,
        port: 8814,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      this.notifyStatusChange();
      return false;
    }
  }

  public async stopBridge(): Promise<boolean> {
    try {
      if (window.electronAPI?.stopPythonBridge) {
        const result = await window.electronAPI.stopPythonBridge();
        if (result.success) {
          this.processStatus = { running: false, port: 8814 };
          this.stopHealthChecking();
          this.notifyStatusChange();
          return true;
        }
      }
      
      // Fallback: Try via backend API
      const response = await fetch('http://localhost:3001/api/stop-python-bridge', {
        method: 'POST'
      });
      
      if (response.ok) {
        this.processStatus = { running: false, port: 8814 };
        this.stopHealthChecking();
        this.notifyStatusChange();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to stop Python bridge:', error);
      return false;
    }
  }

  public async checkBridgeStatus(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:8814/health', {
        method: 'GET',
        timeout: 2000
      } as RequestInit);
      
      const isRunning = response.ok;
      
      if (isRunning !== this.processStatus.running) {
        this.processStatus.running = isRunning;
        if (isRunning) {
          this.processStatus.startTime = Date.now();
          this.processStatus.error = undefined;
        }
        this.notifyStatusChange();
      }
      
      return isRunning;
    } catch (error) {
      if (this.processStatus.running) {
        this.processStatus.running = false;
        this.processStatus.error = 'Connection failed';
        this.notifyStatusChange();
      }
      return false;
    }
  }

  public getStatus(): BridgeProcessStatus {
    return { ...this.processStatus };
  }

  public subscribeToStatusUpdates(callback: (status: BridgeProcessStatus) => void): () => void {
    this.statusCallbacks.add(callback);
    // Immediately call with current status
    callback(this.getStatus());
    
    return () => {
      this.statusCallbacks.delete(callback);
    };
  }

  private notifyStatusChange(): void {
    const status = this.getStatus();
    this.statusCallbacks.forEach(callback => callback(status));
  }

  private startHealthChecking(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }
    
    this.checkInterval = window.setInterval(() => {
      this.checkBridgeStatus();
    }, 5000); // Check every 5 seconds
  }

  private stopHealthChecking(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
  }

  // Auto-start method to be called during app initialization
  public async autoStart(): Promise<boolean> {
    console.log('Checking for Python bridge...');
    
    // Check if it's already running
    const isRunning = await this.checkBridgeStatus();
    if (isRunning) {
      console.log('Python bridge found and connected successfully');
      this.startHealthChecking();
      return true;
    }

    console.log('Python bridge not detected. Use "npm run dev:full" to start both services together.');
    this.processStatus = {
      running: false,
      port: 8814,
      error: 'Not running - use "npm run dev:full" for auto-start'
    };
    this.notifyStatusChange();
    
    return false;
  }
}

// Global instance
export const pythonBridgeLauncher = PythonBridgeLauncher.getInstance();

// Declare global interface for Electron API (if available)
declare global {
  interface Window {
    electronAPI?: {
      startPythonBridge: () => Promise<{success: boolean; pid?: number; error?: string}>;
      stopPythonBridge: () => Promise<{success: boolean; error?: string}>;
    };
  }
}