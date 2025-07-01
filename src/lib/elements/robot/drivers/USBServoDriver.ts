import type { ConnectionStatus, USBDriverConfig } from "../models.js";
import { CalibrationState } from "../calibration/CalibrationState.svelte.js";
import { ScsServoSDK } from "feetech.js";
import { ROBOT_CONFIG } from "../config.js";

export abstract class USBServoDriver {
	readonly id: string;
	readonly name: string;
	readonly config: USBDriverConfig;

	protected _status: ConnectionStatus = { isConnected: false };
	protected statusCallbacks: ((status: ConnectionStatus) => void)[] = [];

	protected scsServoSDK: ScsServoSDK | null = null;

	// Calibration state - directly embedded
	readonly calibrationState: CalibrationState;

	// Calibration polling
	private calibrationPollingInterval: ReturnType<typeof setInterval> | null = null;

	// Joint to servo ID mapping for SO-100 arm
	protected readonly jointToServoMap = {
		Rotation: 1,
		Pitch: 2,
		Elbow: 3,
		Wrist_Pitch: 4,
		Wrist_Roll: 5,
		Jaw: 6
	};

	constructor(config: USBDriverConfig, driverType: string) {
		this.config = config;
		this.id = `usb-${driverType}-${Date.now()}`;
		this.name = `USB ${driverType}`;
		this.calibrationState = new CalibrationState();
	}

	get status(): ConnectionStatus {
		return this._status;
	}

	get needsCalibration(): boolean {
		return this.calibrationState.needsCalibration;
	}

	get isCalibrating(): boolean {
		return this.calibrationState.isCalibrating;
	}

	get isCalibrated(): boolean {
		return this.calibrationState.isCalibrated;
	}

	// Type guard to check if a driver is a USB driver
	static isUSBDriver(driver: any): driver is USBServoDriver {
		return (
			driver &&
			typeof driver.calibrationState === "object" &&
			typeof driver.needsCalibration === "boolean" &&
			typeof driver.isCalibrated === "boolean" &&
			typeof driver.startCalibration === "function"
		);
	}

	// Type-safe method to get calibration interface
	getCalibrationInterface(): {
		needsCalibration: boolean;
		isCalibrating: boolean;
		isCalibrated: boolean;
		startCalibration: () => Promise<void>;
		completeCalibration: () => Promise<Record<string, number>>;
		skipCalibration: () => void;
		cancelCalibration: () => void;
		onCalibrationCompleteWithPositions: (
			callback: (positions: Record<string, number>) => void
		) => () => void;
	} {
		return {
			needsCalibration: this.needsCalibration,
			isCalibrating: this.isCalibrating,
			isCalibrated: this.isCalibrated,
			startCalibration: () => this.startCalibration(),
			completeCalibration: () => this.completeCalibration(),
			skipCalibration: () => this.skipCalibration(),
			cancelCalibration: () => this.cancelCalibration(),
			onCalibrationCompleteWithPositions: (callback) =>
				this.onCalibrationCompleteWithPositions(callback)
		};
	}

	// Abstract methods that subclasses must implement
	abstract connect(): Promise<void>;
	abstract disconnect(): Promise<void>;

	// Common connection logic
	protected async connectToUSB(): Promise<void> {
		if (this._status.isConnected) {
			console.log(`[${this.name}] Already connected`);
			return;
		}

		try {
			console.log(`[${this.name}] Connecting...`);

			// Create a new SDK instance for this driver instead of using the singleton
			// This allows multiple drivers to connect to different ports simultaneously
			this.scsServoSDK = new ScsServoSDK();

			await this.scsServoSDK.connect({
				baudRate: this.config.baudRate || ROBOT_CONFIG.usb.baudRate,
				protocolEnd: 0 // STS/SMS protocol
			});

			this._status = { isConnected: true, lastConnected: new Date() };
			this.notifyStatusChange();

			console.log(`[${this.name}] Connected successfully`);

			// Debug: Log SDK instance methods to identify the issue
			console.log(
				`[${this.name}] SDK instance methods:`,
				Object.getOwnPropertyNames(this.scsServoSDK)
			);
			console.log(
				`[${this.name}] SDK prototype methods:`,
				Object.getOwnPropertyNames(Object.getPrototypeOf(this.scsServoSDK))
			);
			console.log(
				`[${this.name}] writeTorqueEnable available:`,
				typeof this.scsServoSDK.writeTorqueEnable
			);
			console.log(
				`[${this.name}] syncReadPositions available:`,
				typeof this.scsServoSDK.syncReadPositions
			);
		} catch (error) {
			console.error(`[${this.name}] Connection failed:`, error);
			this._status = { isConnected: false, error: `Connection failed: ${error}` };
			this.notifyStatusChange();
			throw error;
		}
	}

