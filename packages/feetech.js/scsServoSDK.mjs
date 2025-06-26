import {
  PortHandler,
  PacketHandler,
  COMM_SUCCESS,
  COMM_RX_TIMEOUT,
  COMM_RX_CORRUPT,
  COMM_RX_FAIL,
  COMM_TX_FAIL,
  COMM_NOT_AVAILABLE,
  SCS_LOBYTE,
  SCS_HIBYTE,
  SCS_MAKEWORD,
  GroupSyncRead, // Import GroupSyncRead
  GroupSyncWrite, // Import GroupSyncWrite
} from "./lowLevelSDK.mjs";

// Import address constants from the correct file
import {
  ADDR_SCS_PRESENT_POSITION,
  ADDR_SCS_GOAL_POSITION,
  ADDR_SCS_TORQUE_ENABLE,
  ADDR_SCS_GOAL_ACC,
  ADDR_SCS_GOAL_SPEED,
} from "./scsservo_constants.mjs";

// Define constants not present in scsservo_constants.mjs
const ADDR_SCS_MODE = 33;
const ADDR_SCS_LOCK = 55;
const ADDR_SCS_ID = 5; // Address for Servo ID
const ADDR_SCS_BAUD_RATE = 6; // Address for Baud Rate

// --- Class-based multi-instance implementation ---
export class ScsServoSDK {
  constructor() {
    this.portHandler = null;
    this.packetHandler = null;
  }

  async connect(options = {}) {
    if (this.portHandler && this.portHandler.isOpen) {
      console.log("Already connected.");
      return true;
    }
    const { baudRate = 1000000, protocolEnd = 0 } = options;
    try {
      this.portHandler = new PortHandler();
      const portRequested = await this.portHandler.requestPort();
      if (!portRequested) {
        this.portHandler = null;
        throw new Error("Failed to select a serial port.");
      }
      this.portHandler.setBaudRate(baudRate);
      const portOpened = await this.portHandler.openPort();
      if (!portOpened) {
        await this.portHandler.closePort().catch(console.error);
        this.portHandler = null;
        throw new Error(`Failed to open port at baudrate ${baudRate}.`);
      }
      this.packetHandler = new PacketHandler(protocolEnd);
      console.log(
        `Connected to serial port at ${baudRate} baud, protocol end: ${protocolEnd}.`
      );
      return true;
    } catch (err) {
      console.error("Error during connection:", err);
      if (this.portHandler) {
        try {
          await this.portHandler.closePort();
        } catch (closeErr) {
          console.error(
            "Error closing port after connection failure:",
            closeErr
          );
        }
      }
      this.portHandler = null;
      this.packetHandler = null;
      throw new Error(`Connection failed: ${err.message}`);
    }
  }

  async disconnect() {
    if (!this.portHandler || !this.portHandler.isOpen) {
      console.log("Already disconnected.");
      return true;
    }
    try {
      await this.portHandler.closePort();
      this.portHandler = null;
      this.packetHandler = null;
      console.log("Disconnected from serial port.");
      return true;
    } catch (err) {
      console.error("Error during disconnection:", err);
      this.portHandler = null;
      this.packetHandler = null;
      throw new Error(`Disconnection failed: ${err.message}`);
    }
  }

  checkConnection() {
    if (!this.portHandler || !this.packetHandler) {
      throw new Error("Not connected. Call connect() first.");
    }
  }

  async readPosition(servoId) {
    this.checkConnection();
    try {
      const [position, result, error] = await this.packetHandler.read2ByteTxRx(
        this.portHandler,
        servoId,
        ADDR_SCS_PRESENT_POSITION
      );
      if (result !== COMM_SUCCESS) {
        throw new Error(
          `Error reading position from servo ${servoId}: ${this.packetHandler.getTxRxResult(
            result
          )}, Error code: ${error}`
        );
      }
      return position & 0xffff;
    } catch (err) {
      console.error(`Exception reading position from servo ${servoId}:`, err);
      throw new Error(
        `Exception reading position from servo ${servoId}: ${err.message}`
      );
    }
  }

  async readBaudRate(servoId) {
    this.checkConnection();
    try {
      const [baudIndex, result, error] = await this.packetHandler.read1ByteTxRx(
        this.portHandler,
        servoId,
        ADDR_SCS_BAUD_RATE
      );
      if (result !== COMM_SUCCESS) {
        throw new Error(
          `Error reading baud rate from servo ${servoId}: ${this.packetHandler.getTxRxResult(
            result
          )}, Error code: ${error}`
        );
      }
      return baudIndex;
    } catch (err) {
      console.error(`Exception reading baud rate from servo ${servoId}:`, err);
      throw new Error(
        `Exception reading baud rate from servo ${servoId}: ${err.message}`
      );
    }
  }

