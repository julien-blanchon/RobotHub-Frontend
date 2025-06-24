// Import all functions from the unified scsServoSDK module
import {
	connect,
	disconnect,
	isConnected,
	lockServo,
	unlockServo,
	lockServos,
	unlockServos,
	lockServosForProduction,
	unlockServosForManualMovement,
	readPosition,
	syncReadPositions,
	writePosition,
	writeTorqueEnable,
	writePositionUnlocked,
	writePositionAndDisableTorque,
	writeTorqueEnableUnlocked,
	syncWritePositions,
	setBaudRate,
	setServoId,
	setWheelMode,
	setPositionMode
} from "./scsServoSDK.mjs";

// Create the unified SCS servo SDK object
export const scsServoSDK = {
	// Connection management
	connect,
	disconnect,
	isConnected,

	// Servo locking operations
	lockServo,
	unlockServo,
	lockServos,
	unlockServos,
	lockServosForProduction,
	unlockServosForManualMovement,

	// Read operations (no locking needed)
	readPosition,
	syncReadPositions,

	// Write operations - LOCKED MODE (respects servo locks)
	writePosition,
	writeTorqueEnable,

	// Write operations - UNLOCKED MODE (temporary unlock for operation)
	writePositionUnlocked,
	writePositionAndDisableTorque,
	writeTorqueEnableUnlocked,

	// Sync write operations
	syncWritePositions,

	// Configuration functions
	setBaudRate,
	setServoId,
	setWheelMode,
	setPositionMode
};

// Export debug configuration for easy access
export { DEBUG_ENABLED, debugLog } from "./debug.mjs";
