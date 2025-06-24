/**
 * Consumer Sensor Driver Interfaces & Configurations
 *
 * Consumer drivers send sensor data to various destinations
 * Examples: Remote server, local storage
 */

import type { BaseSensorDriver } from "./base.js";
import type { 
	SensorFrame, 
	SensorStream, 
	FrameCallback, 
	StreamUpdateCallback, 
	UnsubscribeFn 
} from "./core.js";

/**
 * Consumer Driver - Sends sensor data to various destinations
 */
export interface ConsumerSensorDriver extends BaseSensorDriver {
	readonly type: "consumer";

	// Data transmission
	sendFrame(frame: SensorFrame): Promise<void>;
	sendFrames(frames: SensorFrame[]): Promise<void>;

	// Stream management
	startOutputStream(stream: SensorStream): Promise<void>;
	stopOutputStream(streamId: string): Promise<void>;
	getActiveOutputStreams(): SensorStream[];

	// Event callbacks
	onFrameSent(callback: FrameCallback): UnsubscribeFn;
	onStreamUpdate(callback: StreamUpdateCallback): UnsubscribeFn;
}

/**
 * Consumer driver configuration types - simplified with best practices
 */
export interface RemoteServerConsumerConfig {
	type: "remote-server";
	url: string;
	apiKey?: string;
	streamId?: string;
	retryAttempts?: number;
	retryDelay?: number;
}

export interface LocalStorageConsumerConfig {
	type: "local-storage";
	directory?: string;
	filename?: string;
	autoUpload?: boolean;
}

export type ConsumerSensorDriverConfig =
	| RemoteServerConsumerConfig
	| LocalStorageConsumerConfig; 