  async readMode(servoId) {
    this.checkConnection();
    try {
      const [modeValue, result, error] = await this.packetHandler.read1ByteTxRx(
        this.portHandler,
        servoId,
        ADDR_SCS_MODE
      );
      if (result !== COMM_SUCCESS) {
        throw new Error(
          `Error reading mode from servo ${servoId}: ${this.packetHandler.getTxRxResult(
            result
          )}, Error code: ${error}`
        );
      }
      return modeValue;
    } catch (err) {
      console.error(`Exception reading mode from servo ${servoId}:`, err);
      throw new Error(
        `Exception reading mode from servo ${servoId}: ${err.message}`
      );
    }
  }

  async writePosition(servoId, position) {
    this.checkConnection();
    try {
      if (position < 0 || position > 4095) {
        throw new Error(
          `Invalid position value ${position} for servo ${servoId}. Must be between 0 and 4095.`
        );
      }
      const targetPosition = Math.round(position);
      const [result, error] = await this.packetHandler.write2ByteTxRx(
        this.portHandler,
        servoId,
        ADDR_SCS_GOAL_POSITION,
        targetPosition
      );
      if (result !== COMM_SUCCESS) {
        throw new Error(
          `Error writing position to servo ${servoId}: ${this.packetHandler.getTxRxResult(
            result
          )}, Error code: ${error}`
        );
      }
      return "success";
    } catch (err) {
      console.error(`Exception writing position to servo ${servoId}:`, err);
      throw new Error(
        `Failed to write position to servo ${servoId}: ${err.message}`
      );
    }
  }

  async writeTorqueEnable(servoId, enable) {
    this.checkConnection();
    try {
      const enableValue = enable ? 1 : 0;
      const [result, error] = await this.packetHandler.write1ByteTxRx(
        this.portHandler,
        servoId,
        ADDR_SCS_TORQUE_ENABLE,
        enableValue
      );
      if (result !== COMM_SUCCESS) {
        throw new Error(
          `Error setting torque for servo ${servoId}: ${this.packetHandler.getTxRxResult(
            result
          )}, Error code: ${error}`
        );
      }
      return "success";
    } catch (err) {
      console.error(`Exception setting torque for servo ${servoId}:`, err);
      throw new Error(
        `Exception setting torque for servo ${servoId}: ${err.message}`
      );
    }
  }

  async writeAcceleration(servoId, acceleration) {
    this.checkConnection();
    try {
      const clampedAcceleration = Math.max(
        0,
        Math.min(254, Math.round(acceleration))
      );
      const [result, error] = await this.packetHandler.write1ByteTxRx(
        this.portHandler,
        servoId,
        ADDR_SCS_GOAL_ACC,
        clampedAcceleration
      );
      if (result !== COMM_SUCCESS) {
        throw new Error(
          `Error writing acceleration to servo ${servoId}: ${this.packetHandler.getTxRxResult(
            result
          )}, Error code: ${error}`
        );
      }
      return "success";
    } catch (err) {
      console.error(`Exception writing acceleration to servo ${servoId}:`, err);
      throw new Error(
        `Exception writing acceleration to servo ${servoId}: ${err.message}`
      );
    }
  }

  async setWheelMode(servoId) {
    this.checkConnection();
    let unlocked = false;
    try {
      console.log(`Setting servo ${servoId} to wheel mode...`);
      const [resUnlock, errUnlock] = await this.packetHandler.write1ByteTxRx(
        this.portHandler,
        servoId,
        ADDR_SCS_LOCK,
        0
      );
      if (resUnlock !== COMM_SUCCESS) {
        throw new Error(
          `Failed to unlock servo ${servoId}: ${this.packetHandler.getTxRxResult(
            resUnlock
          )}, Error: ${errUnlock}`
        );
      }
      unlocked = true;
      const [resMode, errMode] = await this.packetHandler.write1ByteTxRx(
        this.portHandler,
        servoId,
        ADDR_SCS_MODE,
        1
      );
      if (resMode !== COMM_SUCCESS) {
        throw new Error(
          `Failed to set wheel mode for servo ${servoId}: ${this.packetHandler.getTxRxResult(
            resMode
          )}, Error: ${errMode}`
        );
      }
      const [resLock, errLock] = await this.packetHandler.write1ByteTxRx(
        this.portHandler,
        servoId,
        ADDR_SCS_LOCK,
        1
      );
      if (resLock !== COMM_SUCCESS) {
        throw new Error(
          `Failed to lock servo ${servoId} after setting mode: ${this.packetHandler.getTxRxResult(
            resLock
          )}, Error: ${errLock}`
        );
      }
      unlocked = false;
      console.log(`Successfully set servo ${servoId} to wheel mode.`);
      return "success";
    } catch (err) {
      console.error(`Exception setting wheel mode for servo ${servoId}:`, err);
      if (unlocked) {
        await this.tryLockServo(servoId);
      }
      throw new Error(
        `Failed to set wheel mode for servo ${servoId}: ${err.message}`
      );
    }
  }

