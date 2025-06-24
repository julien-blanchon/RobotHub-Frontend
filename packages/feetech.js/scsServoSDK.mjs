import {
	PortHandler,
	PacketHandler,
	COMM_SUCCESS,
	COMM_RX_TIMEOUT,
	COMM_RX_CORRUPT,
	COMM_TX_FAIL,
	COMM_NOT_AVAILABLE,
	SCS_LOBYTE,
	SCS_HIBYTE,
	SCS_MAKEWORD,
	GroupSyncRead, // Import GroupSyncRead
	GroupSyncWrite // Import GroupSyncWrite
} from "./lowLevelSDK.mjs";

// Import address constants from the correct file
import {
	ADDR_SCS_PRESENT_POSITION,
	ADDR_SCS_GOAL_POSITION,
	ADDR_SCS_TORQUE_ENABLE,
	ADDR_SCS_GOAL_ACC,
	ADDR_SCS_GOAL_SPEED
} from "./scsservo_constants.mjs";

// Import debug logging function
import { debugLog } from "./debug.mjs";

// Define constants not present in scsservo_constants.mjs
const ADDR_SCS_MODE = 33;
const ADDR_SCS_LOCK = 55;
const ADDR_SCS_ID = 5; // Address for Servo ID
const ADDR_SCS_BAUD_RATE = 6; // Address for Baud Rate

// Module-level variables for handlers
let portHandler = null;
let packetHandler = null;

/**
 * Unified Servo SDK with flexible locking control
 * Supports both locked (respects servo locks) and unlocked (temporary unlock) operations
 */

/**
 * Connects to the serial port and initializes handlers.
 * @param {object} [options] - Connection options.
 * @param {number} [options.baudRate=1000000] - The baud rate for the serial connection.
 * @param {number} [options.protocolEnd=0] - The protocol end setting (0 for STS/SMS, 1 for SCS).
 * @returns {Promise<true>} Resolves with true on successful connection.
 * @throws {Error} If connection fails or port cannot be opened/selected.
 */
export async function connect(options = {}) {
	if (portHandler && portHandler.isOpen) {
		debugLog("Already connected to servo system.");
		return true;
	}

	const { baudRate = 1000000, protocolEnd = 0 } = options;

	try {
		portHandler = new PortHandler();
		const portRequested = await portHandler.requestPort();
		if (!portRequested) {
			portHandler = null;
			throw new Error("Failed to select a serial port.");
		}

		portHandler.setBaudRate(baudRate);
		const portOpened = await portHandler.openPort();
		if (!portOpened) {
			await portHandler.closePort().catch(console.error);
			portHandler = null;
			throw new Error(`Failed to open port at baudrate ${baudRate}.`);
		}

		packetHandler = new PacketHandler(protocolEnd);
		debugLog(`Connected to servo system at ${baudRate} baud, protocol end: ${protocolEnd}.`);
		return true;
	} catch (err) {
		console.error("Error during servo connection:", err);
		if (portHandler) {
			try {
				await portHandler.closePort();
			} catch (closeErr) {
				console.error("Error closing port after connection failure:", closeErr);
			}
		}
		portHandler = null;
		packetHandler = null;
		throw new Error(`Servo connection failed: ${err.message}`);
	}
}

/**
 * Disconnects from the serial port.
 * @returns {Promise<true>} Resolves with true on successful disconnection.
 * @throws {Error} If disconnection fails.
 */
export async function disconnect() {
	if (!portHandler || !portHandler.isOpen) {
		debugLog("Already disconnected from servo system.");
		return true;
	}

	try {
		await portHandler.closePort();
		portHandler = null;
		packetHandler = null;
		debugLog("Disconnected from servo system.");
		return true;
	} catch (err) {
		console.error("Error during servo disconnection:", err);
		portHandler = null;
		packetHandler = null;
		throw new Error(`Servo disconnection failed: ${err.message}`);
	}
}

/**
 * Checks if the SDK is currently connected.
 * @returns {boolean} True if connected, false otherwise.
 */
export function isConnected() {
	return !!(portHandler && portHandler.isOpen && packetHandler);
}

/**
 * Checks if the SDK is connected. Throws an error if not.
 * @throws {Error} If not connected.
 */
function checkConnection() {
	if (!portHandler || !packetHandler) {
		throw new Error("Not connected to servo system. Call connect() first.");
	}
}

// =============================================================================
// SERVO LOCKING OPERATIONS
// =============================================================================

/**
 * Locks a servo to prevent configuration changes.
 * @param {number} servoId - The ID of the servo (1-252).
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If not connected, write fails, or an exception occurs.
 */
export async function lockServo(servoId) {
	checkConnection();
	try {
		debugLog(`🔒 Locking servo ${servoId}...`);
		const [result, error] = await packetHandler.write1ByteTxRx(
			portHandler,
			servoId,
			ADDR_SCS_LOCK,
			1
		);

		if (result !== COMM_SUCCESS) {
			throw new Error(
				`Error locking servo ${servoId}: ${packetHandler.getTxRxResult(result)}, Error: ${error}`
			);
		}
		debugLog(`🔒 Servo ${servoId} locked successfully`);
		return "success";
	} catch (err) {
		console.error(`Exception locking servo ${servoId}:`, err);
		throw new Error(`Failed to lock servo ${servoId}: ${err.message}`);
	}
}

/**
 * Unlocks a servo to allow configuration changes.
 * @param {number} servoId - The ID of the servo (1-252).
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If not connected, write fails, or an exception occurs.
 */
