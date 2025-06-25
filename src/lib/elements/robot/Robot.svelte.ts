import type { 
  JointState, 
  RobotCommand, 
  ConnectionStatus, 
  USBDriverConfig, 
  RemoteDriverConfig,
  Consumer,
  Producer
} from './models.js';
import type { Positionable, Position3D } from '$lib/types/positionable.js';
import { USBConsumer } from './drivers/USBConsumer.js';
import { USBProducer } from './drivers/USBProducer.js';
import { RemoteConsumer } from './drivers/RemoteConsumer.js';
import { RemoteProducer } from './drivers/RemoteProducer.js';
import { USBCalibrationManager } from './calibration/USBCalibrationManager.js';
import type { UrdfRobotState } from '@/types/robot.js';
import { ROBOT_CONFIG } from './config.js';
import type IUrdfRobot from '@/components/3d/elements/robot/URDF/interfaces/IUrdfRobot.js';

export class Robot implements Positionable {
  // Core robot data
  readonly id: string;
  private unsubscribeFns: (() => void)[] = [];
  
  // Command synchronization to prevent state conflicts
  private commandMutex = $state(false);
  private pendingCommands: RobotCommand[] = [];
  
  // Command deduplication to prevent rapid duplicate commands
  private lastCommandTime = 0;
  private lastCommandValues: Record<string, number> = {};
  
  // Memory management
  private lastCleanup = 0;
  
  // Single consumer and multiple producers using Svelte 5 runes - PUBLIC for reactive access
  consumer = $state<Consumer | null>(null);
  producers = $state<Producer[]>([]);

  // Reactive state using Svelte 5 runes - PUBLIC for reactive access
  joints = $state<Record<string, JointState>>({});
  position = $state<Position3D>({ x: 0, y: 0, z: 0 });
  isManualControlEnabled = $state(true);
  connectionStatus = $state<ConnectionStatus>({ isConnected: false });
  
  // URDF robot state for 3D visualization - PUBLIC for reactive access
  urdfRobotState = $state<IUrdfRobot | null>(null);
  
  // Shared USB calibration manager for this robot
  private usbCalibrationManager: USBCalibrationManager = new USBCalibrationManager();
  
  // Derived reactive values for components
  jointArray = $derived(Object.values(this.joints));
  hasProducers = $derived(this.producers.length > 0);
  hasConsumer = $derived(this.consumer !== null && this.consumer.status.isConnected);
  outputDriverCount = $derived(this.producers.filter(d => d.status.isConnected).length);

  constructor(id: string, initialJoints: JointState[], urdfRobotState?: IUrdfRobot) {
    this.id = id;
    
    // Store URDF robot state if provided
    this.urdfRobotState = urdfRobotState || null;
    
    // Initialize joints with normalized values
    initialJoints.forEach(joint => {
      const isGripper = joint.name.toLowerCase() === 'jaw' || joint.name.toLowerCase() === 'gripper';
      this.joints[joint.name] = { 
        ...joint,
        value: isGripper ? 0 : 0 // Start at neutral position
      };
    });
  }

  // Method to set URDF robot state after creation (for async loading)
  setUrdfRobotState(urdfRobotState: any): void {
    this.urdfRobotState = urdfRobotState;
  }

  /**
   * Update position (implements Positionable interface)
   */
  updatePosition(newPosition: Position3D): void {
    this.position = { ...newPosition };
  }

  // Calibration access
  get calibrationManager(): USBCalibrationManager {
    return this.usbCalibrationManager;
  }

  // NEW: Sync virtual robot to final calibration positions
  syncToCalibrationPositions(finalPositions: Record<string, number>): void {
    console.log(`[Robot ${this.id}] 🔄 Syncing virtual robot to final calibration positions...`);
    
    Object.entries(finalPositions).forEach(([jointName, rawPosition]) => {
      const joint = this.joints[jointName];
      if (!joint) {
        console.warn(`[Robot ${this.id}] Joint ${jointName} not found for position sync`);
        return;
      }

      // Convert raw servo position to normalized value using calibration data
      const normalizedValue = this.usbCalibrationManager.normalizeValue(rawPosition, jointName);
      
      // Clamp to appropriate normalized range based on joint type
      let clampedValue: number;
      if (jointName.toLowerCase() === 'jaw' || jointName.toLowerCase() === 'gripper') {
        clampedValue = Math.max(0, Math.min(100, normalizedValue));
      } else {
        clampedValue = Math.max(-100, Math.min(100, normalizedValue));
      }
      
      console.log(`[Robot ${this.id}] ${jointName}: ${rawPosition} (raw) -> ${normalizedValue.toFixed(1)} -> ${clampedValue.toFixed(1)} (normalized)`);
      
      // Update joint value to match physical servo position
      this.joints[jointName] = { ...joint, value: clampedValue };
    });
    
    console.log(`[Robot ${this.id}] ✅ Virtual robot synced to calibration positions`);
  }