  async setPositionMode(servoId) {
    this.checkConnection();
    let unlocked = false;
    try {
      console.log(`Setting servo ${servoId} back to position mode...`);
      const [resUnlock, errUnlock] = await this.packetHandler.write1ByteTxRx(
        this.portHandler,
        servoId,
        ADDR_SCS_LOCK,
        0
      );
      if (resUnlock !== COMM_SUCCESS) {
        throw new Error(
          `Failed to unlock servo ${servoId}: ${this.packetHandler.getTxRxResult(
            resUnlock
          )}, Error: ${errUnlock}`
        );
      }
      unlocked = true;
      const [resMode, errMode] = await this.packetHandler.write1ByteTxRx(
        this.portHandler,
        servoId,
        ADDR_SCS_MODE,
        0
      );
      if (resMode !== COMM_SUCCESS) {
        throw new Error(
          `Failed to set position mode for servo ${servoId}: ${this.packetHandler.getTxRxResult(
            resMode
          )}, Error: ${errMode}`
        );
      }
      const [resLock, errLock] = await this.packetHandler.write1ByteTxRx(
        this.portHandler,
        servoId,
        ADDR_SCS_LOCK,
        1
      );
      if (resLock !== COMM_SUCCESS) {
        throw new Error(
          `Failed to lock servo ${servoId} after setting mode: ${this.packetHandler.getTxRxResult(
            resLock
          )}, Error: ${errLock}`
        );
      }
      unlocked = false;
      console.log(`Successfully set servo ${servoId} back to position mode.`);
      return "success";
    } catch (err) {
      console.error(
        `Exception setting position mode for servo ${servoId}:`,
        err
      );
      if (unlocked) {
        await this.tryLockServo(servoId);
      }
      throw new Error(
        `Failed to set position mode for servo ${servoId}: ${err.message}`
      );
    }
  }

  async tryLockServo(servoId) {
    try {
      await this.packetHandler.write1ByteTxRx(
        this.portHandler,
        servoId,
        ADDR_SCS_LOCK,
        1
      );
    } catch (lockErr) {
      console.error(`Failed to re-lock servo ${servoId}:`, lockErr);
    }
  }

  async writeWheelSpeed(servoId, speed) {
    this.checkConnection();
    try {
      const clampedSpeed = Math.max(-10000, Math.min(10000, Math.round(speed)));
      let speedValue = Math.abs(clampedSpeed) & 0x7fff;
      if (clampedSpeed < 0) {
        speedValue |= 0x8000;
      }
      const [result, error] = await this.packetHandler.write2ByteTxRx(
        this.portHandler,
        servoId,
        ADDR_SCS_GOAL_SPEED,
        speedValue
      );
      if (result !== COMM_SUCCESS) {
        throw new Error(
          `Error writing wheel speed to servo ${servoId}: ${this.packetHandler.getTxRxResult(
            result
          )}, Error: ${error}`
        );
      }
      return "success";
    } catch (err) {
      console.error(`Exception writing wheel speed to servo ${servoId}:`, err);
      throw new Error(
        `Exception writing wheel speed to servo ${servoId}: ${err.message}`
      );
    }
  }