	protected async disconnectFromUSB(): Promise<void> {
		if (this.scsServoSDK) {
			try {
				await this.unlockAllServos();
				await this.scsServoSDK.disconnect();
			} catch (error) {
				console.warn(`[${this.name}] Error during disconnect:`, error);
			}
			this.scsServoSDK = null;
		}

		this._status = { isConnected: false };
		this.notifyStatusChange();

		console.log(`[${this.name}] Disconnected`);
	}

	// Calibration methods
	async startCalibration(): Promise<void> {
		if (!this._status.isConnected) {
			await this.connectToUSB();
		}

		if (!this._status.isConnected) {
			throw new Error("Cannot start calibration: not connected");
		}

		console.log(`[${this.name}] Starting calibration...`);
		this.calibrationState.startCalibration();

		// Unlock servos for manual movement during calibration
		await this.unlockAllServos();

		// Start polling positions during calibration
		await this.startCalibrationPolling();
	}

	async completeCalibration(): Promise<Record<string, number>> {
		if (!this.isCalibrating) {
			throw new Error("Not currently calibrating");
		}

		// Stop polling
		this.stopCalibrationPolling();

		// Read final positions
		const finalPositions = await this.readCurrentPositions();

		// Complete calibration state
		this.calibrationState.completeCalibration();

		console.log(`[${this.name}] Calibration completed`);
		return finalPositions;
	}

	skipCalibration(): void {
		// Stop polling if active
		this.stopCalibrationPolling();
		this.calibrationState.skipCalibration();
	}

	async setPredefinedCalibration(): Promise<void> {
		// Stop polling if active
		this.stopCalibrationPolling();
		this.skipCalibration();
	}

	// Cancel calibration
	cancelCalibration(): void {
		// Stop polling if active
		this.stopCalibrationPolling();
		this.calibrationState.cancelCalibration();
	}

	// Start polling servo positions during calibration
	private async startCalibrationPolling(): Promise<void> {
		if (this.calibrationPollingInterval !== null) {
			return; // Already polling
		}

		console.log(`[${this.name}] Starting calibration position polling...`);

		// Poll positions every 100ms during calibration
		this.calibrationPollingInterval = setInterval(async () => {
			if (!this.isCalibrating || !this._status.isConnected || !this.scsServoSDK) {
				this.stopCalibrationPolling();
				return;
			}

			try {
				// Read positions for all servos
				const servoIds = Object.values(this.jointToServoMap);
				const positions = await this.scsServoSDK.syncReadPositions(servoIds);

				// Update calibration state with current positions
				Object.entries(this.jointToServoMap).forEach(([jointName, servoId]) => {
					const position = positions.get(servoId);
					if (position !== undefined) {
						this.calibrationState.updateCurrentValue(jointName, position);
						console.debug(`[${this.name}] ${jointName} (servo ${servoId}): ${position}`);
					}
				});
			} catch (error) {
				console.warn(`[${this.name}] Calibration polling error:`, error);
				// Continue polling despite errors - user might be moving servos rapidly
			}
		}, 100); // Poll every 100ms
	}

	// Stop polling servo positions
	private stopCalibrationPolling(): void {
		if (this.calibrationPollingInterval !== null) {
			clearInterval(this.calibrationPollingInterval);
			this.calibrationPollingInterval = null;
			console.log(`[${this.name}] Stopped calibration position polling`);
		}
	}

	// Servo position reading (for calibration)
	async readCurrentPositions(): Promise<Record<string, number>> {
		if (!this.scsServoSDK || !this._status.isConnected) {
			throw new Error("Cannot read positions: not connected");
		}

		const positions: Record<string, number> = {};

		try {
			const servoIds = Object.values(this.jointToServoMap);
			const servoPositions = await this.scsServoSDK.syncReadPositions(servoIds);

			Object.entries(this.jointToServoMap).forEach(([jointName, servoId]) => {
				const position = servoPositions.get(servoId);
				if (position !== undefined) {
					positions[jointName] = position;
					// Update calibration state with current position
					this.calibrationState.updateCurrentValue(jointName, position);
				}
			});
		} catch (error) {
			console.error(`[${this.name}] Error reading positions:`, error);
			throw error;
		}

		return positions;
	}

