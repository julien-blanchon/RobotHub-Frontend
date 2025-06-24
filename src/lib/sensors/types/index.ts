/**
 * Sensor Driver Types - Main Export
 *
 * Central export point for all sensor driver types and interfaces
 */

// Core types
export type {
	ConnectionStatus,
	SensorFrame,
	VideoStreamConfig,
	SensorStream,
	StreamUpdateCallback,
	FrameCallback,
	StatusChangeCallback,
	ErrorCallback,
	UnsubscribeFn
} from "./core.js";

// Base interfaces
export type { BaseSensorDriver } from "./base.js";

// Producer drivers
export type {
	ProducerSensorDriver,
	MediaRecorderProducerConfig,
	NetworkStreamProducerConfig,
	ProducerSensorDriverConfig
} from "./producer.js";

// Consumer drivers
export type {
	ConsumerSensorDriver,
	RemoteServerConsumerConfig,
	LocalStorageConsumerConfig,
	ConsumerSensorDriverConfig
} from "./consumer.js"; 