  async syncWriteWheelSpeed(servoSpeeds) {
    this.checkConnection();
    const groupSyncWrite = new GroupSyncWrite(
      this.portHandler,
      this.packetHandler,
      ADDR_SCS_GOAL_SPEED,
      2
    );
    let paramAdded = false;
    const entries =
      servoSpeeds instanceof Map
        ? servoSpeeds.entries()
        : Object.entries(servoSpeeds);
    for (const [idStr, speed] of entries) {
      const servoId = parseInt(idStr, 10);
      if (isNaN(servoId) || servoId < 1 || servoId > 252) {
        throw new Error(`Invalid servo ID "${idStr}" in syncWriteWheelSpeed.`);
      }
      if (speed < -10000 || speed > 10000) {
        throw new Error(
          `Invalid speed value ${speed} for servo ${servoId} in syncWriteWheelSpeed. Must be between -10000 and 10000.`
        );
      }
      const clampedSpeed = Math.max(-10000, Math.min(10000, Math.round(speed)));
      let speedValue = Math.abs(clampedSpeed) & 0x7fff;
      if (clampedSpeed < 0) {
        speedValue |= 0x8000;
      }
      const data = [SCS_LOBYTE(speedValue), SCS_HIBYTE(speedValue)];
      if (groupSyncWrite.addParam(servoId, data)) {
        paramAdded = true;
      } else {
        console.warn(
          `Failed to add servo ${servoId} to sync write speed group (possibly duplicate).`
        );
      }
    }
    if (!paramAdded) {
      console.log("Sync Write Speed: No valid servo speeds provided or added.");
      return "success";
    }
    try {
      const result = await groupSyncWrite.txPacket();
      if (result !== COMM_SUCCESS) {
        throw new Error(
          `Sync Write Speed txPacket failed: ${this.packetHandler.getTxRxResult(
            result
          )}`
        );
      }
      return "success";
    } catch (err) {
      console.error("Exception during syncWriteWheelSpeed:", err);
      throw new Error(`Sync Write Speed failed: ${err.message}`);
    }
  }

  async syncReadPositions(servoIds) {
    this.checkConnection();
    if (!Array.isArray(servoIds) || servoIds.length === 0) {
      console.log("Sync Read: No servo IDs provided.");
      return new Map();
    }
    const startAddress = ADDR_SCS_PRESENT_POSITION;
    const positions = new Map();
    for (const id of servoIds) {
      if (id < 1 || id > 252) {
        console.warn(`Sync Read: Invalid servo ID ${id} skipped.`);
        continue;
      }
      try {
        const [pos, result, error] = await this.packetHandler.read2ByteTxRx(
          this.portHandler,
          id,
          startAddress
        );
        if (result === COMM_SUCCESS) {
          positions.set(id, pos & 0xffff);
        } else {
          console.warn(
            `Sync Read: Failed to read position for servo ID ${id}: ${this.packetHandler.getTxRxResult(
              result
            )}, Error: ${error}`
          );
        }
      } catch (e) {
        console.warn(`Sync Read: Exception reading servo ID ${id}:`, e);
      }
    }
    return positions;
  }

  async syncWritePositions(servoPositions) {
    this.checkConnection();
    const groupSyncWrite = new GroupSyncWrite(
      this.portHandler,
      this.packetHandler,
      ADDR_SCS_GOAL_POSITION,
      2
    );
    let paramAdded = false;
    const entries =
      servoPositions instanceof Map
        ? servoPositions.entries()
        : Object.entries(servoPositions);
    for (const [idStr, position] of entries) {
      const servoId = parseInt(idStr, 10);
      if (isNaN(servoId) || servoId < 1 || servoId > 252) {
        throw new Error(`Invalid servo ID "${idStr}" in syncWritePositions.`);
      }
      if (position < 0 || position > 4095) {
        throw new Error(
          `Invalid position value ${position} for servo ${servoId} in syncWritePositions. Must be between 0 and 4095.`
        );
      }
      const targetPosition = Math.round(position);
      const data = [SCS_LOBYTE(targetPosition), SCS_HIBYTE(targetPosition)];
      if (groupSyncWrite.addParam(servoId, data)) {
        paramAdded = true;
      } else {
        console.warn(
          `Failed to add servo ${servoId} to sync write group (possibly duplicate).`
        );
      }
    }
    if (!paramAdded) {
      console.log("Sync Write: No valid servo positions provided or added.");
      return "success";
    }
    try {
      const result = await groupSyncWrite.txPacket();
      if (result !== COMM_SUCCESS) {
        throw new Error(
          `Sync Write txPacket failed: ${this.packetHandler.getTxRxResult(
            result
          )}`
        );
      }
      return "success";
    } catch (err) {
      console.error("Exception during syncWritePositions:", err);
      throw new Error(`Sync Write failed: ${err.message}`);
    }
  }

