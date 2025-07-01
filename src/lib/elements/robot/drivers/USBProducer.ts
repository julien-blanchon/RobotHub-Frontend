import type { Producer, RobotCommand } from "../models.js";
import { ROBOT_CONFIG } from "../config.js";
import { USBServoDriver } from "./USBServoDriver.js";

export class USBProducer extends USBServoDriver implements Producer {
	private commandQueue: RobotCommand[] = [];
	private isProcessingCommands = false;

	constructor(config: any) {
		super(config, "Producer");
	}

	async connect(): Promise<void> {
		// Connect to USB first (this triggers browser's device selection dialog)
		await this.connectToUSB();

		// Lock servos for software control (producer mode)
		await this.lockAllServos();

		// Note: Calibration is checked when operations are actually needed
	}

	async disconnect(): Promise<void> {
		// Stop command processing
		this.isProcessingCommands = false;
		this.commandQueue = [];

		await this.disconnectFromUSB();
	}

	async sendCommand(command: RobotCommand): Promise<void> {
		if (!this._status.isConnected) {
			throw new Error(`[${this.name}] Cannot send command: not connected`);
		}

		if (!this.isCalibrated) {
			throw new Error(`[${this.name}] Cannot send command: not calibrated`);
		}

		// Add command to queue for processing
		this.commandQueue.push(command);

		// Limit queue size to prevent memory issues
		if (this.commandQueue.length > ROBOT_CONFIG.commands.maxQueueSize) {
			this.commandQueue.shift(); // Remove oldest command
		}

		// Start processing if not already running
		if (!this.isProcessingCommands) {
			this.processCommandQueue();
		}
	}

	// Event handlers already in base class

	// Private methods
	private async processCommandQueue(): Promise<void> {
		if (this.isProcessingCommands || !this._status.isConnected) {
			return;
		}

		this.isProcessingCommands = true;

		while (this.commandQueue.length > 0 && this._status.isConnected) {
			const command = this.commandQueue.shift();
			if (command) {
				try {
					await this.executeCommand(command);
				} catch (error) {
					console.error(`[${this.name}] Command execution failed:`, error);
					// Continue processing other commands
				}
			}
		}

		this.isProcessingCommands = false;
	}

	private async executeCommand(command: RobotCommand): Promise<void> {
		if (!this.scsServoSDK || !this._status.isConnected) {
			return;
		}

		try {
			// Convert normalized values to servo positions using calibration (required)
			const servoCommands = new Map<number, number>();

			command.joints.forEach((joint) => {
				const servoId = this.jointToServoMap[joint.name as keyof typeof this.jointToServoMap];
				if (servoId) {
					const servoPosition = this.denormalizeValue(joint.value, joint.name);

					// Clamp to valid servo range
					const clampedPosition = Math.max(0, Math.min(4095, Math.round(servoPosition)));
					servoCommands.set(servoId, clampedPosition);
				}
			});

			if (servoCommands.size > 0) {
				// Use batch commands when possible for better performance
				if (servoCommands.size > 1) {
					await this.scsServoSDK.syncWritePositions(servoCommands);
				} else {
					// Single servo command
					const entry = servoCommands.entries().next().value;
					if (entry) {
						const [servoId, position] = entry;
						await this.scsServoSDK.writePosition(servoId, position);
					}
				}

				console.debug(`[${this.name}] Sent positions to ${servoCommands.size} servos`);
			}
		} catch (error) {
			console.error(`[${this.name}] Failed to execute command:`, error);
			throw error;
		}
	}
}