  // Joint value updates (normalized)
  updateJoint(name: string, normalizedValue: number): void {
    if (!this.isManualControlEnabled) {
      console.warn('Manual control is disabled');
      return;
    }

    const joint = this.joints[name];
    if (!joint) {
      console.warn(`Joint ${name} not found`);
      return;
    }

    // Clamp to appropriate normalized range based on joint type
    if (name.toLowerCase() === 'jaw' || name.toLowerCase() === 'gripper') {
      normalizedValue = Math.max(0, Math.min(100, normalizedValue));
    } else {
      normalizedValue = Math.max(-100, Math.min(100, normalizedValue));
    }

    console.debug(`[Robot ${this.id}] Manual update joint ${name} to ${normalizedValue} (normalized)`);

    // Create a new joint object to ensure reactivity
    this.joints[name] = { ...joint, value: normalizedValue };

    // Send normalized command to producers
    this.sendToProducers({ joints: [{ name, value: normalizedValue }] });
  }

  executeCommand(command: RobotCommand): void {
    // Command deduplication - skip if same values sent within dedup window
    const now = Date.now();
    if (now - this.lastCommandTime < ROBOT_CONFIG.commands.dedupWindow) {
      const hasChanges = command.joints.some(joint => 
        Math.abs((this.lastCommandValues[joint.name] || 0) - joint.value) > 0.5
      );
      if (!hasChanges) {
        console.debug(`[Robot ${this.id}] 🔄 Skipping duplicate command within ${ROBOT_CONFIG.commands.dedupWindow}ms window`);
        return;
      }
    }
    
    // Update deduplication tracking
    this.lastCommandTime = now;
    command.joints.forEach(joint => {
      this.lastCommandValues[joint.name] = joint.value;
    });
    
    // Queue command if mutex is locked to prevent race conditions
    if (this.commandMutex) {
      if (this.pendingCommands.length >= ROBOT_CONFIG.commands.maxQueueSize) {
        console.warn(`[Robot ${this.id}] Command queue full, dropping oldest command`);
        this.pendingCommands.shift();
      }
      this.pendingCommands.push(command);
      return;
    }
    
    this.commandMutex = true;
    
    try {
      console.debug(`[Robot ${this.id}] Executing command with ${command.joints.length} joints:`, 
        command.joints.map(j => `${j.name}=${j.value}`).join(', '));
      
      // Check if USB calibration is in progress
      if (this.usbCalibrationManager.calibrationState.isCalibrating) {
        console.debug(`[Robot ${this.id}] 🚫 Blocking virtual robot updates - USB calibration in progress`);
        // Still send to producers, but don't update virtual robot
        this.sendToProducers(command);
        return;
      }
      
      // Check if USB calibration is needed (if we have USB consumer/producers)
      const hasUSBDrivers = (this.consumer instanceof USBConsumer) || 
                           this.producers.some(p => p instanceof USBProducer);
      
      if (hasUSBDrivers && this.usbCalibrationManager.needsCalibration) {
        console.debug(`[Robot ${this.id}] ⏳ Blocking virtual robot updates - USB drivers need calibration`);
        // Still send to producers, but don't update virtual robot
        this.sendToProducers(command);
        return;
      }
      
      console.debug(`[Robot ${this.id}] ✅ Updating virtual robot - USB calibrated or no USB drivers`);
      
      command.joints.forEach(jointCmd => {
        const joint = this.joints[jointCmd.name];
        if (joint) {
          // Clamp to appropriate normalized range based on joint type
          let normalizedValue: number;
          if (jointCmd.name.toLowerCase() === 'jaw' || jointCmd.name.toLowerCase() === 'gripper') {
            normalizedValue = Math.max(0, Math.min(100, jointCmd.value));
          } else {
            normalizedValue = Math.max(-100, Math.min(100, jointCmd.value));
          }
          
          console.debug(`[Robot ${this.id}] Joint ${jointCmd.name}: ${jointCmd.value} -> ${normalizedValue} (normalized)`);
          
          // Create a new joint object to ensure reactivity
          this.joints[jointCmd.name] = { ...joint, value: normalizedValue };
        } else {
          console.warn(`[Robot ${this.id}] Joint ${jointCmd.name} not found`);
        }
      });

      // Send normalized command to producers
      this.sendToProducers(command);
    } finally {
      this.commandMutex = false;
      
      // Periodic cleanup to prevent memory leaks
      const now = Date.now();
      if (now - this.lastCleanup > ROBOT_CONFIG.performance.memoryCleanupInterval) {
        // Clear old command values that haven't been updated recently
        Object.keys(this.lastCommandValues).forEach(jointName => {
          if (now - this.lastCommandTime > ROBOT_CONFIG.performance.memoryCleanupInterval) {
            delete this.lastCommandValues[jointName];
          }
        });
        this.lastCleanup = now;
      }
      
      // Process any pending commands
      if (this.pendingCommands.length > 0) {
        const nextCommand = this.pendingCommands.shift();
        if (nextCommand) {
          // Use setTimeout to prevent stack overflow with rapid commands
          setTimeout(() => this.executeCommand(nextCommand), 0);
        }
      }
    }
  }