export async function unlockServo(servoId) {
	checkConnection();
	try {
		debugLog(`🔓 Unlocking servo ${servoId}...`);
		const [result, error] = await packetHandler.write1ByteTxRx(
			portHandler,
			servoId,
			ADDR_SCS_LOCK,
			0
		);

		if (result !== COMM_SUCCESS) {
			throw new Error(
				`Error unlocking servo ${servoId}: ${packetHandler.getTxRxResult(result)}, Error: ${error}`
			);
		}
		debugLog(`🔓 Servo ${servoId} unlocked successfully`);
		return "success";
	} catch (err) {
		console.error(`Exception unlocking servo ${servoId}:`, err);
		throw new Error(`Failed to unlock servo ${servoId}: ${err.message}`);
	}
}

/**
 * Locks multiple servos sequentially.
 * @param {number[]} servoIds - Array of servo IDs to lock.
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If any servo fails to lock.
 */
export async function lockServos(servoIds) {
	checkConnection();
	debugLog(`🔒 Locking ${servoIds.length} servos: [${servoIds.join(', ')}]`);
	
	// Lock servos sequentially to avoid port conflicts
	for (const servoId of servoIds) {
		await lockServo(servoId);
	}
	
	debugLog(`🔒 All ${servoIds.length} servos locked successfully`);
	return "success";
}

/**
 * Locks servos for production use by both locking configuration and enabling torque.
 * This ensures servos are truly locked and controlled by the system.
 * @param {number[]} servoIds - Array of servo IDs to lock for production.
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If any servo fails to lock or enable torque.
 */
export async function lockServosForProduction(servoIds) {
	checkConnection();
	debugLog(`🔒 Locking ${servoIds.length} servos for production use: [${servoIds.join(', ')}]`);
	
	// Lock servos sequentially and enable torque for each
	for (const servoId of servoIds) {
		try {
			debugLog(`🔒 Locking servo ${servoId} for production...`);
			
			// 1. Lock the servo configuration
			const [lockResult, lockError] = await packetHandler.write1ByteTxRx(
				portHandler,
				servoId,
				ADDR_SCS_LOCK,
				1
			);
			
			if (lockResult !== COMM_SUCCESS) {
				throw new Error(`Error locking servo ${servoId}: ${packetHandler.getTxRxResult(lockResult)}, Error: ${lockError}`);
			}
			
			// 2. Enable torque to make servo controllable
			const [torqueResult, torqueError] = await packetHandler.write1ByteTxRx(
				portHandler,
				servoId,
				ADDR_SCS_TORQUE_ENABLE,
				1
			);
			
			if (torqueResult !== COMM_SUCCESS) {
				console.warn(`Warning: Failed to enable torque for servo ${servoId}: ${packetHandler.getTxRxResult(torqueResult)}, Error: ${torqueError}`);
				// Don't throw here, locking is more important than torque enable
			}
			
			debugLog(`🔒 Servo ${servoId} locked and torque enabled for production`);
		} catch (err) {
			console.error(`Exception locking servo ${servoId} for production:`, err);
			throw new Error(`Failed to lock servo ${servoId} for production: ${err.message}`);
		}
	}
	
	debugLog(`🔒 All ${servoIds.length} servos locked for production successfully`);
	return "success";
}

/**
 * Unlocks multiple servos sequentially.
 * @param {number[]} servoIds - Array of servo IDs to unlock.
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If any servo fails to unlock.
 */
export async function unlockServos(servoIds) {
	checkConnection();
	debugLog(`🔓 Unlocking ${servoIds.length} servos: [${servoIds.join(', ')}]`);
	
	// Unlock servos sequentially to avoid port conflicts
	for (const servoId of servoIds) {
		await unlockServo(servoId);
	}
	
	debugLog(`🔓 All ${servoIds.length} servos unlocked successfully`);
	return "success";
}

/**
 * Safely unlocks servos for manual movement by unlocking configuration and disabling torque.
 * This is the safest way to leave servos when disconnecting/cleaning up.
 * @param {number[]} servoIds - Array of servo IDs to unlock safely.
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If any servo fails to unlock or disable torque.
 */
export async function unlockServosForManualMovement(servoIds) {
	checkConnection();
	debugLog(`🔓 Safely unlocking ${servoIds.length} servos for manual movement: [${servoIds.join(', ')}]`);
	
	// Unlock servos sequentially and disable torque for each
	for (const servoId of servoIds) {
		try {
			debugLog(`🔓 Safely unlocking servo ${servoId} for manual movement...`);
			
			// 1. Disable torque first (makes servo freely movable)
			const [torqueResult, torqueError] = await packetHandler.write1ByteTxRx(
				portHandler,
				servoId,
				ADDR_SCS_TORQUE_ENABLE,
				0
			);
			
			if (torqueResult !== COMM_SUCCESS) {
				console.warn(`Warning: Failed to disable torque for servo ${servoId}: ${packetHandler.getTxRxResult(torqueResult)}, Error: ${torqueError}`);
				// Continue anyway, unlocking is more important
			}
			
			// 2. Unlock the servo configuration
			const [unlockResult, unlockError] = await packetHandler.write1ByteTxRx(
				portHandler,
				servoId,
				ADDR_SCS_LOCK,
				0
			);
			
			if (unlockResult !== COMM_SUCCESS) {
				throw new Error(`Error unlocking servo ${servoId}: ${packetHandler.getTxRxResult(unlockResult)}, Error: ${unlockError}`);
			}
			
			debugLog(`🔓 Servo ${servoId} safely unlocked - torque disabled and configuration unlocked`);
		} catch (err) {
			console.error(`Exception safely unlocking servo ${servoId}:`, err);
			throw new Error(`Failed to safely unlock servo ${servoId}: ${err.message}`);
		}
	}
	
	debugLog(`🔓 All ${servoIds.length} servos safely unlocked for manual movement`);
	return "success";
}

