import type { Consumer, RobotCommand } from '../models.js';
import { USBServoDriver } from './USBServoDriver.js';
import { ROBOT_CONFIG } from '../config.js';

export class USBConsumer extends USBServoDriver implements Consumer {
  private commandCallbacks: ((command: RobotCommand) => void)[] = [];
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private lastPositions: Record<number, number> = {};
  private errorCount = 0;

  constructor(config: any) {
    super(config, 'Consumer');
  }

  async connect(): Promise<void> {
    // Connect to USB first (this triggers browser's device selection dialog)
    await this.connectToUSB();
    
    // Unlock servos for manual movement (consumer mode)
    await this.unlockAllServos();
    
    // Note: Calibration is checked when operations are actually needed
  }

  async disconnect(): Promise<void> {
    await this.stopListening();
    await this.disconnectFromUSB();
  }

  async startListening(): Promise<void> {
    if (!this._status.isConnected || this.pollingInterval !== null) {
      return;
    }

    if (!this.isCalibrated) {
      throw new Error('Cannot start listening: not calibrated');
    }

    console.log(`[${this.name}] Starting position listening...`);
    this.errorCount = 0;
    
    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollAndBroadcastPositions();
        this.errorCount = 0;
      } catch (error) {
        this.errorCount++;
        console.warn(`[${this.name}] Polling error (${this.errorCount}):`, error);
        
        if (this.errorCount >= ROBOT_CONFIG.polling.maxPollingErrors) {
          console.warn(`[${this.name}] Too many polling errors, slowing down...`);
          await this.stopListening();
          setTimeout(() => this.startListening(), ROBOT_CONFIG.polling.errorBackoffRate);
        }
      }
    }, ROBOT_CONFIG.polling.consumerPollingRate);
  }

  async stopListening(): Promise<void> {
    if (this.pollingInterval !== null) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      console.log(`[${this.name}] Stopped position listening`);
    }
  }

  // Event handlers already in base class

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
  private async pollAndBroadcastPositions(): Promise<void> {
    if (!this.scsServoSDK || !this._status.isConnected) {
      return;
    }

    try {
      // Read positions for all servos
      const servoIds = Object.values(this.jointToServoMap);
      const positions = await this.scsServoSDK.syncReadPositions(servoIds);
      
      const jointsWithChanges: { name: string; value: number }[] = [];
      
      // Check for position changes and convert to normalized values
      Object.entries(this.jointToServoMap).forEach(([jointName, servoId]) => {
        const currentPosition = positions.get(servoId);
        const lastPosition = this.lastPositions[servoId];
        
        if (currentPosition !== undefined && 
            (lastPosition === undefined || 
             Math.abs(currentPosition - lastPosition) > ROBOT_CONFIG.performance.jointUpdateThreshold)) {
          
          this.lastPositions[servoId] = currentPosition;
          
          // Convert to normalized value using calibration (required)
          const normalizedValue = this.normalizeValue(currentPosition, jointName);
          
          jointsWithChanges.push({
            name: jointName,
            value: normalizedValue
          });
        }
      });
      
      // Broadcast changes if any
      if (jointsWithChanges.length > 0) {
        const command: RobotCommand = {
          timestamp: Date.now(),
          joints: jointsWithChanges
        };
        
        this.notifyCommand(command);
      }
      
    } catch (error) {
      throw error; // Re-throw for error handling in polling loop
    }
  }

  private notifyCommand(command: RobotCommand): void {
    this.commandCallbacks.forEach(callback => {
      try {
        callback(command);
      } catch (error) {
        console.error(`[${this.name}] Error in command callback:`, error);
      }
    });
  }


} 