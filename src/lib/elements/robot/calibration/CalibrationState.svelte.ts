import type { JointCalibration } from '../models.js';
import { ROBOT_CONFIG } from '../config.js';

export class CalibrationState {
  // Reactive calibration state
  isCalibrating = $state(false);
  progress = $state(0);
  
  // Joint calibration data
  private jointCalibrations = $state<Record<string, JointCalibration>>({});
  private currentValues = $state<Record<string, number>>({});
  
  // Callbacks for completion with final positions
  private completionCallbacks: Array<(positions: Record<string, number>) => void> = [];

  constructor() {
    // Initialize calibration data for expected joints
    const jointNames = ["Rotation", "Pitch", "Elbow", "Wrist_Pitch", "Wrist_Roll", "Jaw"];
    jointNames.forEach(name => {
      this.jointCalibrations[name] = { 
        isCalibrated: false,
        minServoValue: undefined,
        maxServoValue: undefined
      };
      this.currentValues[name] = 0;
    });
  }

  // Computed properties
  get needsCalibration(): boolean {
    return Object.values(this.jointCalibrations).some(cal => !cal.isCalibrated);
  }

  get isCalibrated(): boolean {
    return Object.values(this.jointCalibrations).every(cal => cal.isCalibrated);
  }

  // Update current servo value during calibration
  updateCurrentValue(jointName: string, servoValue: number): void {
    this.currentValues[jointName] = servoValue;
    
    // Update calibration range if calibrating
    if (this.isCalibrating) {
      const calibration = this.jointCalibrations[jointName];
      if (calibration) {
        // Update min/max values
        if (calibration.minServoValue === undefined || servoValue < calibration.minServoValue) {
          calibration.minServoValue = servoValue;
        }
        if (calibration.maxServoValue === undefined || servoValue > calibration.maxServoValue) {
          calibration.maxServoValue = servoValue;
        }
        
        // Update progress based on range coverage
        this.updateProgress();
      }
    }
  }

  // Get current value for a joint
  getCurrentValue(jointName: string): number | undefined {
    return this.currentValues[jointName];
  }

  // Get calibration data for a joint
  getJointCalibration(jointName: string): JointCalibration | undefined {
    return this.jointCalibrations[jointName];
  }

  // Get formatted range string for display
  getJointRange(jointName: string): string {
    const calibration = this.jointCalibrations[jointName];
    if (!calibration || calibration.minServoValue === undefined || calibration.maxServoValue === undefined) {
      return "Not set";
    }
    return `${calibration.minServoValue}-${calibration.maxServoValue}`;
  }

  // Format servo value for display
  formatServoValue(value: number | undefined): string {
    return value !== undefined ? value.toString() : "---";
  }

  // Start calibration process
  startCalibration(): void {
    console.log("[CalibrationState] Starting calibration...");
    this.isCalibrating = true;
    this.progress = 0;
    
    // Reset calibration data
    Object.keys(this.jointCalibrations).forEach(jointName => {
      this.jointCalibrations[jointName] = {
        isCalibrated: false,
        minServoValue: undefined,
        maxServoValue: undefined
      };
    });
  }

  // Complete calibration and mark joints as calibrated
  completeCalibration(): Record<string, number> {
    console.log("[CalibrationState] Completing calibration...");
    
    const finalPositions: Record<string, number> = {};
    
    // Mark all joints with sufficient range as calibrated
    Object.keys(this.jointCalibrations).forEach(jointName => {
      const calibration = this.jointCalibrations[jointName];
      if (calibration.minServoValue !== undefined && calibration.maxServoValue !== undefined) {
        const range = calibration.maxServoValue - calibration.minServoValue;
        if (range >= ROBOT_CONFIG.calibration.minRangeThreshold) {
          calibration.isCalibrated = true;
          finalPositions[jointName] = this.currentValues[jointName] || 0;
          console.log(`[CalibrationState] Joint ${jointName} calibrated: ${this.getJointRange(jointName)} (range: ${range})`);
        } else {
          console.warn(`[CalibrationState] Joint ${jointName} range too small: ${range} < ${ROBOT_CONFIG.calibration.minRangeThreshold}`);
        }
      }
    });

    this.isCalibrating = false;
    this.progress = 100;
    
    // Notify completion callbacks
    this.completionCallbacks.forEach(callback => {
      try {
        callback(finalPositions);
      } catch (error) {
        console.error("[CalibrationState] Error in completion callback:", error);
      }
    });
    
    return finalPositions;
  }

  // Cancel calibration
  cancelCalibration(): void {
    console.log("[CalibrationState] Calibration cancelled");
    this.isCalibrating = false;
    this.progress = 0;
    
    // Reset calibration data
    Object.keys(this.jointCalibrations).forEach(jointName => {
      this.jointCalibrations[jointName] = {
        isCalibrated: false,
        minServoValue: undefined,
        maxServoValue: undefined
      };
    });
  }