  // Consumer management (input driver) - SINGLE consumer only
  async setConsumer(config: USBDriverConfig | RemoteDriverConfig): Promise<string> {
    return this._setConsumer(config, false);
  }

  // Join existing room as consumer (for Inference Session integration)
  async joinAsConsumer(config: RemoteDriverConfig): Promise<string> {
    if (config.type !== 'remote') {
      throw new Error('joinAsConsumer only supports remote drivers');
    }
    return this._setConsumer(config, true);
  }

  private async _setConsumer(config: USBDriverConfig | RemoteDriverConfig, joinExistingRoom: boolean): Promise<string> {
    // Remove existing consumer if any
    if (this.consumer) {
      await this.removeConsumer();
    }

    const consumer = this.createConsumer(config);
    
    // Only pass joinExistingRoom to remote drivers
    if (config.type === 'remote') {
      await (consumer as any).connect(joinExistingRoom);
    } else {
      await consumer.connect();
    }
    
    // Set up command listening
    const commandUnsubscribe = consumer.onCommand((command: RobotCommand) => {
      this.executeCommand(command);
    });
    this.unsubscribeFns.push(commandUnsubscribe);

    // Monitor status changes
    const statusUnsubscribe = consumer.onStatusChange(() => {
      this.updateStates();
    });
    this.unsubscribeFns.push(statusUnsubscribe);

    // Start listening for consumers with this capability
    if ('startListening' in consumer && consumer.startListening) {
      await consumer.startListening();
    }

    this.consumer = consumer;
    this.updateStates();
    
    return consumer.id;
  }

  // Producer management (output drivers) - MULTIPLE allowed
  async addProducer(config: USBDriverConfig | RemoteDriverConfig): Promise<string> {
    return this._addProducer(config, false);
  }

  // Join existing room as producer (for Inference Session integration)
  async joinAsProducer(config: RemoteDriverConfig): Promise<string> {
    if (config.type !== 'remote') {
      throw new Error('joinAsProducer only supports remote drivers');
    }
    return this._addProducer(config, true);
  }

  private async _addProducer(config: USBDriverConfig | RemoteDriverConfig, joinExistingRoom: boolean): Promise<string> {
    const producer = this.createProducer(config);
    
    // Only pass joinExistingRoom to remote drivers
    if (config.type === 'remote') {
      await (producer as any).connect(joinExistingRoom);
    } else {
      await producer.connect();
    }

    // Monitor status changes
    const statusUnsubscribe = producer.onStatusChange(() => {
      this.updateStates();
    });
    this.unsubscribeFns.push(statusUnsubscribe);

    this.producers.push(producer);
    this.updateStates();
    
    return producer.id;
  }

