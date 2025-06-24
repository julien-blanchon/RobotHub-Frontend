// Centralized Robot Communication & Performance Configuration
// Single source of truth for all timing and communication parameters

export const ROBOT_CONFIG = {
  // USB Communication Settings
  usb: {
    baudRate: 1000000,
    servoWriteDelay: 8,             // ms between servo writes (optimized from 10ms)
    maxRetries: 3,                  // max retry attempts for failed operations
    retryDelay: 100,                // ms between retries
    connectionTimeout: 5000,        // ms for connection timeout
    readTimeout: 200,               // ms for individual servo reads
  },

  // Polling & Update Frequencies  
  polling: {
    uiUpdateRate: 100,              // ms (10Hz) - UI state updates
    consumerPollingRate: 40,        // ms (25Hz) - USB consumer polling (optimized from 50ms)
    calibrationPollingRate: 16,     // ms (60Hz) - calibration polling (needs to be fast)
    errorBackoffRate: 200,          // ms - delay after polling errors
    maxPollingErrors: 5,            // max consecutive errors before longer backoff
  },

  // Command Processing
  commands: {
    dedupWindow: 16,                // ms - skip duplicate commands within this window
    maxQueueSize: 50,               // max pending commands before dropping old ones
    batchSize: 6,                   // max servos to process in parallel batches
  },

  // Remote Connection Settings
  remote: {
    reconnectDelay: 2000,       // ms between reconnection attempts
    heartbeatInterval: 30000,   // ms for connection health check
    messageTimeout: 5000,       // ms for message response timeout
  },

  // Calibration Settings
  calibration: {
    minRangeThreshold: 500,     // minimum servo range for valid calibration
    progressUpdateRate: 100,    // ms between progress updates
    finalPositionTimeout: 2000, // ms timeout for reading final positions
  },

  // Performance Tuning
  performance: {
    jointUpdateThreshold: 0.5,      // min change to trigger joint update
    uiUpdateThreshold: 0.1,         // min change to trigger UI update
    maxConcurrentReads: 3,          // max concurrent servo reads
    memoryCleanupInterval: 30000,   // ms - periodic cleanup interval
  }
} as const;

// Type exports for better IntelliSense
export type RobotConfig = typeof ROBOT_CONFIG; 