  // Skip calibration (use predefined values)
  skipCalibration(): void {
    console.log("[CalibrationState] Skipping calibration with predefined values");
    
    // Set predefined calibration values for SO-100 arm
    const predefinedCalibrations = {
      "Rotation": { minServoValue: 500, maxServoValue: 3500, isCalibrated: true },
      "Pitch": { minServoValue: 500, maxServoValue: 3500, isCalibrated: true },
      "Elbow": { minServoValue: 500, maxServoValue: 3500, isCalibrated: true },
      "Wrist_Pitch": { minServoValue: 500, maxServoValue: 3500, isCalibrated: true },
      "Wrist_Roll": { minServoValue: 500, maxServoValue: 3500, isCalibrated: true },
      "Jaw": { minServoValue: 1000, maxServoValue: 3000, isCalibrated: true }
    };
    
    Object.entries(predefinedCalibrations).forEach(([jointName, calibration]) => {
      this.jointCalibrations[jointName] = calibration;
    });
    
    this.isCalibrating = false;
    this.progress = 100;
  }

  // Convert raw servo value to normalized percentage (for USB INPUT - reading from servo)
  normalizeValue(rawValue: number, jointName: string): number {
    const calibration = this.jointCalibrations[jointName];
    if (!calibration || !calibration.isCalibrated || 
        calibration.minServoValue === undefined || calibration.maxServoValue === undefined) {
      // No calibration, use appropriate default conversion
      const isGripper = jointName.toLowerCase() === 'jaw' || jointName.toLowerCase() === 'gripper';
      if (isGripper) {
        return Math.max(0, Math.min(100, (rawValue / 4095) * 100));
      } else {
        return Math.max(-100, Math.min(100, ((rawValue - 2048) / 2048) * 100));
      }
    }

    const { minServoValue, maxServoValue } = calibration;
    if (maxServoValue === minServoValue) return 0;

    // Bound the input servo value to calibrated range
    const bounded = Math.max(minServoValue, Math.min(maxServoValue, rawValue));
    
    const isGripper = jointName.toLowerCase() === 'jaw' || jointName.toLowerCase() === 'gripper';
    if (isGripper) {
      // Gripper: 0-100%
      return ((bounded - minServoValue) / (maxServoValue - minServoValue)) * 100;
    } else {
      // Regular joint: -100 to +100%
      return (((bounded - minServoValue) / (maxServoValue - minServoValue)) * 200) - 100;
    }
  }

  // Convert normalized percentage to raw servo value (for USB OUTPUT - writing to servo)
  denormalizeValue(normalizedValue: number, jointName: string): number {
    const calibration = this.jointCalibrations[jointName];
    if (!calibration || !calibration.isCalibrated || 
        calibration.minServoValue === undefined || calibration.maxServoValue === undefined) {
      // No calibration, use appropriate default conversion
      const isGripper = jointName.toLowerCase() === 'jaw' || jointName.toLowerCase() === 'gripper';
      if (isGripper) {
        return Math.round((normalizedValue / 100) * 4095);
      } else {
        return Math.round(2048 + (normalizedValue / 100) * 2048);
      }
    }

    const { minServoValue, maxServoValue } = calibration;
    const range = maxServoValue - minServoValue;

    let normalizedRatio: number;
    const isGripper = jointName.toLowerCase() === 'jaw' || jointName.toLowerCase() === 'gripper';
    if (isGripper) {
      // Gripper: 0-100% -> 0-1
      normalizedRatio = Math.max(0, Math.min(1, normalizedValue / 100));
    } else {
      // Regular joint: -100 to +100% -> 0-1
      normalizedRatio = Math.max(0, Math.min(1, (normalizedValue + 100) / 200));
    }

    return Math.round(minServoValue + normalizedRatio * range);
  }

  // Register callback for calibration completion with final positions
  onCalibrationCompleteWithPositions(callback: (positions: Record<string, number>) => void): () => void {
    this.completionCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.completionCallbacks.indexOf(callback);
      if (index >= 0) {
        this.completionCallbacks.splice(index, 1);
      }
    };
  }

  // Update progress based on calibration coverage
  private updateProgress(): void {
    if (!this.isCalibrating) return;

    let totalProgress = 0;
    let jointCount = 0;

    Object.values(this.jointCalibrations).forEach(calibration => {
      jointCount++;
      if (calibration.minServoValue !== undefined && calibration.maxServoValue !== undefined) {
        const range = calibration.maxServoValue - calibration.minServoValue;
        // Progress is based on range size (more range = more progress)
        const jointProgress = Math.min(100, (range / ROBOT_CONFIG.calibration.minRangeThreshold) * 100);
        totalProgress += jointProgress;
      }
    });

    this.progress = jointCount > 0 ? totalProgress / jointCount : 0;
  }

  // Cleanup
  destroy(): void {
    this.completionCallbacks = [];
  }
} 