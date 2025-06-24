/**
 * Debug configuration for feetech.js
 * Set DEBUG_ENABLED to false to disable all console.log statements for performance
 */
export const DEBUG_ENABLED = true; // Set to true to enable debug logging

/**
 * Conditional logging function that respects the DEBUG_ENABLED flag
 * @param {...any} args - Arguments to log
 */
export const debugLog = (...args) => {
    if (DEBUG_ENABLED) {
        console.log(...args);
    }
}; 