  async removeConsumer(): Promise<void> {
    if (this.consumer) {
      // Stop listening for consumers with this capability
      if ('stopListening' in this.consumer && this.consumer.stopListening) {
        await this.consumer.stopListening();
      }
      await this.consumer.disconnect();
      
      this.consumer = null;
      this.updateStates();
    }
  }

  async removeProducer(driverId: string): Promise<void> {
    const driverIndex = this.producers.findIndex(d => d.id === driverId);
    if (driverIndex >= 0) {
      const driver = this.producers[driverIndex];
      await driver.disconnect();
      
      this.producers.splice(driverIndex, 1);
      this.updateStates();
    }
  }

  // Private methods
  private createConsumer(config: USBDriverConfig | RemoteDriverConfig): Consumer {
    switch (config.type) {
      case 'usb':
        return new USBConsumer(config, this.usbCalibrationManager);
      case 'remote':
        return new RemoteConsumer(config);
      default:
        const _exhaustive: never = config;
        throw new Error(`Unknown consumer type: ${JSON.stringify(_exhaustive)}`);
    }
  }

  private createProducer(config: USBDriverConfig | RemoteDriverConfig): Producer {
    switch (config.type) {
      case 'usb':
        return new USBProducer(config, this.usbCalibrationManager);
      case 'remote':
        return new RemoteProducer(config);
      default:
        const _exhaustive: never = config;
        throw new Error(`Unknown producer type: ${JSON.stringify(_exhaustive)}`);
    }
  }

  // Convert normalized values to URDF radians for 3D visualization
  convertNormalizedToUrdfRadians(jointName: string, normalizedValue: number): number {
    const joint = this.joints[jointName];
    if (!joint?.limits || joint.limits.lower === undefined || joint.limits.upper === undefined) {
      // Default ranges
      if (jointName.toLowerCase() === 'jaw' || jointName.toLowerCase() === 'gripper') {
        return (normalizedValue / 100) * Math.PI;
      } else {
        return (normalizedValue / 100) * Math.PI;
      }
    }

    const { lower, upper } = joint.limits;
    
    // Map normalized value to URDF range
    let normalizedRatio: number;
    if (jointName.toLowerCase() === 'jaw' || jointName.toLowerCase() === 'gripper') {
      normalizedRatio = normalizedValue / 100; // 0-100 -> 0-1
    } else {
      normalizedRatio = (normalizedValue + 100) / 200; // -100-+100 -> 0-1
    }
    
    const urdfRadians = lower + normalizedRatio * (upper - lower);
    
    console.debug(`[Robot ${this.id}] Joint ${jointName}: ${normalizedValue} (norm) -> ${urdfRadians.toFixed(3)} (rad)`);
    
    return urdfRadians;
  }

  private async sendToProducers(command: RobotCommand): Promise<void> {
    const connectedProducers = this.producers.filter(d => d.status.isConnected);
    
    console.debug(`[Robot ${this.id}] Sending command to ${connectedProducers.length} producers:`, command);
    
    // Send to all connected producers
    await Promise.all(
      connectedProducers.map(async (producer) => {
        try {
          await producer.sendCommand(command);
        } catch (error) {
          console.error(`[Robot ${this.id}] Failed to send command to producer ${producer.id}:`, error);
        }
      })
    );
  }

  private updateStates(): void {
    // Update connection status
    const hasConnectedDrivers = (this.consumer?.status.isConnected) || 
                               this.producers.some(d => d.status.isConnected);
    
    this.connectionStatus = {
      isConnected: hasConnectedDrivers,
      lastConnected: hasConnectedDrivers ? new Date() : this.connectionStatus.lastConnected
    };

    // Manual control is enabled when no connected consumer
    this.isManualControlEnabled = !this.consumer?.status.isConnected;
  }

  // Cleanup
  async destroy(): Promise<void> {
    // Unsubscribe from all callbacks
    this.unsubscribeFns.forEach(fn => fn());
    this.unsubscribeFns = [];

    // Disconnect all drivers
    const allDrivers = [this.consumer, ...this.producers].filter(Boolean) as (Consumer | Producer)[];
    await Promise.allSettled(
      allDrivers.map(async (driver) => {
        try {
          await driver.disconnect();
        } catch (error) {
          console.error(`Error disconnecting driver ${driver.id}:`, error);
        }
      })
    );

    // Clean up calibration manager
    await this.usbCalibrationManager.destroy();
  }
} 