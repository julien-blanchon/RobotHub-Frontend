export type ConnectionOptions = {
	baudRate?: number;
	protocolEnd?: number;
};

export type ServoPositions = Map<number, number> | Record<number, number>;
export type ServoSpeeds = Map<number, number> | Record<number, number>;

export interface ScsServoSDK {
	// Connection management
	connect(options?: ConnectionOptions): Promise<true>;
	disconnect(): Promise<true>;
	isConnected(): boolean;

	// Servo locking operations
	lockServo(servoId: number): Promise<"success">;
	unlockServo(servoId: number): Promise<"success">;
	lockServos(servoIds: number[]): Promise<"success">;
	unlockServos(servoIds: number[]): Promise<"success">;
	lockServosForProduction(servoIds: number[]): Promise<"success">;
	unlockServosForManualMovement(servoIds: number[]): Promise<"success">;

	// Read operations (no locking needed)
	readPosition(servoId: number): Promise<number>;
	syncReadPositions(servoIds: number[]): Promise<Map<number, number>>;

	// Write operations - LOCKED MODE (respects servo locks)
	writePosition(servoId: number, position: number): Promise<"success">;
	writeTorqueEnable(servoId: number, enable: boolean): Promise<"success">;

	// Write operations - UNLOCKED MODE (temporary unlock for operation)
	writePositionUnlocked(servoId: number, position: number): Promise<"success">;
	writePositionAndDisableTorque(servoId: number, position: number, waitTimeMs?: number): Promise<"success">;
	writeTorqueEnableUnlocked(servoId: number, enable: boolean): Promise<"success">;

	// Sync write operations
	syncWritePositions(servoPositions: ServoPositions): Promise<"success">;

	// Configuration functions
	setBaudRate(servoId: number, baudRateIndex: number): Promise<"success">;
	setServoId(currentServoId: number, newServoId: number): Promise<"success">;
	setWheelMode(servoId: number): Promise<"success">;
	setPositionMode(servoId: number): Promise<"success">;
}

export const scsServoSDK: ScsServoSDK;

// Debug exports
export const DEBUG_ENABLED: boolean;
export function debugLog(message: string): void;
