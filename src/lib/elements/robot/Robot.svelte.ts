import type {
	JointState,
	RobotCommand,
	ConnectionStatus,
	USBDriverConfig,
	RemoteDriverConfig,
	Consumer,
	Producer
} from "./models.js";
import type { Positionable, Position3D } from "$lib/types/positionable.js";
import { USBConsumer } from "./drivers/USBConsumer.js";
import { USBProducer } from "./drivers/USBProducer.js";
import { RemoteConsumer } from "./drivers/RemoteConsumer.js";
import { RemoteProducer } from "./drivers/RemoteProducer.js";
import { USBServoDriver } from "./drivers/USBServoDriver.js";

import { ROBOT_CONFIG } from "./config.js";
import type IUrdfRobot from "@/components/3d/elements/robot/URDF/interfaces/IUrdfRobot.js";

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

	// Derived reactive values for components
	jointArray = $derived(Object.values(this.joints));
	hasProducers = $derived(this.producers.length > 0);
	hasConsumer = $derived(this.consumer !== null && this.consumer.status.isConnected);
	outputDriverCount = $derived(this.producers.filter((d) => d.status.isConnected).length);

	constructor(id: string, initialJoints: JointState[], urdfRobotState?: IUrdfRobot) {
		this.id = id;

		// Store URDF robot state if provided
		this.urdfRobotState = urdfRobotState || null;

		// Initialize joints with normalized values
		initialJoints.forEach((joint) => {
			const isGripper =
				joint.name.toLowerCase() === "jaw" || joint.name.toLowerCase() === "gripper";
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

	// Get all USB drivers (both consumer and producers) for calibration
	getUSBDrivers(): USBServoDriver[] {
		const usbDrivers: USBServoDriver[] = [];

		// Check consumer
		if (this.consumer && USBServoDriver.isUSBDriver(this.consumer)) {
			usbDrivers.push(this.consumer);
		}

		// Check producers
		this.producers.forEach((producer) => {
			if (USBServoDriver.isUSBDriver(producer)) {
				usbDrivers.push(producer);
			}
		});

		return usbDrivers;
	}

	// Get uncalibrated USB drivers that need calibration
	getUncalibratedUSBDrivers(): USBServoDriver[] {
		return this.getUSBDrivers().filter((driver) => driver.needsCalibration);
	}

	// Check if robot has any USB drivers
	hasUSBDrivers(): boolean {
		return this.getUSBDrivers().length > 0;
	}

	// Check if all USB drivers are calibrated
	areAllUSBDriversCalibrated(): boolean {
		const usbDrivers = this.getUSBDrivers();
		return usbDrivers.length > 0 && usbDrivers.every((driver) => driver.isCalibrated);
	}

	// Joint value updates (normalized) - for manual control
	updateJoint(name: string, normalizedValue: number): void {
		if (!this.isManualControlEnabled) {
			console.warn("Manual control is disabled");
			return;
		}

		this.updateJointValue(name, normalizedValue, true);
	}

	// Internal joint value update (used by both manual control and USB calibration sync)
	updateJointValue(name: string, normalizedValue: number, sendToProducers: boolean = false): void {
		const joint = this.joints[name];
		if (!joint) {
			console.warn(`Joint ${name} not found`);
			return;
		}

		// Clamp to appropriate normalized range based on joint type
		if (name.toLowerCase() === "jaw" || name.toLowerCase() === "gripper") {
			normalizedValue = Math.max(0, Math.min(100, normalizedValue));
		} else {
			normalizedValue = Math.max(-100, Math.min(100, normalizedValue));
		}

		console.debug(
			`[Robot ${this.id}] Update joint ${name} to ${normalizedValue} (normalized, sendToProducers: ${sendToProducers})`
		);

		// Create a new joint object to ensure reactivity
		this.joints[name] = { ...joint, value: normalizedValue };

		// Send normalized command to producers if requested
		if (sendToProducers) {
			this.sendToProducers({ joints: [{ name, value: normalizedValue }] });
		}
	}

	executeCommand(command: RobotCommand): void {
		// Command deduplication - skip if same values sent within dedup window
		const now = Date.now();
		if (now - this.lastCommandTime < ROBOT_CONFIG.commands.dedupWindow) {
			const hasChanges = command.joints.some(
				(joint) => Math.abs((this.lastCommandValues[joint.name] || 0) - joint.value) > 0.5
			);
			if (!hasChanges) {
				console.debug(
					`[Robot ${this.id}] 🔄 Skipping duplicate command within ${ROBOT_CONFIG.commands.dedupWindow}ms window`
				);
				return;
			}
		}

		// Update deduplication tracking
		this.lastCommandTime = now;
		command.joints.forEach((joint) => {
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
			console.debug(
				`[Robot ${this.id}] Executing command with ${command.joints.length} joints:`,
				command.joints.map((j) => `${j.name}=${j.value}`).join(", ")
			);

			// Update virtual robot joints with normalized values
			command.joints.forEach((jointCmd) => {
				const joint = this.joints[jointCmd.name];
				if (joint) {
					// Clamp to appropriate normalized range based on joint type
					let normalizedValue: number;
					if (jointCmd.name.toLowerCase() === "jaw" || jointCmd.name.toLowerCase() === "gripper") {
						normalizedValue = Math.max(0, Math.min(100, jointCmd.value));
					} else {
						normalizedValue = Math.max(-100, Math.min(100, jointCmd.value));
					}

					console.debug(
						`[Robot ${this.id}] Joint ${jointCmd.name}: ${jointCmd.value} -> ${normalizedValue} (normalized)`
					);

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
				Object.keys(this.lastCommandValues).forEach((jointName) => {
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
		if (config.type !== "remote") {
			throw new Error("joinAsConsumer only supports remote drivers");
		}
		return this._setConsumer(config, true);
	}

	private async _setConsumer(
		config: USBDriverConfig | RemoteDriverConfig,
		joinExistingRoom: boolean
	): Promise<string> {
		// Remove existing consumer if any
		if (this.consumer) {
			await this.removeConsumer();
		}

		const consumer = this.createConsumer(config);

		// Set up calibration completion callback for USB drivers
		if (USBServoDriver.isUSBDriver(consumer)) {
			const calibrationUnsubscribe = consumer.onCalibrationCompleteWithPositions(
				async (finalPositions: Record<string, number>) => {
					console.log(`[Robot ${this.id}] Calibration complete, syncing robot to final positions`);
					consumer.syncRobotPositions(
						finalPositions,
						(jointName: string, normalizedValue: number) => {
							this.updateJointValue(jointName, normalizedValue, false); // Don't send to producers to avoid feedback loop
						}
					);

					// Start listening now that calibration is complete
					if ("startListening" in consumer && consumer.startListening) {
						try {
							await consumer.startListening();
							console.log(`[Robot ${this.id}] Started listening after calibration completion`);
						} catch (error) {
							console.error(
								`[Robot ${this.id}] Failed to start listening after calibration:`,
								error
							);
						}
					}
				}
			);
			this.unsubscribeFns.push(calibrationUnsubscribe);
		}

		// Only pass joinExistingRoom to remote drivers
		if (config.type === "remote") {
			await (consumer as RemoteConsumer).connect(joinExistingRoom);
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

		// Start listening for consumers with this capability (only if calibrated for USB)
		if ("startListening" in consumer && consumer.startListening) {
			// For USB consumers, only start listening if calibrated
			if (USBServoDriver.isUSBDriver(consumer)) {
				if (consumer.isCalibrated) {
					await consumer.startListening();
				}
				// If not calibrated, startListening will be called after calibration completion
			} else {
				// For non-USB consumers, start listening immediately
				await consumer.startListening();
			}
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
		if (config.type !== "remote") {
			throw new Error("joinAsProducer only supports remote drivers");
		}
		return this._addProducer(config, true);
	}

	private async _addProducer(
		config: USBDriverConfig | RemoteDriverConfig,
		joinExistingRoom: boolean
	): Promise<string> {
		const producer = this.createProducer(config);

		// Set up calibration completion callback for USB drivers
		if (USBServoDriver.isUSBDriver(producer)) {
			const calibrationUnsubscribe = producer.onCalibrationCompleteWithPositions(
				async (finalPositions: Record<string, number>) => {
					console.log(`[Robot ${this.id}] Calibration complete, syncing robot to final positions`);
					producer.syncRobotPositions(
						finalPositions,
						(jointName: string, normalizedValue: number) => {
							this.updateJointValue(jointName, normalizedValue, false); // Don't send to producers to avoid feedback loop
						}
					);

					console.log(
						`[Robot ${this.id}] USB Producer calibration completed and ready for commands`
					);
				}
			);
			this.unsubscribeFns.push(calibrationUnsubscribe);
		}

		// Only pass joinExistingRoom to remote drivers
		if (config.type === "remote") {
			await (producer as RemoteProducer).connect(joinExistingRoom);
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
			if ("stopListening" in this.consumer && this.consumer.stopListening) {
				await this.consumer.stopListening();
			}
			await this.consumer.disconnect();

			this.consumer = null;
			this.updateStates();
		}
	}

	async removeProducer(driverId: string): Promise<void> {
		const driverIndex = this.producers.findIndex((d) => d.id === driverId);
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
			case "usb":
				return new USBConsumer(config);
			case "remote":
				return new RemoteConsumer(config);
			default:
				const _exhaustive: never = config;
				throw new Error(`Unknown consumer type: ${JSON.stringify(_exhaustive)}`);
		}
	}

	private createProducer(config: USBDriverConfig | RemoteDriverConfig): Producer {
		switch (config.type) {
			case "usb":
				return new USBProducer(config);
			case "remote":
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
			if (jointName.toLowerCase() === "jaw" || jointName.toLowerCase() === "gripper") {
				return (normalizedValue / 100) * Math.PI;
			} else {
				return (normalizedValue / 100) * Math.PI;
			}
		}

		const { lower, upper } = joint.limits;

		// Map normalized value to URDF range
		let normalizedRatio: number;
		if (jointName.toLowerCase() === "jaw" || jointName.toLowerCase() === "gripper") {
			normalizedRatio = normalizedValue / 100; // 0-100 -> 0-1
		} else {
			normalizedRatio = (normalizedValue + 100) / 200; // -100-+100 -> 0-1
		}

		const urdfRadians = lower + normalizedRatio * (upper - lower);

		console.debug(
			`[Robot ${this.id}] Joint ${jointName}: ${normalizedValue} (norm) -> ${urdfRadians.toFixed(3)} (rad)`
		);

		return urdfRadians;
	}

	private async sendToProducers(command: RobotCommand): Promise<void> {
		const connectedProducers = this.producers.filter((d) => d.status.isConnected);

		console.debug(
			`[Robot ${this.id}] Sending command to ${connectedProducers.length} producers:`,
			command
		);

		// Send to all connected producers
		await Promise.all(
			connectedProducers.map(async (producer) => {
				try {
					await producer.sendCommand(command);
				} catch (error) {
					console.error(
						`[Robot ${this.id}] Failed to send command to producer ${producer.id}:`,
						error
					);
				}
			})
		);
	}

	private updateStates(): void {
		// Update connection status
		const hasConnectedDrivers =
			this.consumer?.status.isConnected || this.producers.some((d) => d.status.isConnected);

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
		this.unsubscribeFns.forEach((fn) => fn());
		this.unsubscribeFns = [];

		// Disconnect all drivers
		const allDrivers = [this.consumer, ...this.producers].filter(Boolean) as (
			| Consumer
			| Producer
		)[];
		await Promise.allSettled(
			allDrivers.map(async (driver) => {
				try {
					await driver.disconnect();
				} catch (error) {
					console.error(`Error disconnecting driver ${driver.id}:`, error);
				}
			})
		);

		// Calibration cleanup is handled by individual USB drivers
	}
}