// =============================================================================
// READ OPERATIONS (No locking needed)
// =============================================================================

/**
 * Reads the current position of a servo.
 * @param {number} servoId - The ID of the servo (1-252).
 * @returns {Promise<number>} Resolves with the position (0-4095).
 * @throws {Error} If not connected, read fails, or an exception occurs.
 */
export async function readPosition(servoId) {
	checkConnection();
	try {
		const [position, result, error] = await packetHandler.read2ByteTxRx(
			portHandler,
			servoId,
			ADDR_SCS_PRESENT_POSITION
		);

		if (result !== COMM_SUCCESS) {
			throw new Error(
				`Error reading position from servo ${servoId}: ${packetHandler.getTxRxResult(
					result
				)}, Error code: ${error}`
			);
		}
		return position & 0xffff;
	} catch (err) {
		console.error(`Exception reading position from servo ${servoId}:`, err);
		throw new Error(`Exception reading position from servo ${servoId}: ${err.message}`);
	}
}

/**
 * Reads the current baud rate index of a servo.
 * @param {number} servoId - The ID of the servo (1-252).
 * @returns {Promise<number>} Resolves with the baud rate index (0-7).
 * @throws {Error} If not connected, read fails, or an exception occurs.
 */
export async function readBaudRate(servoId) {
	checkConnection();
	try {
		const [baudIndex, result, error] = await packetHandler.read1ByteTxRx(
			portHandler,
			servoId,
			ADDR_SCS_BAUD_RATE
		);

		if (result !== COMM_SUCCESS) {
			throw new Error(
				`Error reading baud rate from servo ${servoId}: ${packetHandler.getTxRxResult(
					result
				)}, Error code: ${error}`
			);
		}
		return baudIndex;
	} catch (err) {
		console.error(`Exception reading baud rate from servo ${servoId}:`, err);
		throw new Error(`Exception reading baud rate from servo ${servoId}: ${err.message}`);
	}
}

/**
 * Reads the current operating mode of a servo.
 * @param {number} servoId - The ID of the servo (1-252).
 * @returns {Promise<number>} Resolves with the mode (0 for position, 1 for wheel).
 * @throws {Error} If not connected, read fails, or an exception occurs.
 */
export async function readMode(servoId) {
	checkConnection();
	try {
		const [modeValue, result, error] = await packetHandler.read1ByteTxRx(
			portHandler,
			servoId,
			ADDR_SCS_MODE
		);

		if (result !== COMM_SUCCESS) {
			throw new Error(
				`Error reading mode from servo ${servoId}: ${packetHandler.getTxRxResult(
					result
				)}, Error code: ${error}`
			);
		}
		return modeValue;
	} catch (err) {
		console.error(`Exception reading mode from servo ${servoId}:`, err);
		throw new Error(`Exception reading mode from servo ${servoId}: ${err.message}`);
	}
}

/**
 * Reads the current position of multiple servos synchronously.
 * @param {number[]} servoIds - An array of servo IDs (1-252) to read from.
 * @returns {Promise<Map<number, number>>} Resolves with a Map where keys are servo IDs and values are positions (0-4095).
 * @throws {Error} If not connected or transmission fails completely.
 */
export async function syncReadPositions(servoIds) {
	checkConnection();
	if (!Array.isArray(servoIds) || servoIds.length === 0) {
		debugLog("Sync Read: No servo IDs provided.");
		return new Map();
	}

	const startAddress = ADDR_SCS_PRESENT_POSITION;
	const dataLength = 2;
	const groupSyncRead = new GroupSyncRead(portHandler, packetHandler, startAddress, dataLength);
	const positions = new Map();
	const validIds = [];

	// Add parameters for each valid servo ID
	servoIds.forEach((id) => {
		if (id >= 1 && id <= 252) {
			if (groupSyncRead.addParam(id)) {
				validIds.push(id);
			} else {
				console.warn(`Sync Read: Failed to add param for servo ID ${id} (maybe duplicate or invalid).`);
			}
		} else {
			console.warn(`Sync Read: Invalid servo ID ${id} skipped.`);
		}
	});

	if (validIds.length === 0) {
		debugLog("Sync Read: No valid servo IDs to read.");
		return new Map();
	}

	try {
		let txResult = await groupSyncRead.txPacket();
		if (txResult !== COMM_SUCCESS) {
			throw new Error(`Sync Read txPacket failed: ${packetHandler.getTxRxResult(txResult)}`);
		}

		let rxResult = await groupSyncRead.rxPacket();
		if (rxResult !== COMM_SUCCESS) {
			console.warn(`Sync Read rxPacket overall result: ${packetHandler.getTxRxResult(rxResult)}. Checking individual servos.`);
		}

		const failedIds = [];
		validIds.forEach((id) => {
			const isAvailable = groupSyncRead.isAvailable(id, startAddress, dataLength);
			if (isAvailable) {
				const position = groupSyncRead.getData(id, startAddress, dataLength);
				positions.set(id, position & 0xffff);
			} else {
				failedIds.push(id);
			}
		});

		if (failedIds.length > 0) {
			console.warn(`Sync Read: Data not available for servo IDs: ${failedIds.join(", ")}. Got ${positions.size}/${validIds.length} servos successfully.`);
		}

		return positions;
	} catch (err) {
		console.error("Exception during syncReadPositions:", err);
		throw new Error(`Sync Read failed: ${err.message}`);
	}
}

