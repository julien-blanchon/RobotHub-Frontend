import type { Consumer, ConnectionStatus, RobotCommand, USBDriverConfig } from '../models.js';
import { USBCalibrationManager } from '../calibration/USBCalibrationManager.js';
import { scsServoSDK } from "feetech.js";
import { ROBOT_CONFIG } from '../config.js';

export class USBConsumer implements Consumer {
  readonly id: string;
  readonly name = 'USB Consumer';
  readonly config: USBDriverConfig;
  
  private _status: ConnectionStatus = { isConnected: false };
  private statusCallbacks: ((status: ConnectionStatus) => void)[] = [];
  private commandCallbacks: ((command: RobotCommand) => void)[] = [];
  
  // Listening state
  private isListening = false;
  private pollingAbortController: AbortController | null = null;
  
  // Joint configuration
  private readonly jointIds = [1, 2, 3, 4, 5, 6];
  private readonly jointNames = ["Rotation", "Pitch", "Elbow", "Wrist_Pitch", "Wrist_Roll", "Jaw"];
  private lastPositions: Record<string, number> = {};
  
  // Shared calibration manager
  private calibrationManager: USBCalibrationManager;
  
  // Servo reading queue
  private isReadingServos = false;
  private readingQueue: Array<{
    servoId: number;
    resolve: (value: number) => void;
    reject: (error: Error) => void;
  }> = [];
  
  // Error tracking for better backoff
  private consecutiveErrors = 0;
  private lastErrorTime = 0;

  constructor(config: USBDriverConfig, calibrationManager: USBCalibrationManager) {
    this.config = config;
    this.calibrationManager = calibrationManager;
    this.id = `usb-consumer-${Date.now()}`;
  }

  get status(): ConnectionStatus { 
    return this._status; 
  }

  async connect(): Promise<void> {
    if (this._status.isConnected) {
      console.debug('[USBConsumer] Already connected');
      return;
    }

    try {
      console.debug('[USBConsumer] Connecting...');
      
      // Check if calibration is needed
      if (this.calibrationManager.needsCalibration) {
        throw new Error('USB Consumer requires calibration. Please complete calibration first.');
      }

      // Ensure the SDK is connected (reuse calibration connection if available)
      if (!this.calibrationManager.isSDKConnected) {
        console.debug('[USBConsumer] Establishing new SDK connection');
        await scsServoSDK.connect({
          baudRate: this.config.baudRate || ROBOT_CONFIG.usb.baudRate
        });
      } else {
        console.debug('[USBConsumer] Reusing existing SDK connection from calibration');
      }

      // Ensure servos remain unlocked for consumer (reading positions)
      console.debug('[USBConsumer] 🔓 Ensuring servos remain unlocked for position reading...');
      await this.calibrationManager.keepServosUnlockedForConsumer();

      this._status = { 
        isConnected: true, 
        lastConnected: new Date()
      };
      this.notifyStatusChange();
      
      console.debug('[USBConsumer] ✅ Connected successfully - servos unlocked for reading');
    } catch (error) {
      console.error('[USBConsumer] Connection failed:', error);
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
      await this.stopListening();
      console.debug('[USBConsumer] Disconnecting (keeping shared SDK connection)');
      // Don't disconnect the SDK here - let calibration manager handle it
      // This allows multiple USB drivers to share the same connection
    }

    this._status = { isConnected: false };
    this.notifyStatusChange();
  }

  async startListening(): Promise<void> {
    if (this.isListening) {
      console.warn('[USBConsumer] Already listening');
      return;
    }

    this.isListening = true;
    this.pollingAbortController = new AbortController();
    
    console.debug('[USBConsumer] Starting continuous polling');
    this.pollContinuously();
  }

  async stopListening(): Promise<void> {
    if (!this.isListening) return;
    
    this.isListening = false;
    if (this.pollingAbortController) {
      this.pollingAbortController.abort();
      this.pollingAbortController = null;
    }
    
    console.debug('[USBConsumer] Stopped listening');
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

  onCommand(callback: (command: RobotCommand) => void): () => void {
    this.commandCallbacks.push(callback);
    return () => {
      const index = this.commandCallbacks.indexOf(callback);
      if (index >= 0) {
        this.commandCallbacks.splice(index, 1);
      }
    };
  }

  // Private methods
  private async readServoPosition(servoId: number): Promise<number> {
    return new Promise((resolve, reject) => {
      this.readingQueue.push({ servoId, resolve, reject });
      this.processReadingQueue();
    });
  }

  private async processReadingQueue(): Promise<void> {
    if (this.isReadingServos || this.readingQueue.length === 0) {
      return;
    }

    this.isReadingServos = true;

    try {
      const batch = [...this.readingQueue];
      this.readingQueue = [];

      for (const { servoId, resolve, reject } of batch) {
        try {
          const position = await scsServoSDK.readPosition(servoId);
          resolve(position);
        } catch (error) {
          reject(error instanceof Error ? error : new Error(`Failed to read servo ${servoId}`));
        }
        
        await new Promise(resolve => setTimeout(resolve, 5));
      }
    } finally {
      this.isReadingServos = false;
      
      if (this.readingQueue.length > 0) {
        setTimeout(() => this.processReadingQueue(), 50);
      }
    }
  }

  private async pollContinuously(): Promise<void> {
    while (this.isListening && this._status.isConnected && !this.pollingAbortController?.signal.aborted) {
      try {
        const changes: { name: string; value: number }[] = [];

        const readPromises = this.jointIds.map(async (servoId, i) => {
          const jointName = this.jointNames[i];
          try {
            const position = await this.readServoPosition(servoId);
            const lastPosition = this.lastPositions[jointName];
            
            if (position !== lastPosition) {
              // Use calibration manager for normalization
              const normalizedValue = this.calibrationManager.normalizeValue(position, jointName);
              this.lastPositions[jointName] = position;
              return { name: jointName, value: normalizedValue };
            }
          } catch (error) {
            // Silent continue on read errors
          }
          return null;
        });

        const results = await Promise.all(readPromises);
        
        results.forEach(result => {
          if (result) {
            changes.push(result);
          }
        });

        if (changes.length > 0) {
          const command: RobotCommand = {
            joints: changes,
            timestamp: Date.now()
          };
          this.notifyCommand(command);
          
          // Reset error counter on successful read
          this.consecutiveErrors = 0;
        }

        await new Promise(resolve => setTimeout(resolve, ROBOT_CONFIG.polling.consumerPollingRate));
        
      } catch (error) {
        if (!this.pollingAbortController?.signal.aborted) {
          console.error('[USBConsumer] Polling error:', error);
          
          // Smart error backoff
          this.consecutiveErrors++;
          this.lastErrorTime = Date.now();
          
          const backoffTime = this.consecutiveErrors > ROBOT_CONFIG.polling.maxPollingErrors 
            ? ROBOT_CONFIG.polling.errorBackoffRate * 3  // Longer backoff after many errors
            : ROBOT_CONFIG.polling.errorBackoffRate;
            
          await new Promise(resolve => setTimeout(resolve, backoffTime));
        }
      }
    }
  }

  private notifyStatusChange(): void {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(this._status);
      } catch (error) {
        console.error('[USBConsumer] Error in status callback:', error);
      }
    });
  }

  private notifyCommand(command: RobotCommand): void {
    this.commandCallbacks.forEach(callback => {
      try {
        callback(command);
      } catch (error) {
        console.error('[USBConsumer] Error in command callback:', error);
      }
    });
  }
} 