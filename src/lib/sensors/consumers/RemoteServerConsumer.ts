import type {
	ConsumerSensorDriver,
	ConnectionStatus,
	SensorFrame,
	SensorStream,
	RemoteServerConsumerConfig,
	FrameCallback,
	StreamUpdateCallback,
	StatusChangeCallback,
	UnsubscribeFn
} from "../types/index.js";

/**
 * Remote Server Consumer Driver
 * 
 * Sends video frames to a remote Python server using WebSocket.
 * Simplified with best practices - uses WebSocket only for optimal performance.
 */
export class RemoteServerConsumer implements ConsumerSensorDriver {
	readonly type = "consumer" as const;
	readonly id: string;
	readonly name: string;

	private _status: ConnectionStatus = { isConnected: false };
	private config: RemoteServerConsumerConfig;

	// Connection management
	private websocket: WebSocket | null = null;
	private reconnectAttempts = 0;
	private reconnectTimer?: Timer;

	// Stream management
	private activeOutputStreams = new Map<string, SensorStream>();
	private sendQueue: SensorFrame[] = [];
	private isSending = false;

	// Event callbacks
	private frameSentCallbacks: FrameCallback[] = [];
	private streamUpdateCallbacks: StreamUpdateCallback[] = [];
	private statusCallbacks: StatusChangeCallback[] = [];

	constructor(config: RemoteServerConsumerConfig) {
		this.config = config;
		this.id = `remote-server-consumer-${Date.now()}`;
		this.name = `Remote Server Consumer (${config.url})`;

		console.log("📡 Created RemoteServer consumer driver for:", config.url);
	}

	get status(): ConnectionStatus {
		return this._status;
	}

	async connect(): Promise<void> {
		console.log("📡 Connecting to remote server...", this.config.url);

		try {
			await this.connectWebSocket();

			this._status = {
				isConnected: true,
				lastConnected: new Date(),
				error: undefined
			};
			this.notifyStatusChange();

			console.log("✅ Remote server consumer connected successfully");
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
		console.log("📡 Disconnecting from remote server...");

		// Clear reconnect timer
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = undefined;
		}

		// Close WebSocket
		if (this.websocket) {
			this.websocket.close();
			this.websocket = null;
		}

		// Clear send queue
		this.sendQueue = [];
		this.isSending = false;

		this._status = { isConnected: false };
		this.notifyStatusChange();

		console.log("✅ Remote server consumer disconnected");
	}

	async sendFrame(frame: SensorFrame): Promise<void> {
		if (!this._status.isConnected) {
			throw new Error("Cannot send frame: consumer not connected");
		}

		// Add to send queue
		this.sendQueue.push(frame);

		// Process queue if not already sending
		if (!this.isSending) {
			await this.processSendQueue();
		}
	}

	async sendFrames(frames: SensorFrame[]): Promise<void> {
		if (!this._status.isConnected) {
			throw new Error("Cannot send frames: consumer not connected");
		}

		// Add all frames to queue
		this.sendQueue.push(...frames);

		// Process queue if not already sending
		if (!this.isSending) {
			await this.processSendQueue();
		}
	}

	async startOutputStream(stream: SensorStream): Promise<void> {
		console.log("📡 Starting output stream:", stream.id);

		this.activeOutputStreams.set(stream.id, stream);
		this.notifyStreamUpdate(stream);

		// Send stream start message to server
		await this.sendControlMessage({
			type: "stream_start",
			streamId: stream.id,
			streamConfig: stream.config
		});
	}

	async stopOutputStream(streamId: string): Promise<void> {
		console.log("📡 Stopping output stream:", streamId);

		const stream = this.activeOutputStreams.get(streamId);
		if (stream) {
			stream.active = false;
			stream.endTime = new Date();
			this.activeOutputStreams.delete(streamId);
			this.notifyStreamUpdate(stream);

			// Send stream stop message to server
			await this.sendControlMessage({
				type: "stream_stop",
				streamId
			});
		}
	}

	getActiveOutputStreams(): SensorStream[] {
		return Array.from(this.activeOutputStreams.values());
	}