// =============================================================================
// WRITE OPERATIONS - LOCKED MODE (Respects servo locks)
// =============================================================================

/**
 * Writes a target position to a servo (respects locks).
 * Will fail if the servo is locked.
 * @param {number} servoId - The ID of the servo (1-252).
 * @param {number} position - The target position value (0-4095).
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If not connected, position is out of range, write fails, or an exception occurs.
 */
export async function writePosition(servoId, position) {
	checkConnection();
	try {
		if (position < 0 || position > 4095) {
			throw new Error(`Invalid position value ${position} for servo ${servoId}. Must be between 0 and 4095.`);
		}
		const targetPosition = Math.round(position);

		const [result, error] = await packetHandler.write2ByteTxRx(
			portHandler,
			servoId,
			ADDR_SCS_GOAL_POSITION,
			targetPosition
		);

		if (result !== COMM_SUCCESS) {
			throw new Error(`Error writing position to servo ${servoId}: ${packetHandler.getTxRxResult(result)}, Error code: ${error}`);
		}
		return "success";
	} catch (err) {
		console.error(`Exception writing position to servo ${servoId}:`, err);
		throw new Error(`Failed to write position to servo ${servoId}: ${err.message}`);
	}
}

/**
 * Enables or disables the torque of a servo (respects locks).
 * @param {number} servoId - The ID of the servo (1-252).
 * @param {boolean} enable - True to enable torque, false to disable.
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If not connected, write fails, or an exception occurs.
 */
export async function writeTorqueEnable(servoId, enable) {
	checkConnection();
	try {
		const enableValue = enable ? 1 : 0;
		const [result, error] = await packetHandler.write1ByteTxRx(
			portHandler,
			servoId,
			ADDR_SCS_TORQUE_ENABLE,
			enableValue
		);

		if (result !== COMM_SUCCESS) {
			throw new Error(`Error setting torque for servo ${servoId}: ${packetHandler.getTxRxResult(result)}, Error code: ${error}`);
		}
		return "success";
	} catch (err) {
		console.error(`Exception setting torque for servo ${servoId}:`, err);
		throw new Error(`Exception setting torque for servo ${servoId}: ${err.message}`);
	}
}

// =============================================================================
// WRITE OPERATIONS - UNLOCKED MODE (Temporary unlock for operation)
// =============================================================================

/**
 * Helper to attempt locking a servo, logging errors without throwing.
 * @param {number} servoId
 */
async function tryLockServo(servoId) {
	try {
		await packetHandler.write1ByteTxRx(portHandler, servoId, ADDR_SCS_LOCK, 1);
	} catch (lockErr) {
		console.error(`Failed to re-lock servo ${servoId}:`, lockErr);
	}
}

/**
 * Writes a target position to a servo with temporary unlocking.
 * Temporarily unlocks the servo, writes the position, then locks it back.
 * @param {number} servoId - The ID of the servo (1-252).
 * @param {number} position - The target position value (0-4095).
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If not connected, position is out of range, write fails, or an exception occurs.
 */
export async function writePositionUnlocked(servoId, position) {
	checkConnection();
	let unlocked = false;
	try {
		if (position < 0 || position > 4095) {
			throw new Error(`Invalid position value ${position} for servo ${servoId}. Must be between 0 and 4095.`);
		}
		const targetPosition = Math.round(position);

		debugLog(`🔓 Temporarily unlocking servo ${servoId} for position write...`);

		// 1. Unlock servo configuration first
		const [resUnlock, errUnlock] = await packetHandler.write1ByteTxRx(portHandler, servoId, ADDR_SCS_LOCK, 0);
		if (resUnlock !== COMM_SUCCESS) {
			debugLog(`Warning: Failed to unlock servo ${servoId}, trying direct write anyway...`);
		} else {
		unlocked = true;
		}

		// 2. Write the position
		const [result, error] = await packetHandler.write2ByteTxRx(portHandler, servoId, ADDR_SCS_GOAL_POSITION, targetPosition);
		if (result !== COMM_SUCCESS) {
			throw new Error(`Error writing position to servo ${servoId}: ${packetHandler.getTxRxResult(result)}, Error code: ${error}`);
		}

		// 3. Lock servo configuration back
		if (unlocked) {
			const [resLock, errLock] = await packetHandler.write1ByteTxRx(portHandler, servoId, ADDR_SCS_LOCK, 1);
		if (resLock !== COMM_SUCCESS) {
				console.warn(`Warning: Failed to re-lock servo ${servoId} after position write: ${packetHandler.getTxRxResult(resLock)}, Error: ${errLock}`);
			} else {
				unlocked = false;
			}
		}

		return "success";
	} catch (err) {
		console.error(`Exception writing position to servo ${servoId}:`, err);
		if (unlocked) {
			await tryLockServo(servoId);
		}
		throw new Error(`Failed to write position to servo ${servoId}: ${err.message}`);
	}
}

/**
 * Writes a target position and disables torque for manual movement.
 * @param {number} servoId - The ID of the servo (1-252).
 * @param {number} position - The target position value (0-4095).
 * @param {number} waitTimeMs - Time to wait for servo to reach position (milliseconds).
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If not connected, position is out of range, write fails, or an exception occurs.
 */
