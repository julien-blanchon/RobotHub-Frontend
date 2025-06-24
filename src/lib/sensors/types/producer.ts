/**
 * Producer Sensor Driver Interfaces & Configurations
 *
 * Producer drivers capture sensor data (video, audio, etc.)
 * Examples: MediaRecorder, network stream
 */

import type { BaseSensorDriver } from "./base.js";
import type { 
	SensorStream, 
	VideoStreamConfig, 
	FrameCallback, 
	StreamUpdateCallback, 
	UnsubscribeFn 
} from "./core.js";

/**
 * Producer Driver - Captures sensor data from various sources
 */
export interface ProducerSensorDriver extends BaseSensorDriver {
	readonly type: "producer";

	// Stream management
	startStream(config: VideoStreamConfig): Promise<SensorStream>;
	stopStream(streamId: string): Promise<void>;
	pauseStream(streamId: string): Promise<void>;
	resumeStream(streamId: string): Promise<void>;
	getActiveStreams(): SensorStream[];

	// Event callbacks
	onFrame(callback: FrameCallback): UnsubscribeFn;
	onStreamUpdate(callback: StreamUpdateCallback): UnsubscribeFn;
}

/**
 * Producer driver configuration types - simplified with best practices
 */
export interface MediaRecorderProducerConfig {
	type: "media-recorder";
	constraints?: MediaStreamConstraints;
	videoBitsPerSecond?: number;
	audioBitsPerSecond?: number;
	recordingInterval?: number; // ms between frame captures
}

export interface NetworkStreamProducerConfig {
	type: "network-stream";
	url: string;
	credentials?: {
		username?: string;
		password?: string;
		token?: string;
	};
}

export type ProducerSensorDriverConfig =
	| MediaRecorderProducerConfig
	| NetworkStreamProducerConfig; 