	// Event subscription methods
	onFrameSent(callback: FrameCallback): UnsubscribeFn {
		this.frameSentCallbacks.push(callback);
		return () => {
			const index = this.frameSentCallbacks.indexOf(callback);
			if (index >= 0) {
				this.frameSentCallbacks.splice(index, 1);
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

	// Private connection methods
	private async connectWebSocket(): Promise<void> {
		return new Promise((resolve, reject) => {
			const wsUrl = this.config.url.replace(/^http/, "ws") + "/video-stream";
			
			this.websocket = new WebSocket(wsUrl);
			this.websocket.binaryType = "arraybuffer";
			
			this.websocket.onopen = () => {
				console.log("✅ WebSocket connected to remote server");
				this.reconnectAttempts = 0;
				resolve();
			};

			this.websocket.onclose = (event) => {
				console.log("🔌 WebSocket disconnected:", event.code, event.reason);
				this.handleConnectionLoss();
			};

			this.websocket.onerror = (error) => {
				console.error("❌ WebSocket error:", error);
				reject(new Error("WebSocket connection failed"));
			};

			this.websocket.onmessage = (event) => {
				this.handleServerMessage(event.data);
			};
		});
	}

	private async processSendQueue(): Promise<void> {
		if (this.isSending || this.sendQueue.length === 0) {
			return;
		}

		this.isSending = true;

		try {
			while (this.sendQueue.length > 0) {
				const frame = this.sendQueue.shift()!;
				await this.transmitFrame(frame);
				this.notifyFrameSent(frame);
			}
		} catch (error) {
			console.error("❌ Error processing send queue:", error);
			this._status.error = `Send error: ${error}`;
			this.notifyStatusChange();
		} finally {
			this.isSending = false;
		}
	}

	private async transmitFrame(frame: SensorFrame): Promise<void> {
		if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
			throw new Error("WebSocket not available for transmission");
		}

		// Prepare metadata header
		const header = JSON.stringify({
			type: "video_frame",
			timestamp: frame.timestamp,
			frameType: frame.type,
			metadata: frame.metadata,
			streamId: this.config.streamId
		});

		const headerBuffer = new TextEncoder().encode(header);
		const headerLengthBuffer = new Uint32Array([headerBuffer.length]).buffer; // 4-byte length prefix

		let dataBuffer: ArrayBuffer;
		if (frame.data instanceof Blob) {
			dataBuffer = await frame.data.arrayBuffer();
		} else {
			dataBuffer = frame.data as ArrayBuffer;
		}

		// Concatenate: [length][header][data]
		const packet = new Uint8Array(headerLengthBuffer.byteLength + headerBuffer.byteLength + dataBuffer.byteLength);
		packet.set(new Uint8Array(headerLengthBuffer), 0);
		packet.set(new Uint8Array(headerBuffer), headerLengthBuffer.byteLength);
		packet.set(new Uint8Array(dataBuffer), headerLengthBuffer.byteLength + headerBuffer.byteLength);

		this.websocket.send(packet.buffer);
	}

	private async sendControlMessage(message: Record<string, unknown>): Promise<void> {
		if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
			this.websocket.send(JSON.stringify(message));
		}
	}

	private handleServerMessage(data: string | ArrayBuffer): void {
		try {
			const message = typeof data === "string" ? JSON.parse(data) : data;
			console.log("📨 Received server message:", message);
			
			// Handle server responses, status updates, etc.
			if (message.type === "status") {
				this._status.bitrate = message.bitrate;
				this._status.frameRate = message.frameRate;
				this.notifyStatusChange();
			}
		} catch (error) {
			console.error("❌ Error parsing server message:", error);
		}
	}

	private handleConnectionLoss(): void {
		this._status.isConnected = false;
		this._status.error = "Connection lost";
		this.notifyStatusChange();

		// Attempt reconnection
		const maxRetries = this.config.retryAttempts || 5;
		const retryDelay = this.config.retryDelay || 2000;

		if (this.reconnectAttempts < maxRetries) {
			this.reconnectAttempts++;
			console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${maxRetries} in ${retryDelay}ms`);
			
			this.reconnectTimer = setTimeout(async () => {
				try {
					await this.connect();
				} catch (error) {
					console.error("❌ Reconnection failed:", error);
				}
			}, retryDelay);
		} else {
			console.error("❌ Max reconnection attempts reached");
		}
	}

	private notifyFrameSent(frame: SensorFrame): void {
		this.frameSentCallbacks.forEach((callback) => {
			try {
				callback(frame);
			} catch (error) {
				console.error("Error in frame sent callback:", error);
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