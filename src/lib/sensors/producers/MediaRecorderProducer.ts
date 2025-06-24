import type {
	ProducerSensorDriver,
	ConnectionStatus,
	SensorFrame,
	SensorStream,
	VideoStreamConfig,
	MediaRecorderProducerConfig,
	FrameCallback,
	StreamUpdateCallback,
	StatusChangeCallback,
	UnsubscribeFn
} from "../types/index.js";

/**
 * MediaRecorder Producer Driver
 * 
 * Captures video/audio from browser MediaDevices using MediaRecorder API.
 * Simplified with best practices - uses WebM format and optimized settings.
 */
export class MediaRecorderProducer implements ProducerSensorDriver {
	readonly type = "producer" as const;
	readonly id: string;
	readonly name: string;

	private _status: ConnectionStatus = { isConnected: false };
	private config: MediaRecorderProducerConfig;

	// MediaRecorder state
	private mediaStream: MediaStream | null = null;
	private mediaRecorder: MediaRecorder | null = null;
	private recordingDataChunks: Blob[] = [];

	// Stream management
	private activeStreams = new Map<string, SensorStream>();

	// Event callbacks
	private frameCallbacks: FrameCallback[] = [];
	private streamUpdateCallbacks: StreamUpdateCallback[] = [];
	private statusCallbacks: StatusChangeCallback[] = [];

	constructor(config: MediaRecorderProducerConfig) {
		this.config = config;
		this.id = `media-recorder-${Date.now()}`;
		this.name = "MediaRecorder Producer";

		console.log("🎥 Created MediaRecorder producer driver");
	}

	get status(): ConnectionStatus {
		return this._status;
	}

	async connect(): Promise<void> {
		console.log("🎥 Connecting MediaRecorder producer...");

		try {
			// Check if browser supports MediaRecorder
			if (!MediaRecorder.isTypeSupported) {
				throw new Error("MediaRecorder not supported in this browser");
			}

			// Test basic media access
			const testStream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: true
			});
			
			// Close test stream immediately
			testStream.getTracks().forEach(track => track.stop());

			this._status = {
				isConnected: true,
				lastConnected: new Date(),
				error: undefined
			};
			this.notifyStatusChange();