export async function writePositionAndDisableTorque(servoId, position, waitTimeMs = 1500) {
	checkConnection();
	let unlocked = false;
	try {
		if (position < 0 || position > 4095) {
			throw new Error(`Invalid position value ${position} for servo ${servoId}. Must be between 0 and 4095.`);
		}
		const targetPosition = Math.round(position);

		debugLog(`🔓 Moving servo ${servoId} to position ${targetPosition}, waiting ${waitTimeMs}ms, then disabling torque...`);

		// 1. Unlock servo configuration first
		const [resUnlock, errUnlock] = await packetHandler.write1ByteTxRx(portHandler, servoId, ADDR_SCS_LOCK, 0);
		if (resUnlock !== COMM_SUCCESS) {
			debugLog(`Warning: Failed to unlock servo ${servoId}, trying direct write anyway...`);
		} else {
		unlocked = true;
		}

		// 2. Enable torque first
		const [torqueEnableResult, torqueEnableError] = await packetHandler.write1ByteTxRx(portHandler, servoId, ADDR_SCS_TORQUE_ENABLE, 1);
		if (torqueEnableResult !== COMM_SUCCESS) {
			console.warn(`Warning: Failed to enable torque for servo ${servoId}: ${packetHandler.getTxRxResult(torqueEnableResult)}, Error: ${torqueEnableError}`);
		} else {
			debugLog(`✅ Torque enabled for servo ${servoId}`);
		}

		// 3. Write the position
		const [result, error] = await packetHandler.write2ByteTxRx(portHandler, servoId, ADDR_SCS_GOAL_POSITION, targetPosition);
		if (result !== COMM_SUCCESS) {
			throw new Error(`Error writing position to servo ${servoId}: ${packetHandler.getTxRxResult(result)}, Error code: ${error}`);
		}

		// 4. Wait for servo to reach position
		debugLog(`⏳ Waiting ${waitTimeMs}ms for servo ${servoId} to reach position ${targetPosition}...`);
		await new Promise(resolve => setTimeout(resolve, waitTimeMs));

		// 5. Disable torque
		const [torqueResult, torqueError] = await packetHandler.write1ByteTxRx(portHandler, servoId, ADDR_SCS_TORQUE_ENABLE, 0);
		if (torqueResult !== COMM_SUCCESS) {
			console.warn(`Warning: Failed to disable torque for servo ${servoId}: ${packetHandler.getTxRxResult(torqueResult)}, Error: ${torqueError}`);
		} else {
			debugLog(`✅ Torque disabled for servo ${servoId} - now movable by hand`);
		}

		// 6. Lock servo configuration back
		if (unlocked) {
			const [resLock, errLock] = await packetHandler.write1ByteTxRx(portHandler, servoId, ADDR_SCS_LOCK, 1);
		if (resLock !== COMM_SUCCESS) {
				console.warn(`Warning: Failed to re-lock servo ${servoId} after position write: ${packetHandler.getTxRxResult(resLock)}, Error: ${errLock}`);
			} else {
				unlocked = false;
			}
		}

		return "success";
	} catch (err) {
		console.error(`Exception writing position and disabling torque for servo ${servoId}:`, err);
		if (unlocked) {
			await tryLockServo(servoId);
		}
		throw new Error(`Failed to write position and disable torque for servo ${servoId}: ${err.message}`);
	}
}

/**
 * Enables or disables the torque of a servo with temporary unlocking.
 * @param {number} servoId - The ID of the servo (1-252).
 * @param {boolean} enable - True to enable torque, false to disable.
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If not connected, write fails, or an exception occurs.
 */
export async function writeTorqueEnableUnlocked(servoId, enable) {
	checkConnection();
	let unlocked = false;
	try {
		const enableValue = enable ? 1 : 0;
		
		debugLog(`🔓 Temporarily unlocking servo ${servoId} for torque enable write...`);

		// 1. Unlock servo configuration first
		const [resUnlock, errUnlock] = await packetHandler.write1ByteTxRx(portHandler, servoId, ADDR_SCS_LOCK, 0);
		if (resUnlock !== COMM_SUCCESS) {
			debugLog(`Warning: Failed to unlock servo ${servoId}, trying direct write anyway...`);
		} else {
			unlocked = true;
		}

		// 2. Write the torque enable
		const [result, error] = await packetHandler.write1ByteTxRx(portHandler, servoId, ADDR_SCS_TORQUE_ENABLE, enableValue);
		if (result !== COMM_SUCCESS) {
			throw new Error(`Error setting torque for servo ${servoId}: ${packetHandler.getTxRxResult(result)}, Error code: ${error}`);
		}

		// 3. Lock servo configuration back
		if (unlocked) {
			const [resLock, errLock] = await packetHandler.write1ByteTxRx(portHandler, servoId, ADDR_SCS_LOCK, 1);
			if (resLock !== COMM_SUCCESS) {
				console.warn(`Warning: Failed to re-lock servo ${servoId} after torque enable write: ${packetHandler.getTxRxResult(resLock)}, Error: ${errLock}`);
			} else {
				unlocked = false;
			}
		}

		return "success";
	} catch (err) {
		console.error(`Exception setting torque for servo ${servoId}:`, err);
		if (unlocked) {
			await tryLockServo(servoId);
		}
		throw new Error(`Exception setting torque for servo ${servoId}: ${err.message}`);
	}
}

// =============================================================================
// SYNC WRITE OPERATIONS
// =============================================================================

/**
 * Writes target positions to multiple servos synchronously.
 * @param {Map<number, number> | object} servoPositions - A Map or object where keys are servo IDs (1-252) and values are target positions (0-4095).
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If not connected, any position is out of range, transmission fails, or an exception occurs.
 */
