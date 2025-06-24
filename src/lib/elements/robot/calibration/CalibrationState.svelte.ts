import type { USBCalibrationManager } from './USBCalibrationManager.js';
import type { JointCalibration } from '../models.js';
import { ROBOT_CONFIG } from '../config.js';

export class CalibrationState {
  private manager: USBCalibrationManager;
  
  // Reactive state using Svelte 5 runes - direct state management
  private _isCalibrating = $state(false);
  private _progress = $state(0);
  private _isCalibrated = $state(false);
  private _needsCalibration = $state(true);
  private _jointValues = $state<Record<string, number>>({});
  private _jointCalibrations = $state<Record<string, JointCalibration>>({});
  
  constructor(manager: USBCalibrationManager) {
    this.manager = manager;
    
    // Initialize reactive state
    manager.jointNames_.forEach(name => {
      this._jointValues[name] = 0;
      this._jointCalibrations[name] = { isCalibrated: false };
    });
    
    // Subscribe to manager changes
    this.setupManagerSubscription();
    
    // Initial state sync
    this.syncManagerState();
  }
  
  // Reactive getters - now use internal reactive state
  get isCalibrating(): boolean { return this._isCalibrating; }
  get progress(): number { return this._progress; }
  get isCalibrated(): boolean { return this._isCalibrated; }
  get needsCalibration(): boolean { return this._needsCalibration; }
  get jointValues(): Record<string, number> { return this._jointValues; }
  get jointCalibrations(): Record<string, JointCalibration> { return this._jointCalibrations; }
  
  // Get current value for a specific joint
  getCurrentValue(jointName: string): number | undefined {
    return this._jointValues[jointName];
  }
  
  // Get calibration for a specific joint
  getJointCalibration(jointName: string): JointCalibration | undefined {
    return this._jointCalibrations[jointName];
  }
  
  // Get range for a specific joint
  getJointRange(jointName: string): number {
    const calibration = this._jointCalibrations[jointName];
    if (!calibration?.minServoValue || !calibration?.maxServoValue) return 0;
    return Math.abs(calibration.maxServoValue - calibration.minServoValue);
  }
  
  private updateInterval: number | null = null;
  private managerUnsubscribe: (() => void) | null = null;

  private setupManagerSubscription(): void {
    // Use centralized config for UI update frequency
    this.updateInterval = setInterval(() => {
      this.syncManagerState();
    }, ROBOT_CONFIG.polling.uiUpdateRate); // Centralized UI update rate
    
    // Also listen to manager calibration changes for immediate updates
    const unsubscribe = this.manager.onCalibrationChange(() => {
      console.debug('[CalibrationState] Manager calibration changed, syncing state');
      this.syncManagerState();
    });
    
    // Store unsubscribe function for cleanup
    this.managerUnsubscribe = unsubscribe;
  }

  private syncManagerState(): void {
    // Sync manager state to reactive state
    this._isCalibrating = this.manager.calibrationState.isCalibrating;
    this._progress = this.manager.calibrationState.progress;
    this._isCalibrated = this.manager.isCalibrated;
    this._needsCalibration = this.manager.needsCalibration;
    
    // Update joint values and calibrations
    this.manager.jointNames_.forEach(name => {
      const currentValue = this.manager.getCurrentRawValue(name);
      if (currentValue !== undefined) {
        this._jointValues[name] = currentValue;
      }
      
      const calibration = this.manager.getJointCalibration(name);
      if (calibration) {
        // Create new object to ensure reactivity
        this._jointCalibrations[name] = { ...calibration };
      }
    }); 
  }

  // Cleanup method
  destroy(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    if (this.managerUnsubscribe) {
      this.managerUnsubscribe();
      this.managerUnsubscribe = null;
    }
  }
  
  // Format servo value for display
  formatServoValue(value: number | undefined): string {
    return value !== undefined ? value.toString() : '---';
  }
} 