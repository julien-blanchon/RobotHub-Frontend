/**
 * Base Sensor Driver Interfaces
 *
 * Core contracts that all sensor driver implementations must follow
 */

import type { ConnectionStatus, StatusChangeCallback, UnsubscribeFn } from "./core.js";

/**
 * Base sensor driver interface - common functionality for all sensor drivers
 */
export interface BaseSensorDriver {
	readonly id: string;
	readonly type: "producer" | "consumer";
	readonly name: string;
	readonly status: ConnectionStatus;

	connect(): Promise<void>;
	disconnect(): Promise<void>;
	onStatusChange(callback: StatusChangeCallback): UnsubscribeFn;
} 