export async function syncWritePositions(servoPositions) {
	checkConnection();

	const groupSyncWrite = new GroupSyncWrite(portHandler, packetHandler, ADDR_SCS_GOAL_POSITION, 2);
	let paramAdded = false;

	const entries = servoPositions instanceof Map ? servoPositions.entries() : Object.entries(servoPositions);

	for (const [idStr, position] of entries) {
		const servoId = parseInt(idStr, 10);
		if (isNaN(servoId) || servoId < 1 || servoId > 252) {
			throw new Error(`Invalid servo ID "${idStr}" in syncWritePositions.`);
		}
		if (position < 0 || position > 4095) {
			throw new Error(`Invalid position value ${position} for servo ${servoId} in syncWritePositions. Must be between 0 and 4095.`);
		}
		const targetPosition = Math.round(position);
		const data = [SCS_LOBYTE(targetPosition), SCS_HIBYTE(targetPosition)];

		if (groupSyncWrite.addParam(servoId, data)) {
			paramAdded = true;
		} else {
			console.warn(`Failed to add servo ${servoId} to sync write group (possibly duplicate).`);
		}
	}

	if (!paramAdded) {
		debugLog("Sync Write: No valid servo positions provided or added.");
		return "success";
	}

	try {
		const result = await groupSyncWrite.txPacket();
		if (result !== COMM_SUCCESS) {
			throw new Error(`Sync Write txPacket failed: ${packetHandler.getTxRxResult(result)}`);
		}
		return "success";
	} catch (err) {
		console.error("Exception during syncWritePositions:", err);
		throw new Error(`Sync Write failed: ${err.message}`);
	}
}

/**
 * Writes a target speed for a servo in wheel mode.
 * @param {number} servoId - The ID of the servo
 * @param {number} speed - The target speed value (-10000 to 10000). Negative values indicate reverse direction. 0 stops the wheel.
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If not connected, either write fails, or an exception occurs.
 */
export async function writeWheelSpeed(servoId, speed) {
	checkConnection();
	let unlocked = false;
	try {
		const clampedSpeed = Math.max(-10000, Math.min(10000, Math.round(speed)));
		let speedValue = Math.abs(clampedSpeed) & 0x7fff;

		if (clampedSpeed < 0) {
			speedValue |= 0x8000;
		}

		debugLog(`Temporarily unlocking servo ${servoId} for wheel speed write...`);

		// 1. Unlock servo configuration first
		const [resUnlock, errUnlock] = await packetHandler.write1ByteTxRx(portHandler, servoId, ADDR_SCS_LOCK, 0);
		if (resUnlock !== COMM_SUCCESS) {
			debugLog(`Warning: Failed to unlock servo ${servoId}, trying direct write anyway...`);
			} else {
			unlocked = true;
		}

		// 2. Write the speed
		const [result, error] = await packetHandler.write2ByteTxRx(portHandler, servoId, ADDR_SCS_GOAL_SPEED, speedValue);
		if (result !== COMM_SUCCESS) {
			throw new Error(`Error writing wheel speed to servo ${servoId}: ${packetHandler.getTxRxResult(result)}, Error: ${error}`);
		}

		// 3. Lock servo configuration back
		if (unlocked) {
			const [resLock, errLock] = await packetHandler.write1ByteTxRx(portHandler, servoId, ADDR_SCS_LOCK, 1);
			if (resLock !== COMM_SUCCESS) {
				console.warn(`Warning: Failed to re-lock servo ${servoId} after wheel speed write: ${packetHandler.getTxRxResult(resLock)}, Error: ${errLock}`);
			} else {
				unlocked = false;
			}
		}

		return "success";
	} catch (err) {
		console.error(`Exception writing wheel speed to servo ${servoId}:`, err);
		if (unlocked) {
			await tryLockServo(servoId);
		}
		throw new Error(`Exception writing wheel speed to servo ${servoId}: ${err.message}`);
	}
}

/**
 * Writes target speeds to multiple servos in wheel mode synchronously.
 * @param {Map<number, number> | object} servoSpeeds - A Map or object where keys are servo IDs (1-252) and values are target speeds (-10000 to 10000).
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If not connected, any speed is out of range, transmission fails, or an exception occurs.
 */
export async function syncWriteWheelSpeed(servoSpeeds) {
	checkConnection();

	const groupSyncWrite = new GroupSyncWrite(
		portHandler,
		packetHandler,
		ADDR_SCS_GOAL_SPEED,
		2 // Data length for speed (2 bytes)
	);
	let paramAdded = false;

	const entries = servoSpeeds instanceof Map ? servoSpeeds.entries() : Object.entries(servoSpeeds);

	// Second pass: Add valid parameters
	for (const [idStr, speed] of entries) {
		const servoId = parseInt(idStr, 10); // Already validated

		if (isNaN(servoId) || servoId < 1 || servoId > 252) {
			throw new Error(`Invalid servo ID "${idStr}" in syncWriteWheelSpeed.`);
		}
		if (speed < -10000 || speed > 10000) {
			throw new Error(
				`Invalid speed value ${speed} for servo ${servoId} in syncWriteWheelSpeed. Must be between -10000 and 10000.`
			);
		}

		const clampedSpeed = Math.max(-10000, Math.min(10000, Math.round(speed))); // Ensure integer, already validated range
		let speedValue = Math.abs(clampedSpeed) & 0x7fff; // Get absolute value, ensure within 15 bits

		// Set the direction bit (MSB of the 16-bit value) if speed is negative
		if (clampedSpeed < 0) {
			speedValue |= 0x8000; // Set the 16th bit for reverse direction
		}

		const data = [SCS_LOBYTE(speedValue), SCS_HIBYTE(speedValue)];

		if (groupSyncWrite.addParam(servoId, data)) {
			paramAdded = true;
		} else {
			// This should ideally not happen if IDs are unique, but handle defensively
			console.warn(
				`Failed to add servo ${servoId} to sync write speed group (possibly duplicate).`
			);
		}
	}

	if (!paramAdded) {
		debugLog("Sync Write Speed: No valid servo speeds provided or added.");
		return "success"; // Nothing to write is considered success
	}

	try {
		// Send the Sync Write instruction
		const result = await groupSyncWrite.txPacket();
		if (result !== COMM_SUCCESS) {
			throw new Error(`Sync Write Speed txPacket failed: ${packetHandler.getTxRxResult(result)}`);
		}
		return "success";
	} catch (err) {
		console.error("Exception during syncWriteWheelSpeed:", err);
		// Re-throw the original error or a new one wrapping it
		throw new Error(`Sync Write Speed failed: ${err.message}`);
	}
}