  async setBaudRate(servoId, baudRateIndex) {
    this.checkConnection();
    if (servoId < 1 || servoId > 252) {
      throw new Error(
        `Invalid servo ID provided: ${servoId}. Must be between 1 and 252.`
      );
    }
    if (baudRateIndex < 0 || baudRateIndex > 7) {
      throw new Error(
        `Invalid baudRateIndex: ${baudRateIndex}. Must be between 0 and 7.`
      );
    }
    let unlocked = false;
    try {
      console.log(
        `Setting baud rate for servo ${servoId}: Index=${baudRateIndex}`
      );
      const [resUnlock, errUnlock] = await this.packetHandler.write1ByteTxRx(
        this.portHandler,
        servoId,
        ADDR_SCS_LOCK,
        0
      );
      if (resUnlock !== COMM_SUCCESS) {
        throw new Error(
          `Failed to unlock servo ${servoId}: ${this.packetHandler.getTxRxResult(
            resUnlock
          )}, Error: ${errUnlock}`
        );
      }
      unlocked = true;
      const [resBaud, errBaud] = await this.packetHandler.write1ByteTxRx(
        this.portHandler,
        servoId,
        ADDR_SCS_BAUD_RATE,
        baudRateIndex
      );
      if (resBaud !== COMM_SUCCESS) {
        throw new Error(
          `Failed to write baud rate index ${baudRateIndex} to servo ${servoId}: ${this.packetHandler.getTxRxResult(
            resBaud
          )}, Error: ${errBaud}`
        );
      }
      const [resLock, errLock] = await this.packetHandler.write1ByteTxRx(
        this.portHandler,
        servoId,
        ADDR_SCS_LOCK,
        1
      );
      if (resLock !== COMM_SUCCESS) {
        throw new Error(
          `Failed to lock servo ${servoId} after setting baud rate: ${this.packetHandler.getTxRxResult(
            resLock
          )}, Error: ${errLock}.`
        );
      }
      unlocked = false;
      console.log(
        `Successfully set baud rate for servo ${servoId}. Index: ${baudRateIndex}. Remember to potentially reconnect with the new baud rate.`
      );
      return "success";
    } catch (err) {
      console.error(
        `Exception during setBaudRate for servo ID ${servoId}:`,
        err
      );
      if (unlocked) {
        await this.tryLockServo(servoId);
      }
      throw new Error(
        `Failed to set baud rate for servo ${servoId}: ${err.message}`
      );
    }
  }

  async setServoId(currentServoId, newServoId) {
    this.checkConnection();
    if (
      currentServoId < 1 ||
      currentServoId > 252 ||
      newServoId < 1 ||
      newServoId > 252
    ) {
      throw new Error(
        `Invalid servo ID provided. Current: ${currentServoId}, New: ${newServoId}. Must be between 1 and 252.`
      );
    }
    if (currentServoId === newServoId) {
      console.log(`Servo ID is already ${newServoId}. No change needed.`);
      return "success";
    }
    let unlocked = false;
    let idWritten = false;
    try {
      console.log(`Setting servo ID: From ${currentServoId} to ${newServoId}`);
      const [resUnlock, errUnlock] = await this.packetHandler.write1ByteTxRx(
        this.portHandler,
        currentServoId,
        ADDR_SCS_LOCK,
        0
      );
      if (resUnlock !== COMM_SUCCESS) {
        throw new Error(
          `Failed to unlock servo ${currentServoId}: ${this.packetHandler.getTxRxResult(
            resUnlock
          )}, Error: ${errUnlock}`
        );
      }
      unlocked = true;
      const [resId, errId] = await this.packetHandler.write1ByteTxRx(
        this.portHandler,
        currentServoId,
        ADDR_SCS_ID,
        newServoId
      );
      if (resId !== COMM_SUCCESS) {
        throw new Error(
          `Failed to write new ID ${newServoId} to servo ${currentServoId}: ${this.packetHandler.getTxRxResult(
            resId
          )}, Error: ${errId}`
        );
      }
      idWritten = true;
      const [resLock, errLock] = await this.packetHandler.write1ByteTxRx(
        this.portHandler,
        newServoId,
        ADDR_SCS_LOCK,
        1
      );
      if (resLock !== COMM_SUCCESS) {
        throw new Error(
          `Failed to lock servo with new ID ${newServoId}: ${this.packetHandler.getTxRxResult(
            resLock
          )}, Error: ${errLock}. Configuration might be incomplete.`
        );
      }
      unlocked = false;
      console.log(
        `Successfully set servo ID from ${currentServoId} to ${newServoId}. Remember to use the new ID for future commands.`
      );
      return "success";
    } catch (err) {
      console.error(
        `Exception during setServoId for current ID ${currentServoId}:`,
        err
      );
      if (unlocked) {
        const idToLock = idWritten ? newServoId : currentServoId;
        console.warn(`Attempting to re-lock servo using ID ${idToLock}...`);
        await this.tryLockServo(idToLock);
      }
      throw new Error(
        `Failed to set servo ID from ${currentServoId} to ${newServoId}: ${err.message}`
      );
    }
  }
}

// For backward compatibility: keep a singleton instance
export const scsServoSDK = new ScsServoSDK();