			console.log("✅ MediaRecorder producer connected successfully");
		} catch (error) {
			this._status = {
				isConnected: false,
				error: `Connection failed: ${error}`
			};
			this.notifyStatusChange();
			throw error;
		}
	}

	async disconnect(): Promise<void> {
		console.log("🎥 Disconnecting MediaRecorder producer...");

		// Stop all active streams
		for (const streamId of this.activeStreams.keys()) {
			await this.stopStream(streamId);
		}

		this._status = { isConnected: false };
		this.notifyStatusChange();

		console.log("✅ MediaRecorder producer disconnected");
	}

	async startStream(config: VideoStreamConfig): Promise<SensorStream> {
		if (!this._status.isConnected) {
			throw new Error("Cannot start stream: producer not connected");
		}

		console.log("🎥 Starting MediaRecorder stream...", config);

		try {
			// Prepare media constraints with best practices
			const constraints: MediaStreamConstraints = {
				video: {
					width: config.width || 1280,
					height: config.height || 720,
					frameRate: config.frameRate || 30,
					facingMode: config.facingMode || "user",
					...(config.deviceId && { deviceId: config.deviceId })
				},
				audio: true,
				...this.config.constraints
			};

			// Get media stream
			this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

			// Create MediaRecorder with optimized WebM settings
			const mimeType = this.getBestWebMType();
			this.mediaRecorder = new MediaRecorder(this.mediaStream, {
				mimeType,
				videoBitsPerSecond: this.config.videoBitsPerSecond || 2500000,
				audioBitsPerSecond: this.config.audioBitsPerSecond || 128000
			});

			// Create stream object
			const stream: SensorStream = {
				id: `stream-${Date.now()}`,
				name: `MediaRecorder Stream ${config.width}x${config.height}`,
				type: "video",
				config,
				active: true,
				startTime: new Date(),
				totalFrames: 0
			};

			this.activeStreams.set(stream.id, stream);

			// Set up MediaRecorder event handlers
			this.setupMediaRecorderEvents(stream);

			// Start recording with optimized interval
			const recordingInterval = this.config.recordingInterval || 100;
			this.mediaRecorder.start(recordingInterval);

			// Update status with stream info
			this._status.frameRate = config.frameRate;
			this._status.bitrate = this.config.videoBitsPerSecond;
			this.notifyStatusChange();

			this.notifyStreamUpdate(stream);

			console.log(`✅ MediaRecorder stream started: ${stream.id}`);
			return stream;

		} catch (error) {
			console.error("❌ Failed to start MediaRecorder stream:", error);
			throw error;
		}
	}

	async stopStream(streamId: string): Promise<void> {
		console.log(`🎥 Stopping MediaRecorder stream: ${streamId}`);

		const stream = this.activeStreams.get(streamId);
		if (!stream) {
			throw new Error(`Stream not found: ${streamId}`);
		}

		try {
			// Stop MediaRecorder
			if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
				this.mediaRecorder.stop();
			}

			// Stop media stream tracks
			if (this.mediaStream) {
				this.mediaStream.getTracks().forEach(track => track.stop());
				this.mediaStream = null;
			}

			// Update stream
			stream.active = false;
			stream.endTime = new Date();

			this.activeStreams.delete(streamId);
			this.notifyStreamUpdate(stream);

			console.log(`✅ MediaRecorder stream stopped: ${streamId}`);

		} catch (error) {
			console.error(`❌ Failed to stop stream ${streamId}:`, error);
			throw error;
		}
	}

	async pauseStream(streamId: string): Promise<void> {
		console.log(`⏸️ Pausing MediaRecorder stream: ${streamId}`);

		const stream = this.activeStreams.get(streamId);
		if (!stream) {
			throw new Error(`Stream not found: ${streamId}`);
		}

		if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
			this.mediaRecorder.pause();
			this.notifyStreamUpdate(stream);
		}
	}

	async resumeStream(streamId: string): Promise<void> {
		console.log(`▶️ Resuming MediaRecorder stream: ${streamId}`);

		const stream = this.activeStreams.get(streamId);
		if (!stream) {
			throw new Error(`Stream not found: ${streamId}`);
		}

		if (this.mediaRecorder && this.mediaRecorder.state === "paused") {
			this.mediaRecorder.resume();
			this.notifyStreamUpdate(stream);
		}
	}

	getActiveStreams(): SensorStream[] {
		return Array.from(this.activeStreams.values());
	}

	// Event subscription methods
	onFrame(callback: FrameCallback): UnsubscribeFn {
		this.frameCallbacks.push(callback);
		return () => {
			const index = this.frameCallbacks.indexOf(callback);
			if (index >= 0) {
				this.frameCallbacks.splice(index, 1);
			}
		};
	}

	onStreamUpdate(callback: StreamUpdateCallback): UnsubscribeFn {
		this.streamUpdateCallbacks.push(callback);
		return () => {
			const index = this.streamUpdateCallbacks.indexOf(callback);
			if (index >= 0) {
				this.streamUpdateCallbacks.splice(index, 1);
			}
		};
	}

	onStatusChange(callback: StatusChangeCallback): UnsubscribeFn {
		this.statusCallbacks.push(callback);
		return () => {
			const index = this.statusCallbacks.indexOf(callback);
			if (index >= 0) {
				this.statusCallbacks.splice(index, 1);
			}
		};
	}

	// Private helper methods
	private setupMediaRecorderEvents(stream: SensorStream): void {
		if (!this.mediaRecorder) return;

		this.mediaRecorder.ondataavailable = (event) => {
			if (event.data && event.data.size > 0) {
				this.recordingDataChunks.push(event.data);

				// Create frame from chunk
				const frame: SensorFrame = {
					timestamp: Date.now(),
					type: "video",
					data: event.data,
					metadata: {
						width: stream.config.width,
						height: stream.config.height,
						frameRate: stream.config.frameRate,
						codec: "webm",
						bitrate: this.config.videoBitsPerSecond
					}
				};

				// Update stream stats
				stream.totalFrames = (stream.totalFrames || 0) + 1;

				// Notify frame callbacks
				this.notifyFrame(frame);
			}
		};

		this.mediaRecorder.onstop = () => {
			console.log("🎥 MediaRecorder stopped");
			
			// Create final frame with complete recording
			if (this.recordingDataChunks.length > 0) {
				const finalBlob = new Blob(this.recordingDataChunks, {
					type: "video/webm"
				});

				const finalFrame: SensorFrame = {
					timestamp: Date.now(),
					type: "video", 
					data: finalBlob,
					metadata: {
						width: stream.config.width,
						height: stream.config.height,
						codec: "webm",
						isComplete: true,
						totalSize: finalBlob.size
					}
				};

				this.notifyFrame(finalFrame);
			}

			// Clear chunks
			this.recordingDataChunks = [];
		};

		this.mediaRecorder.onerror = (event) => {
			console.error("❌ MediaRecorder error:", event);
			this._status.error = "Recording error occurred";
			this.notifyStatusChange();
		};
	}

	private getBestWebMType(): string {
		// Best WebM types in order of preference
		const types = [
			"video/webm;codecs=vp9,opus",
			"video/webm;codecs=vp8,opus", 
			"video/webm"
		];

		for (const type of types) {
			if (MediaRecorder.isTypeSupported(type)) {
				return type;
			}
		}

		return "video/webm"; // Fallback
	}

	private notifyFrame(frame: SensorFrame): void {
		this.frameCallbacks.forEach((callback) => {
			try {
				callback(frame);
			} catch (error) {
				console.error("Error in frame callback:", error);
			}
		});
	}

	private notifyStreamUpdate(stream: SensorStream): void {
		this.streamUpdateCallbacks.forEach((callback) => {
			try {
				callback(stream);
			} catch (error) {
				console.error("Error in stream update callback:", error);
			}
		});
	}

	private notifyStatusChange(): void {
		this.statusCallbacks.forEach((callback) => {
			try {
				callback(this._status);
			} catch (error) {
				console.error("Error in status change callback:", error);
			}
		});
	}
} 