/**
 * Sets the Baud Rate of a servo.
 * NOTE: After changing the baud rate, you might need to disconnect and reconnect
 *       at the new baud rate to communicate with the servo further.
 * @param {number} servoId - The current ID of the servo to configure (1-252).
 * @param {number} baudRateIndex - The index representing the new baud rate (0-7).
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If not connected, input is invalid, any step fails, or an exception occurs.
 */
export async function setBaudRate(servoId, baudRateIndex) {
	checkConnection();

	// Validate inputs
	if (servoId < 1 || servoId > 252) {
		throw new Error(`Invalid servo ID provided: ${servoId}. Must be between 1 and 252.`);
	}
	if (baudRateIndex < 0 || baudRateIndex > 7) {
		throw new Error(`Invalid baudRateIndex: ${baudRateIndex}. Must be between 0 and 7.`);
	}

	let unlocked = false;
	try {
		debugLog(`Setting baud rate for servo ${servoId}: Index=${baudRateIndex}`);

		// 1. Unlock servo configuration
		const [resUnlock, errUnlock] = await packetHandler.write1ByteTxRx(
			portHandler,
			servoId,
			ADDR_SCS_LOCK,
			0 // 0 to unlock
		);
		if (resUnlock !== COMM_SUCCESS) {
			throw new Error(
				`Failed to unlock servo ${servoId}: ${packetHandler.getTxRxResult(
					resUnlock
				)}, Error: ${errUnlock}`
			);
		}
		unlocked = true;

		// 2. Write new Baud Rate index
		const [resBaud, errBaud] = await packetHandler.write1ByteTxRx(
			portHandler,
			servoId,
			ADDR_SCS_BAUD_RATE,
			baudRateIndex
		);
		if (resBaud !== COMM_SUCCESS) {
			throw new Error(
				`Failed to write baud rate index ${baudRateIndex} to servo ${servoId}: ${packetHandler.getTxRxResult(
					resBaud
				)}, Error: ${errBaud}`
			);
		}

		// 3. Lock servo configuration
		const [resLock, errLock] = await packetHandler.write1ByteTxRx(
			portHandler,
			servoId,
			ADDR_SCS_LOCK,
			1
		);
		if (resLock !== COMM_SUCCESS) {
			throw new Error(
				`Failed to lock servo ${servoId} after setting baud rate: ${packetHandler.getTxRxResult(
					resLock
				)}, Error: ${errLock}.`
			);
		}
		unlocked = false; // Successfully locked

		debugLog(
			`Successfully set baud rate for servo ${servoId}. Index: ${baudRateIndex}. Remember to potentially reconnect with the new baud rate.`
		);
		return "success";
	} catch (err) {
		console.error(`Exception during setBaudRate for servo ID ${servoId}:`, err);
		if (unlocked) {
			await tryLockServo(servoId);
		}
		throw new Error(`Failed to set baud rate for servo ${servoId}: ${err.message}`);
	}
}

/**
 * Sets the ID of a servo.
 * NOTE: Changing the ID requires using the new ID for subsequent commands.
 * @param {number} currentServoId - The current ID of the servo to configure (1-252).
 * @param {number} newServoId - The new ID to set for the servo (1-252).
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If not connected, input is invalid, any step fails, or an exception occurs.
 */
export async function setServoId(currentServoId, newServoId) {
	checkConnection();

	// Validate inputs
	if (currentServoId < 1 || currentServoId > 252 || newServoId < 1 || newServoId > 252) {
		throw new Error(
			`Invalid servo ID provided. Current: ${currentServoId}, New: ${newServoId}. Must be between 1 and 252.`
		);
	}

	if (currentServoId === newServoId) {
		debugLog(`Servo ID is already ${newServoId}. No change needed.`);
		return "success";
	}

	let unlocked = false;
	let idWritten = false;
	try {
		debugLog(`Setting servo ID: From ${currentServoId} to ${newServoId}`);

		// 1. Unlock servo configuration (using current ID)
		const [resUnlock, errUnlock] = await packetHandler.write1ByteTxRx(
			portHandler,
			currentServoId,
			ADDR_SCS_LOCK,
			0 // 0 to unlock
		);
		if (resUnlock !== COMM_SUCCESS) {
			throw new Error(
				`Failed to unlock servo ${currentServoId}: ${packetHandler.getTxRxResult(
					resUnlock
				)}, Error: ${errUnlock}`
			);
		}
		unlocked = true;

		// 2. Write new Servo ID (using current ID)
		const [resId, errId] = await packetHandler.write1ByteTxRx(
			portHandler,
			currentServoId,
			ADDR_SCS_ID,
			newServoId
		);
		if (resId !== COMM_SUCCESS) {
			throw new Error(
				`Failed to write new ID ${newServoId} to servo ${currentServoId}: ${packetHandler.getTxRxResult(
					resId
				)}, Error: ${errId}`
			);
		}
		idWritten = true;

		// 3. Lock servo configuration (using NEW ID)
		const [resLock, errLock] = await packetHandler.write1ByteTxRx(
			portHandler,
			newServoId, // Use NEW ID here
			ADDR_SCS_LOCK,
			1 // 1 to lock
		);
		if (resLock !== COMM_SUCCESS) {
			// ID was likely changed, but lock failed. Critical state.
			throw new Error(
				`Failed to lock servo with new ID ${newServoId}: ${packetHandler.getTxRxResult(
					resLock
				)}, Error: ${errLock}. Configuration might be incomplete.`
			);
		}
		unlocked = false; // Successfully locked with new ID

		debugLog(
			`Successfully set servo ID from ${currentServoId} to ${newServoId}. Remember to use the new ID for future commands.`
		);
		return "success";
	} catch (err) {
		console.error(`Exception during setServoId for current ID ${currentServoId}:`, err);
		if (unlocked) {
			// If unlock succeeded but subsequent steps failed, attempt to re-lock.
			// If ID write failed, use current ID. If ID write succeeded but lock failed, use new ID.
			const idToLock = idWritten ? newServoId : currentServoId;
			console.warn(`Attempting to re-lock servo using ID ${idToLock}...`);
			await tryLockServo(idToLock);
		}
		throw new Error(
			`Failed to set servo ID from ${currentServoId} to ${newServoId}: ${err.message}`
		);
	}
}

