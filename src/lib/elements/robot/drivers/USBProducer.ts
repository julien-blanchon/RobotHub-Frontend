import type { Producer, ConnectionStatus, RobotCommand, USBDriverConfig } from '../models.js';
import { USBCalibrationManager } from '../calibration/USBCalibrationManager.js';
import { scsServoSDK } from "feetech.js";
import { ROBOT_CONFIG } from '../config.js';

export class USBProducer implements Producer {
  readonly id: string;
  readonly name = 'USB Producer';
  readonly config: USBDriverConfig;
  
  private _status: ConnectionStatus = { isConnected: false };
  private statusCallbacks: ((status: ConnectionStatus) => void)[] = [];
  
  // Joint configuration
  private readonly jointIds = [1, 2, 3, 4, 5, 6];
  private readonly jointNames = ["Rotation", "Pitch", "Elbow", "Wrist_Pitch", "Wrist_Roll", "Jaw"];
  
  // Shared calibration manager
  private calibrationManager: USBCalibrationManager;
  
  // Serial command processing to prevent "Port is busy" errors
  private commandQueue: Array<{ joints: Array<{ name: string; value: number }>, resolve: () => void, reject: (error: Error) => void }> = [];
  private isProcessingCommands = false;

  constructor(config: USBDriverConfig, calibrationManager: USBCalibrationManager) {
    this.config = config;
    this.calibrationManager = calibrationManager;
    this.id = `usb-producer-${Date.now()}`;
  }

  get status(): ConnectionStatus { 
    return this._status; 
  }

  async connect(): Promise<void> {
    if (this._status.isConnected) {
      console.debug('[USBProducer] Already connected');
      return;
    }

    try {
      console.debug('[USBProducer] Connecting...');
      
      // Check if calibration is needed
      if (this.calibrationManager.needsCalibration) {
        throw new Error('USB Producer requires calibration. Please complete calibration first.');
      }

      // Ensure the SDK is connected (reuse calibration connection if available)
      if (!this.calibrationManager.isSDKConnected) {
        console.debug('[USBProducer] Establishing new SDK connection');
        await scsServoSDK.connect({
          baudRate: this.config.baudRate || ROBOT_CONFIG.usb.baudRate
        });
      } else {
        console.debug('[USBProducer] Reusing existing SDK connection from calibration');
      }

      // Lock servos for production use (robot control)
      console.debug('[USBProducer] 🔒 Locking servos for production use...');
      await this.calibrationManager.lockServosForProduction();

      this._status = { 
        isConnected: true, 
        lastConnected: new Date()
      };
      this.notifyStatusChange();
      
      console.debug('[USBProducer] ✅ Connected successfully - servos locked for robot control');
    } catch (error) {
      console.error('[USBProducer] Connection failed:', error);
      this._status = { 
        isConnected: false, 
        error: error instanceof Error ? error.message : 'Connection failed'
      };
      this.notifyStatusChange();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this._status.isConnected) {
      console.debug('[USBProducer] 🔓 Disconnecting and unlocking servos...');
      
      try {
        // Safely unlock servos when disconnecting (best practice)
        if (this.calibrationManager.isSDKConnected) {
          console.debug('[USBProducer] 🔓 Safely unlocking servos for manual movement...');
          await scsServoSDK.unlockServosForManualMovement(this.jointIds);
          console.debug('[USBProducer] ✅ Servos safely unlocked - can now be moved manually');
        }
      } catch (error) {
        console.warn('[USBProducer] Warning: Failed to unlock servos during disconnect:', error);
      }
      
      // Don't disconnect the SDK here - let calibration manager handle it
      // This allows multiple USB drivers to share the same connection
    }

    this._status = { isConnected: false };
    this.notifyStatusChange();
    console.debug('[USBProducer] ✅ Disconnected');
  }

  async sendCommand(command: RobotCommand): Promise<void> {
    if (!this._status.isConnected) {
      throw new Error('Cannot send command: USB Producer not connected');
    }

    console.debug(`[USBProducer] Queuing command:`, command);
    
    // Queue command for serial processing
    return new Promise((resolve, reject) => {
      this.commandQueue.push({
        joints: command.joints,
        resolve,
        reject
      });
      
      // Start processing if not already running
      this.processCommandQueue();
    });
  }

  // Event handlers
  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index >= 0) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  // Private methods
  private async processCommandQueue(): Promise<void> {
    if (this.isProcessingCommands || this.commandQueue.length === 0) {
      return;
    }

    this.isProcessingCommands = true;

    try {
      while (this.commandQueue.length > 0) {
        const { joints, resolve, reject } = this.commandQueue.shift()!;
        
        try {
          // Process servos sequentially to prevent "Port is busy" errors
          for (const jointCmd of joints) {
            const jointIndex = this.jointNames.indexOf(jointCmd.name);
            if (jointIndex >= 0) {
              const servoId = this.jointIds[jointIndex];
              const servoPosition = this.calibrationManager.denormalizeValue(jointCmd.value, jointCmd.name);
              
              await this.writeServoWithRetry(servoId, servoPosition, jointCmd.name);
              
              // Small delay between servo writes to prevent port conflicts
              await new Promise(resolve => setTimeout(resolve, ROBOT_CONFIG.usb.servoWriteDelay));
            }
          }
          
          resolve();
        } catch (error) {
          reject(error as Error);
        }
      }
    } finally {
      this.isProcessingCommands = false;
    }
  }

  private async writeServoWithRetry(servoId: number, position: number, jointName: string): Promise<void> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= ROBOT_CONFIG.usb.maxRetries; attempt++) {
      try {
        await scsServoSDK.writePositionUnlocked(servoId, position);
        console.debug(`[USBProducer] ✅ ${jointName} (servo ${servoId}) -> ${position}`);
        return; // Success!
      } catch (error) {
        lastError = error as Error;
        console.warn(`[USBProducer] Attempt ${attempt}/${ROBOT_CONFIG.usb.maxRetries} failed for servo ${servoId}:`, error);
        
        if (attempt < ROBOT_CONFIG.usb.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, ROBOT_CONFIG.usb.retryDelay));
        }
      }
    }
    
    // All retries failed
    throw new Error(`Failed to write servo ${servoId} after ${ROBOT_CONFIG.usb.maxRetries} attempts: ${lastError?.message}`);
  }

  private notifyStatusChange(): void {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(this._status);
      } catch (error) {
        console.error('[USBProducer] Error in status callback:', error);
      }
    });
  }
} 