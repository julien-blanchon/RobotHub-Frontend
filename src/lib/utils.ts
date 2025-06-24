import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChild<T> = T extends { child?: any } ? Omit<T, "child"> : T;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WithoutChildren<T> = T extends { children?: any } ? Omit<T, "children"> : T;
export type WithoutChildrenOrChild<T> = WithoutChildren<WithoutChild<T>>;
export type WithElementRef<T, U extends HTMLElement = HTMLElement> = T & { ref?: U | null };


// === Servo Position and Angle Conversion Functions ===

/**
 * Converts a servo position to an angle in degrees
 *
 * Servo positions range from 0 to 4096, representing a full 360° rotation.
 * This function maps the position to its corresponding angle.
 *
 * @param position - The servo position (0 to 4096)
 * @returns The corresponding angle (0 to 360 degrees)
 *
 * @example
 * servoPositionToAngle(0)    // Returns: 0
 * servoPositionToAngle(2048) // Returns: 180
 * servoPositionToAngle(4096) // Returns: 360
 */
export function servoPositionToAngle(position: number): number {
	return (position / 4096) * 360;
}

/**
 * Converts degrees to a servo position
 *
 * Maps angle in degrees to the corresponding servo position value.
 * Clamps the result to the valid servo range (0-4096).
 *
 * @param degrees - The angle in degrees (0 to 360)
 * @returns The corresponding servo position (0 to 4096)
 *
 * @example
 * degreesToServoPosition(0)   // Returns: 0
 * degreesToServoPosition(180) // Returns: 2048
 * degreesToServoPosition(360) // Returns: 4096
 */
export function degreesToServoPosition(degrees: number): number {
	return Math.min(Math.round((degrees * 4096) / 360), 4096);
}

// === Angle Unit Conversion Functions ===

/**
 * Converts radians to degrees
 *
 * @param radians - The angle in radians
 * @returns The angle in degrees
 *
 * @example
 * radiansToDegrees(Math.PI)     // Returns: 180
 * radiansToDegrees(Math.PI / 2) // Returns: 90
 */
export function radiansToDegrees(radians: number): number {
	return (radians * 180) / Math.PI;
}

/**
 * Converts degrees to radians
 *
 * @param degrees - The angle in degrees
 * @returns The angle in radians
 *
 * @example
 * degreesToRadians(180) // Returns: Math.PI
 * degreesToRadians(90)  // Returns: Math.PI / 2
 */
export function degreesToRadians(degrees: number): number {
	return (degrees * Math.PI) / 180;
}

/**
 * Converts radians to a servo position
 *
 * Combines radian-to-degree conversion with servo position mapping.
 * Useful for direct conversion from joint angles to servo commands.
 *
 * @param radians - The angle in radians
 * @returns The corresponding servo position (0 to 4096)
 *
 * @example
 * radiansToServoPosition(0)         // Returns: 0
 * radiansToServoPosition(Math.PI)   // Returns: 2048
 * radiansToServoPosition(2*Math.PI) // Returns: 4096
 */
export function radiansToServoPosition(radians: number): number {
	return Math.min(Math.round((radians * 4096) / (2 * Math.PI)), 4096);
}