// =============================================================================
// LEGACY COMPATIBILITY FUNCTIONS (for backward compatibility)
// =============================================================================

/**
 * Sets a servo to wheel mode (continuous rotation) with unlocking.
 * @param {number} servoId - The ID of the servo (1-252).
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If not connected, any step fails, or an exception occurs.
 */
export async function setWheelMode(servoId) {
	checkConnection();
	let unlocked = false;
	try {
		debugLog(`Setting servo ${servoId} to wheel mode...`);

		// 1. Unlock servo configuration
		const [resUnlock, errUnlock] = await packetHandler.write1ByteTxRx(portHandler, servoId, ADDR_SCS_LOCK, 0);
		if (resUnlock !== COMM_SUCCESS) {
			throw new Error(`Failed to unlock servo ${servoId}: ${packetHandler.getTxRxResult(resUnlock)}, Error: ${errUnlock}`);
		}
		unlocked = true;

		// 2. Set mode to 1 (Wheel/Speed mode)
		const [resMode, errMode] = await packetHandler.write1ByteTxRx(portHandler, servoId, ADDR_SCS_MODE, 1);
		if (resMode !== COMM_SUCCESS) {
			throw new Error(`Failed to set wheel mode for servo ${servoId}: ${packetHandler.getTxRxResult(resMode)}, Error: ${errMode}`);
		}

		// 3. Lock servo configuration
		const [resLock, errLock] = await packetHandler.write1ByteTxRx(portHandler, servoId, ADDR_SCS_LOCK, 1);
		if (resLock !== COMM_SUCCESS) {
			throw new Error(`Failed to lock servo ${servoId} after setting mode: ${packetHandler.getTxRxResult(resLock)}, Error: ${errLock}`);
		}
		unlocked = false;

		debugLog(`Successfully set servo ${servoId} to wheel mode.`);
		return "success";
	} catch (err) {
		console.error(`Exception setting wheel mode for servo ${servoId}:`, err);
		if (unlocked) {
			await tryLockServo(servoId);
		}
		throw new Error(`Failed to set wheel mode for servo ${servoId}: ${err.message}`);
	}
}

/**
 * Sets a servo back to position control mode from wheel mode.
 * @param {number} servoId - The ID of the servo (1-252).
 * @returns {Promise<"success">} Resolves with "success".
 * @throws {Error} If not connected, any step fails, or an exception occurs.
 */
export async function setPositionMode(servoId) {
	checkConnection();
	let unlocked = false;
	try {
		debugLog(`Setting servo ${servoId} back to position mode...`);

		// 1. Unlock servo configuration
		const [resUnlock, errUnlock] = await packetHandler.write1ByteTxRx(portHandler, servoId, ADDR_SCS_LOCK, 0);
		if (resUnlock !== COMM_SUCCESS) {
			throw new Error(`Failed to unlock servo ${servoId}: ${packetHandler.getTxRxResult(resUnlock)}, Error: ${errUnlock}`);
		}
		unlocked = true;

		// 2. Set mode to 0 (Position/Servo mode)
		const [resMode, errMode] = await packetHandler.write1ByteTxRx(portHandler, servoId, ADDR_SCS_MODE, 0);
		if (resMode !== COMM_SUCCESS) {
			throw new Error(`Failed to set position mode for servo ${servoId}: ${packetHandler.getTxRxResult(resMode)}, Error: ${errMode}`);
		}

		// 3. Lock servo configuration
		const [resLock, errLock] = await packetHandler.write1ByteTxRx(portHandler, servoId, ADDR_SCS_LOCK, 1);
		if (resLock !== COMM_SUCCESS) {
			throw new Error(`Failed to lock servo ${servoId} after setting mode: ${packetHandler.getTxRxResult(resLock)}, Error: ${errLock}`);
		}
		unlocked = false;

		debugLog(`Successfully set servo ${servoId} back to position mode.`);
		return "success";
	} catch (err) {
		console.error(`Exception setting position mode for servo ${servoId}:`, err);
		if (unlocked) {
			await tryLockServo(servoId);
		}
		throw new Error(`Failed to set position mode for servo ${servoId}: ${err.message}`);
	}
}