	// Value conversion methods
	normalizeValue(rawValue: number, jointName: string): number {
		if (!this.isCalibrated) {
			throw new Error("Cannot normalize value: not calibrated");
		}
		return this.calibrationState.normalizeValue(rawValue, jointName);
	}

	denormalizeValue(normalizedValue: number, jointName: string): number {
		if (!this.isCalibrated) {
			throw new Error("Cannot denormalize value: not calibrated");
		}
		return this.calibrationState.denormalizeValue(normalizedValue, jointName);
	}

	// Servo control methods
	protected async lockAllServos(): Promise<void> {
		if (!this.scsServoSDK) return;

		try {
			console.log(`[${this.name}] Locking all servos...`);

			const servoIds = Object.values(this.jointToServoMap);

			for (const servoId of servoIds) {
				try {
					// Check if writeTorqueEnable method exists before calling
					if (typeof this.scsServoSDK.writeTorqueEnable !== "function") {
						console.warn(
							`[${this.name}] writeTorqueEnable method not available on SDK instance for servo ${servoId}`
						);
						continue;
					}

					await this.scsServoSDK.writeTorqueEnable(servoId, true);
					await new Promise((resolve) => setTimeout(resolve, ROBOT_CONFIG.usb.servoWriteDelay));
				} catch (error) {
					console.warn(`[${this.name}] Failed to lock servo ${servoId}:`, error);
				}
			}

			console.log(`[${this.name}] All servos locked`);
		} catch (error) {
			console.error(`[${this.name}] Error locking servos:`, error);
		}
	}

	protected async unlockAllServos(): Promise<void> {
		if (!this.scsServoSDK) return;

		try {
			console.log(`[${this.name}] Unlocking all servos...`);

			const servoIds = Object.values(this.jointToServoMap);

			for (const servoId of servoIds) {
				try {
					// Check if writeTorqueEnable method exists before calling
					if (typeof this.scsServoSDK.writeTorqueEnable !== "function") {
						console.warn(
							`[${this.name}] writeTorqueEnable method not available on SDK instance for servo ${servoId}`
						);
						continue;
					}

					await this.scsServoSDK.writeTorqueEnable(servoId, false);
					await new Promise((resolve) => setTimeout(resolve, ROBOT_CONFIG.usb.servoWriteDelay));
				} catch (error) {
					console.warn(`[${this.name}] Failed to unlock servo ${servoId}:`, error);
				}
			}

			console.log(`[${this.name}] All servos unlocked`);
		} catch (error) {
			console.error(`[${this.name}] Error unlocking servos:`, error);
		}
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

	protected notifyStatusChange(): void {
		this.statusCallbacks.forEach((callback) => {
			try {
				callback(this._status);
			} catch (error) {
				console.error(`[${this.name}] Error in status callback:`, error);
			}
		});
	}

	// Register callback for calibration completion with positions
	onCalibrationCompleteWithPositions(
		callback: (positions: Record<string, number>) => void
	): () => void {
		return this.calibrationState.onCalibrationCompleteWithPositions(callback);
	}

	// Sync robot joint positions using normalized values from calibration
	syncRobotPositions(
		finalPositions: Record<string, number>,
		updateRobotCallback?: (jointName: string, normalizedValue: number) => void
	): void {
		if (!updateRobotCallback) return;

		console.log(`[${this.name}] 🔄 Syncing robot to final calibration positions...`);

		Object.entries(finalPositions).forEach(([jointName, rawPosition]) => {
			try {
				// Convert raw servo position to normalized value using calibration
				const normalizedValue = this.normalizeValue(rawPosition, jointName);

				// Clamp to appropriate normalized range based on joint type
				let clampedValue: number;
				if (jointName.toLowerCase() === "jaw" || jointName.toLowerCase() === "gripper") {
					clampedValue = Math.max(0, Math.min(100, normalizedValue));
				} else {
					clampedValue = Math.max(-100, Math.min(100, normalizedValue));
				}

				console.log(
					`[${this.name}] ${jointName}: ${rawPosition} (raw) -> ${normalizedValue.toFixed(1)} -> ${clampedValue.toFixed(1)} (normalized)`
				);

				// Update robot joint through callback
				updateRobotCallback(jointName, clampedValue);
			} catch (error) {
				console.warn(`[${this.name}] Failed to sync position for joint ${jointName}:`, error);
			}
		});

		console.log(`[${this.name}] ✅ Robot synced to calibration positions`);
	}

	// Cleanup
	async destroy(): Promise<void> {
		this.stopCalibrationPolling();
		await this.disconnect();
		this.calibrationState.destroy();
	}
}
