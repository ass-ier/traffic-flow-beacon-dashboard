import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PythonBridgeManager {
  private static instance: PythonBridgeManager;
  private bridgeProcess: ChildProcess | null = null;
  private bridgePath: string;

  private constructor() {
    this.bridgePath = path.join(__dirname, '../../python-bridge');
  }

  public static getInstance(): PythonBridgeManager {
    if (!PythonBridgeManager.instance) {
      PythonBridgeManager.instance = new PythonBridgeManager();
    }
    return PythonBridgeManager.instance;
  }

  public async startBridge(): Promise<{ success: boolean; pid?: number; error?: string }> {
    try {
      // Check if already running
      if (this.bridgeProcess && !this.bridgeProcess.killed) {
        return { success: true, pid: this.bridgeProcess.pid };
      }

      console.log('Starting Python bridge from:', this.bridgePath);
      
      // Start Python bridge process
      this.bridgeProcess = spawn('py', ['sumo_bridge.py'], {
        cwd: this.bridgePath,
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
      });

      // Handle process events
      this.bridgeProcess.stdout?.on('data', (data) => {
        console.log('Python Bridge:', data.toString());
      });

      this.bridgeProcess.stderr?.on('data', (data) => {
        console.error('Python Bridge Error:', data.toString());
      });

      this.bridgeProcess.on('exit', (code) => {
        console.log(`Python bridge exited with code ${code}`);
        this.bridgeProcess = null;
      });

      this.bridgeProcess.on('error', (error) => {
        console.error('Python bridge process error:', error);
        this.bridgeProcess = null;
      });

      // Wait a moment for the process to start
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (this.bridgeProcess && !this.bridgeProcess.killed) {
        return { 
          success: true, 
          pid: this.bridgeProcess.pid 
        };
      } else {
        throw new Error('Process failed to start');
      }

    } catch (error) {
      console.error('Failed to start Python bridge:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  public async stopBridge(): Promise<{ success: boolean; error?: string }> {
    try {
      if (this.bridgeProcess && !this.bridgeProcess.killed) {
        this.bridgeProcess.kill('SIGTERM');
        
        // Wait for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Force kill if still running
        if (!this.bridgeProcess.killed) {
          this.bridgeProcess.kill('SIGKILL');
        }
        
        this.bridgeProcess = null;
        return { success: true };
      }
      
      return { success: true }; // Already stopped
    } catch (error) {
      console.error('Failed to stop Python bridge:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  public isRunning(): boolean {
    return this.bridgeProcess !== null && !this.bridgeProcess.killed;
  }

  public getPid(): number | undefined {
    return this.bridgeProcess?.pid;
  }
}

export const pythonBridgeManager = PythonBridgeManager.getInstance();