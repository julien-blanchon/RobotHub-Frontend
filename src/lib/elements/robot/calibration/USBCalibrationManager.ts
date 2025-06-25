import type { JointCalibration, CalibrationState } from '../models.js';
import { scsServoSDK } from "feetech.js";
import { ROBOT_CONFIG } from '../config.js';

export class USBCalibrationManager {
  // Joint configuration
  private readonly jointIds = [1, 2, 3, 4, 5, 6];
  private readonly jointNames = ["Rotation", "Pitch", "Elbow", "Wrist_Pitch", "Wrist_Roll", "Jaw"];

  // Calibration state
  private jointCalibrations: Record<string, JointCalibration> = {};
  private _calibrationState: CalibrationState = {
    isCalibrating: false,
    progress: 0
  };

  // Connection state for calibration
  private isConnectedForCalibration = false;
  private baudRate: number = 1000000;

  // Calibration polling
  private calibrationPollingAbortController: AbortController | null = null;
  private lastPositions: Record<string, number> = {};
  private calibrationCallbacks: (() => void)[] = [];

  // Calibration completion callback with final positions
  private calibrationCompleteCallback: ((finalPositions: Record<string, number>) => void) | null = null;

  // Servo reading queue for calibration
  private isReadingServos = false;
  private readingQueue: Array<{
    servoId: number;
    resolve: (value: number) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor(baudRate: number = ROBOT_CONFIG.usb.baudRate) {
    this.baudRate = baudRate;

    // Initialize joint calibrations
    this.jointNames.forEach(name => {
      this.jointCalibrations[name] = { isCalibrated: false };
    });
  }

  // Getters
  get isCalibrated(): boolean {
    return Object.values(this.jointCalibrations).every(cal => cal.isCalibrated);
  }

  get needsCalibration(): boolean {
    return !this.isCalibrated;
  }

  get calibrationState(): CalibrationState {
    return this._calibrationState;
  }

  get jointNames_(): string[] {
    return [...this.jointNames];
  }

  // Connection management for calibration
  async ensureConnectedForCalibration(): Promise<void> {
    if (this.isConnectedForCalibration) {
      console.log('[USBCalibrationManager] Already connected for calibration');
      return;
    }

    try {
      console.log('[USBCalibrationManager] Connecting SDK for calibration...');
      await scsServoSDK.connect({ baudRate: this.baudRate });
      this.isConnectedForCalibration = true;
      console.log('[USBCalibrationManager] Connected successfully for calibration');
    } catch (error) {
      console.error('[USBCalibrationManager] Failed to connect SDK for calibration:', error);
      throw error;
    }
  }

  async disconnectFromCalibration(): Promise<void> {
    if (!this.isConnectedForCalibration) return;

    try {
      await scsServoSDK.disconnect();
      this.isConnectedForCalibration = false;
      console.log('[USBCalibrationManager] Disconnected from calibration');
    } catch (error) {
      console.warn('[USBCalibrationManager] Failed to disconnect from calibration:', error);
    }
  }

  // Check if the SDK is currently connected (for external use)
  get isSDKConnected(): boolean {
    return this.isConnectedForCalibration && scsServoSDK.isConnected();
  }

  // Calibration methods
  async startCalibration(): Promise<void> {
    if (this._calibrationState.isCalibrating) {
      console.warn('[USBCalibrationManager] Calibration already in progress');
      return;
    }

    console.log('[USBCalibrationManager] Starting calibration process');

    // Ensure connection for calibration
    await this.ensureConnectedForCalibration();

    // Unlock all servos for calibration (allow manual movement)
    console.log('[USBCalibrationManager] 🔓 Unlocking all servos for calibration...');
    try {
      await scsServoSDK.unlockServos(this.jointIds);
      console.log('[USBCalibrationManager] ✅ All servos unlocked for manual movement during calibration');
    } catch (error) {
      console.warn('[USBCalibrationManager] Warning: Failed to unlock some servos for calibration:', error);
    }

    this._calibrationState = {
      isCalibrating: true,
      progress: 0
    };

    // Initialize calibrations with current values
    this.jointCalibrations = {};
    this.jointNames.forEach(name => {
      const currentValue = this.lastPositions[name] || 2048;
      this.jointCalibrations[name] = {
        isCalibrated: false,
        minServoValue: currentValue,
        maxServoValue: currentValue
      };
    });

    this.startCalibrationPolling();
    this.notifyCalibrationChange();
  }

  async stopCalibration(): Promise<void> {
    console.log('[USBCalibrationManager] Stopping calibration');

    this._calibrationState = {
      isCalibrating: false,
      progress: 100
    };

    // Mark all joints as calibrated
    this.jointNames.forEach(name => {
      if (this.jointCalibrations[name]) {
        this.jointCalibrations[name].isCalibrated = true;
      }
    });

    this.stopCalibrationPolling();

    // NEW: Read final positions and sync to virtual robot before locking
    console.log('[USBCalibrationManager] 📍 Reading final servo positions for virtual robot sync...');
    try {
      const finalPositions = await this.readFinalPositionsAndSync();
      console.log('[USBCalibrationManager] ✅ Final positions read and synced to virtual robot');

      // Notify robot of calibration completion with final positions
      if (this.calibrationCompleteCallback) {
        this.calibrationCompleteCallback(finalPositions);
      }
    } catch (error) {
      console.error('[USBCalibrationManager] Failed to read final positions:', error);
    }

    this.notifyCalibrationChange();

    // Keep connection open - don't disconnect automatically
    // The connection will be reused by USB drivers
    console.log('[USBCalibrationManager] Calibration complete, keeping connection for drivers');
  }

  skipCalibration(): void {
    console.log('[USBCalibrationManager] Skipping calibration, using full range');

    // Set full range for all joints
    this.jointNames.forEach(name => {
      this.jointCalibrations[name] = {
        isCalibrated: true,
        minServoValue: 0,
        maxServoValue: 4095
      };
    });

    this._calibrationState = {
      isCalibrating: false,
      progress: 100
    };

    this.notifyCalibrationChange();
  }

  // NEW: Set predefined calibration values
  async setPredefinedCalibration(): Promise<void> {
    console.log('[USBCalibrationManager] Setting predefined calibration values');

    // Ensure SDK connection for hardware access
    await this.ensureConnectedForCalibration();

    // Predefined calibration values based on known good robot configuration
    const predefinedValues: Record<string, { min: number; max: number; current: number }> = {
      "Rotation": { current: 2180, min: 764, max: 3388 },
      "Pitch": { current: 1159, min: 1138, max: 3501 },
      "Elbow": { current: 2874, min: 660, max: 2876 },
      "Wrist_Pitch": { current: 2138, min: 762, max: 3075 },
      "Wrist_Roll": { current: 2081, min: 154, max: 3995 },
      "Jaw": { current: 2061, min: 2013, max: 3555 }
    };

    // Set calibration values for all joints
    this.jointNames.forEach(name => {
      const values = predefinedValues[name];
      if (values) {
        this.jointCalibrations[name] = {
          isCalibrated: true,
          minServoValue: values.min,
          maxServoValue: values.max
        };
        // Set current position for reference
        this.lastPositions[name] = values.current;
      }
    });

    this._calibrationState = {
      isCalibrating: false,
      progress: 100
    };

    this.notifyCalibrationChange();
    console.log('[USBCalibrationManager] Predefined calibration values applied successfully');
  }

  // NEW: Read final positions and prepare for sync
  private async readFinalPositionsAndSync(): Promise<Record<string, number>> {
    const finalPositions: Record<string, number> = {};

    console.log('[USBCalibrationManager] Reading final positions from all servos...');

    // Read all servo positions sequentially
    for (let i = 0; i < this.jointIds.length; i++) {
      const servoId = this.jointIds[i];
      const jointName = this.jointNames[i];

      try {
        const position = await this.readServoPosition(servoId);
        finalPositions[jointName] = position;
        this.lastPositions[jointName] = position;

        console.log(`[USBCalibrationManager] ${jointName} (servo ${servoId}): ${position} (raw) -> ${this.normalizeValue(position, jointName).toFixed(1)}% (normalized)`);
      } catch (error) {
        console.warn(`[USBCalibrationManager] Failed to read final position for ${jointName} (servo ${servoId}):`, error);
        // Use last known position as fallback
        finalPositions[jointName] = this.lastPositions[jointName] || 2048;
      }
    }

    return finalPositions;
  }

  // NEW: Set callback for calibration completion with final positions
  onCalibrationCompleteWithPositions(callback: (finalPositions: Record<string, number>) => void): () => void {
    this.calibrationCompleteCallback = callback;
    return () => {
      this.calibrationCompleteCallback = null;
    };
  }

  // Post-calibration servo locking methods
  async lockServosForProduction(): Promise<void> {
    if (!this.isSDKConnected) {
      throw new Error('SDK not connected - cannot lock servos');
    }

    console.log('[USBCalibrationManager] 🔒 Locking all servos for production use (robot control)...');
    try {
      // Use the new lockServosForProduction function that both locks and enables torque
      await scsServoSDK.lockServosForProduction(this.jointIds);
      console.log('[USBCalibrationManager] ✅ All servos locked for production - robot is now controlled and cannot be moved manually');
    } catch (error) {
      console.error('[USBCalibrationManager] Failed to lock servos for production:', error);
      throw error;
    }
  }

  async keepServosUnlockedForConsumer(): Promise<void> {
    if (!this.isSDKConnected) {
      console.log('[USBCalibrationManager] SDK not connected - servos remain in current state');
      return;
    }

    console.log('[USBCalibrationManager] 🔓 Keeping servos unlocked for consumer use (reading positions)...');
    try {
      // Ensure servos are unlocked for reading
      await scsServoSDK.unlockServos(this.jointIds);
      console.log('[USBCalibrationManager] ✅ All servos remain unlocked for consumer - can be moved manually and positions read');
    } catch (error) {
      console.warn('[USBCalibrationManager] Warning: Failed to ensure servos are unlocked for consumer:', error);
    }
  }

  // Data access methods
  getCurrentRawValue(jointName: string): number | undefined {
    return this.lastPositions[jointName];
  }

  getJointCalibration(jointName: string): JointCalibration | undefined {
    return this.jointCalibrations[jointName];
  }

  getJointRange(jointName: string): number {
    const calibration = this.jointCalibrations[jointName];
    if (!calibration?.minServoValue || !calibration?.maxServoValue) return 0;
    return Math.abs(calibration.maxServoValue - calibration.minServoValue);
  }

  getAllCalibrations(): Record<string, JointCalibration> {
    return { ...this.jointCalibrations };
  }

  // Value conversion methods
  normalizeValue(servoValue: number, jointName: string): number {
    const calibration = this.jointCalibrations[jointName];
    const isGripper = jointName.toLowerCase() === 'jaw' || jointName.toLowerCase() === 'gripper';

    if (!calibration?.isCalibrated || !calibration.minServoValue || !calibration.maxServoValue) {
      if (isGripper) {
        return (servoValue / 4095) * 100;
      } else {
        return ((servoValue - 2048) / 2048) * 100;
      }
    }

    const { minServoValue, maxServoValue } = calibration;
    if (maxServoValue === minServoValue) return 0;

    const bounded = Math.max(minServoValue, Math.min(maxServoValue, servoValue));

    if (isGripper) {
      return ((bounded - minServoValue) / (maxServoValue - minServoValue)) * 100;
    } else {
      return (((bounded - minServoValue) / (maxServoValue - minServoValue)) * 200) - 100;
    }
  }

  denormalizeValue(normalizedValue: number, jointName: string): number {
    const calibration = this.jointCalibrations[jointName];
    const isGripper = jointName.toLowerCase() === 'jaw' || jointName.toLowerCase() === 'gripper';

    if (!calibration?.isCalibrated || !calibration.minServoValue || !calibration.maxServoValue) {
      // No calibration, use appropriate default conversion
      if (isGripper) {
        return Math.round((normalizedValue / 100) * 4095);
      } else {
        return Math.round(2048 + (normalizedValue / 100) * 2048);
      }
    }

    const { minServoValue, maxServoValue } = calibration;
    let ratio: number;

    if (isGripper) {
      ratio = normalizedValue / 100;
    } else {
      ratio = (normalizedValue + 100) / 200;
    }

    const servoValue = minServoValue + ratio * (maxServoValue - minServoValue);
    return Math.round(Math.max(minServoValue, Math.min(maxServoValue, servoValue)));
  }

  // Event handling
  onCalibrationChange(callback: () => void): () => void {
    this.calibrationCallbacks.push(callback);
    return () => {
      const index = this.calibrationCallbacks.indexOf(callback);
      if (index >= 0) {
        this.calibrationCallbacks.splice(index, 1);
      }
    };
  }

  // Format servo value for display
  formatServoValue(value: number | undefined): string {
    return value !== undefined ? value.toString() : '---';
  }

  // Cleanup
  async destroy(): Promise<void> {
    console.log('[USBCalibrationManager] 🧹 Destroying calibration manager...');

    this.stopCalibrationPolling();

    // Safely unlock all servos before disconnecting (best practice)
    if (this.isSDKConnected) {
      try {
        console.log('[USBCalibrationManager] 🔓 Safely unlocking all servos before cleanup...');
        await scsServoSDK.unlockServosForManualMovement(this.jointIds);
        console.log('[USBCalibrationManager] ✅ All servos safely unlocked for manual movement');
      } catch (error) {
        console.warn('[USBCalibrationManager] Warning: Failed to safely unlock servos during cleanup:', error);
      }
    }

    await this.disconnectFromCalibration();
    this.calibrationCallbacks = [];
    this.calibrationCompleteCallback = null;

    console.log('[USBCalibrationManager] ✅ Calibration manager destroyed');
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

  private async startCalibrationPolling(): Promise<void> {
    this.stopCalibrationPolling();

    this.calibrationPollingAbortController = new AbortController();
    const signal = this.calibrationPollingAbortController.signal;

    console.log('[USBCalibrationManager] Starting calibration polling');

    try {
      while (!signal.aborted && this._calibrationState.isCalibrating) {
        const readPromises = this.jointIds.map(async (servoId, i) => {
          if (signal.aborted) return null;

          const jointName = this.jointNames[i];

          try {
            const currentValue = await this.readServoPosition(servoId);
            return { jointName, currentValue };
          } catch (error) {
            return null;
          }
        });

        const results = await Promise.all(readPromises);
        let hasUpdates = false;

        results.forEach(result => {
          if (!result) return;

          const { jointName, currentValue } = result;
          this.lastPositions[jointName] = currentValue;

          const calibration = this.jointCalibrations[jointName];
          if (calibration) {
            if (currentValue < calibration.minServoValue!) {
              calibration.minServoValue = currentValue;
              hasUpdates = true;
            }
            if (currentValue > calibration.maxServoValue!) {
              calibration.maxServoValue = currentValue;
              hasUpdates = true;
            }
          }
        });

        if (hasUpdates) {
          this.notifyCalibrationChange();
        }

        // Calculate progress
        const totalRangeNeeded = 500;
        let totalRangeDiscovered = 0;

        this.jointNames.forEach(name => {
          const calibration = this.jointCalibrations[name];
          if (calibration?.minServoValue !== undefined && calibration?.maxServoValue !== undefined) {
            totalRangeDiscovered += Math.abs(calibration.maxServoValue - calibration.minServoValue);
          }
        });

        const newProgress = Math.min(100, (totalRangeDiscovered / (totalRangeNeeded * this.jointNames.length)) * 100);
        if (Math.abs(newProgress - this._calibrationState.progress) > 1) {
          this._calibrationState.progress = newProgress;
          this.notifyCalibrationChange();
        }

        await new Promise(resolve => setTimeout(resolve, 10));
      }
    } catch (error) {
      if (!signal.aborted) {
        console.error('[USBCalibrationManager] Calibration polling error:', error);
      }
    }
  }

  private stopCalibrationPolling(): void {
    if (this.calibrationPollingAbortController) {
      this.calibrationPollingAbortController.abort();
      this.calibrationPollingAbortController = null;
    }
  }

  private notifyCalibrationChange(): void {
    this.calibrationCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('[USBCalibrationManager] Error in calibration callback:', error);
      }
    });
  }
} 