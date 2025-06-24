/**
 * Core Sensor Types
 *
 * Fundamental types and interfaces used across all sensor driver implementations
 */

export interface ConnectionStatus {
	isConnected: boolean;
	lastConnected?: Date;
	error?: string;
	bitrate?: number; // For video streams
	frameRate?: number; // For video streams
}

/**
 * Sensor data frame for video streams
 */
export interface SensorFrame {
	timestamp: number;
	type: "video" | "audio" | "data";
	data: ArrayBuffer | Blob;
	metadata?: {
		width?: number;
		height?: number;
		frameRate?: number;
		codec?: string;
		bitrate?: number;
		format?: string;
		[key: string]: unknown;
	};
}

/**
 * Video stream configuration
 */
export interface VideoStreamConfig {
	width?: number;
	height?: number;
	frameRate?: number;
	bitrate?: number;
	codec?: string;
	facingMode?: "user" | "environment";
	deviceId?: string;
}

/**
 * Sensor stream for continuous data flow
 */
export interface SensorStream {
	id: string;
	name: string;
	type: "video" | "audio" | "data";
	config: VideoStreamConfig;
	active: boolean;
	startTime?: Date;
	endTime?: Date;
	totalFrames?: number;
}

// Callback types
export type StreamUpdateCallback = (stream: SensorStream) => void;
export type FrameCallback = (frame: SensorFrame) => void;
export type StatusChangeCallback = (status: ConnectionStatus) => void;
export type ErrorCallback = (error: string) => void;
export type UnsubscribeFn = () => void; 