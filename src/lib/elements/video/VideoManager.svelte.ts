/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Video Manager - Multiple Video Instances
 * Manages multiple video instances, each with their own streaming state
 */

import { video as videoClient } from '@robohub/transport-server-client';
import type { video as videoTypes } from '@robohub/transport-server-client';
import { generateName } from "$lib/utils/generateName";
import type { Positionable, Position3D } from '$lib/types/positionable';
import { positionManager } from '$lib/utils/positionManager';
import { settings } from '$lib/runes/settings.svelte';

/**
 * Individual video instance state
 */
export class VideoInstance implements Positionable {
	public id: string;
	public name: string;
	
	// Input state (what this video is viewing)
	input = $state({
		type: null as 'local-camera' | 'remote-stream' | null,
		stream: null as MediaStream | null,
		client: null as videoTypes.VideoConsumer | null,
		roomId: null as string | null,
		// Connection lifecycle state
		connectionState: 'disconnected' as 'disconnected' | 'connecting' | 'connected' | 'prepared' | 'paused',
		preparedRoomId: null as string | null,
		// Connection policy - determines if connection should persist or can be paused
		connectionPolicy: 'persistent' as 'persistent' | 'lazy',
	});

	// Output state (what this video is broadcasting)
	output = $state({
		active: false,
		client: null as videoTypes.VideoProducer | null,
		roomId: null as string | null,
	});

	// Position (reactive and bindable)
	position = $state<Position3D>({ x: 0, y: 0, z: 0 });
	
	constructor(id: string, name?: string) {
		this.id = id;
		this.name = name || `Video ${id}`;
	}

	/**
	 * Update position (implements Positionable interface)
	 */
	updatePosition(newPosition: Position3D): void {
		this.position = { ...newPosition };
	}

	// Derived state - simplified to prevent reactive loops
	get hasInput(): boolean {
		return this.input.type !== null && this.input.stream !== null;
	}

	get hasOutput(): boolean {
		return this.output.active;
	}

	get canOutput(): boolean {
		// Can only output if input is local camera (not remote stream)
		return this.input.type === 'local-camera' && this.input.stream !== null;
	}

	get currentStream(): MediaStream | null {
		return this.input.stream;
	}

	get status() {
		// Return a stable object reference to prevent infinite loops
		// Only create new object when values actually change
		const hasInput = this.hasInput;
		const hasOutput = this.hasOutput;
		const inputType = this.input.type;
		const outputRoomId = this.output.roomId;
		const inputRoomId = this.input.roomId;
		const connectionState = this.input.connectionState;
		const preparedRoomId = this.input.preparedRoomId;
		const connectionPolicy = this.input.connectionPolicy;
		const canActivate = (connectionState === 'prepared' || connectionState === 'paused') && preparedRoomId !== null;
		const canPause = connectionState === 'connected' && connectionPolicy === 'lazy';

		return {
			id: this.id,
			name: this.name,
			hasInput,
			hasOutput,
			inputType,
			outputRoomId,
			inputRoomId,
			connectionState,
			preparedRoomId,
			connectionPolicy,
			canActivate,
			canPause,
		};
	}
}

/**
 * Video status information for UI components
 */
export interface VideoStatus {
	id: string;
	name: string;
	hasInput: boolean;
	hasOutput: boolean;
	inputType: 'local-camera' | 'remote-stream' | null;
	outputRoomId: string | null;
	inputRoomId: string | null;
	connectionState: 'disconnected' | 'connecting' | 'connected' | 'prepared' | 'paused';
	preparedRoomId: string | null;
	connectionPolicy: 'persistent' | 'lazy';
	canActivate: boolean;
	canPause: boolean;
}

/**
 * Central manager for all video instances
 */
export class VideoManager {
	private _videos = $state<VideoInstance[]>([]);

	// Room listing state (shared across all videos) - using transport server
	rooms = $state<videoTypes.RoomInfo[]>([]);
	roomsLoading = $state(false);

	// Reactive getters - simplified to prevent loops
	get videos(): VideoInstance[] {
		return this._videos;
	}

	get videosWithInput(): VideoInstance[] {
		return this._videos.filter((video) => video.hasInput);
	}

	get videosWithOutput(): VideoInstance[] {
		return this._videos.filter((video) => video.hasOutput);
	}

	/**
	 * Create a new video instance
	 */
	createVideo(id?: string, name?: string, position?: Position3D): VideoInstance {
		const videoId = id || generateName();
		
		// Check if video already exists
		if (this._videos.find((v) => v.id === videoId)) {
			throw new Error(`Video with ID ${videoId} already exists`);
		}

		// Create video instance
		const video = new VideoInstance(videoId, name);

		// Set position (from position manager if not provided)
		video.position = position || positionManager.getNextPosition();

		// Add to reactive array
		this._videos.push(video);

		console.log(`Created video ${videoId} at position (${video.position.x.toFixed(1)}, ${video.position.y.toFixed(1)}, ${video.position.z.toFixed(1)}). Total videos: ${this._videos.length}`);

		return video;
	}

	/**
	 * Get video by ID
	 */
	getVideo(id: string): VideoInstance | undefined {
		return this._videos.find((v) => v.id === id);
	}

	/**
	 * Get video status by ID
	 */
	getVideoStatus(id: string): VideoStatus | undefined {
		const video = this.getVideo(id);
		return video?.status;
	}

	/**
	 * Remove a video
	 */
	async removeVideo(id: string): Promise<void> {
		const videoIndex = this._videos.findIndex((v) => v.id === id);
		if (videoIndex === -1) return;

		const video = this._videos[videoIndex];

		// Clean up video resources
		await this.disconnectVideoInput(id);
		await this.stopVideoOutput(id);

		// Remove from reactive array
		this._videos.splice(videoIndex, 1);

		console.log(`Removed video ${id}. Remaining videos: ${this._videos.length}`);
	}

	// ============= ROOM MANAGEMENT =============

	async listRooms(workspaceId: string): Promise<videoTypes.RoomInfo[]> {
		this.roomsLoading = true;
		try {
			const client = new videoClient.VideoClientCore(settings.transportServerUrl);
			const rooms = await client.listRooms(workspaceId);
			this.rooms = rooms;
			return rooms;
		} catch (error) {
			console.error('Failed to list rooms:', error);
			this.rooms = [];
			return [];
		} finally {
			this.roomsLoading = false;
		}
	}

	async refreshRooms(workspaceId: string): Promise<void> {
		await this.listRooms(workspaceId);
	}

	async createVideoRoom(workspaceId: string, roomId?: string): Promise<{ success: boolean; roomId?: string; error?: string }> {
		try {
			const client = new videoClient.VideoClientCore(settings.transportServerUrl);
			const result = await client.createRoom(workspaceId, roomId);
			// Refresh rooms list to include the new room
			await this.refreshRooms(workspaceId);
			return { success: true, roomId: result.roomId };
		} catch (error) {
			console.error('Failed to create video room:', error);
			return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
		}
	}

	generateRoomId(videoId: string): string {
		return `${videoId}-${generateName()}`;
	}

	/**
	 * Start video output to an existing room
	 */
	async startVideoOutputToRoom(workspaceId: string, videoId: string, roomId: string): Promise<{ success: boolean; error?: string }> {
		const video = this.getVideo(videoId);
		if (!video) {
			return { success: false, error: `Video ${videoId} not found` };
		}

		if (!video.canOutput) {
			return { success: false, error: 'Cannot output - input must be local camera' };
		}

		try {
			const producer = new videoClient.VideoProducer(settings.transportServerUrl);
			const connected = await producer.connect(workspaceId, roomId, 'producer-id');
			
			if (!connected) {
				throw new Error('Failed to connect to room');
			}

			// Start camera streaming - VideoProducer creates its own stream
			await producer.startCamera({
				video: { width: 1280, height: 720 },
				audio: true
			});

			// Update output state
			video.output.active = true;
			video.output.client = producer;
			video.output.roomId = roomId;

			console.log(`Video output started to room ${roomId} for video ${videoId}`);
			return { success: true };
		} catch (error) {
			console.error(`Failed to start video output for ${videoId}:`, error);
			return { success: false, error: error instanceof Error ? error.message : String(error) };
		}
	}

	/**
	 * Create a new room and start video output as producer
	 */
	async startVideoOutputAsProducer(workspaceId: string, videoId: string, roomId?: string): Promise<{ success: boolean; roomId?: string; error?: string }> {
		try {
			// Create room first if roomId provided, otherwise generate one
			const finalRoomId = roomId || this.generateRoomId(videoId);
			const createResult = await this.createVideoRoom(workspaceId, finalRoomId);
			
			if (!createResult.success) {
				return createResult;
			}

			// Start output to the new room
			const outputResult = await this.startVideoOutputToRoom(workspaceId, videoId, createResult.roomId!);
			
			if (!outputResult.success) {
				return { success: false, error: outputResult.error };
			}

			return { success: true, roomId: createResult.roomId };
		} catch (error) {
			return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
		}
	}

	// ============= INPUT MANAGEMENT =============

	/**
	 * Prepare a remote stream connection (stores roomId without connecting)
	 */
	prepareRemoteStream(videoId: string, roomId: string, policy: 'persistent' | 'lazy' = 'lazy'): { success: boolean; error?: string } {
		const video = this.getVideo(videoId);
		if (!video) {
			return { success: false, error: `Video ${videoId} not found` };
		}

		video.input.preparedRoomId = roomId;
		video.input.connectionState = 'prepared';
		video.input.connectionPolicy = policy;
		console.log(`Prepared remote stream for video ${videoId}, roomId: ${roomId}, policy: ${policy}`);
		return { success: true };
	}

	/**
	 * Activate a prepared or paused remote stream connection
	 */
	async activateRemoteStream(videoId: string, workspaceId: string): Promise<{ success: boolean; error?: string }> {
		const video = this.getVideo(videoId);
		if (!video) {
			return { success: false, error: `Video ${videoId} not found` };
		}

		if (!video.input.preparedRoomId) {
			return { success: false, error: 'No prepared room ID to activate' };
		}

		return await this.connectRemoteStream(workspaceId, videoId, video.input.preparedRoomId, video.input.connectionPolicy);
	}

	/**
	 * Pause a remote stream connection (keeps roomId for later activation)
	 */
	async pauseRemoteStream(videoId: string): Promise<void> {
		const video = this.getVideo(videoId);
		if (!video || video.input.type !== 'remote-stream') return;

		// Store the current roomId for later activation
		if (video.input.roomId && !video.input.preparedRoomId) {
			video.input.preparedRoomId = video.input.roomId;
		}

		// Disconnect but keep prepared connection info
		if (video.input.client) {
			video.input.client.disconnect();
		}
		
		video.input.type = null;
		video.input.stream = null;
		video.input.client = null;
		video.input.roomId = null;
		video.input.connectionState = 'paused';

		console.log(`Paused remote stream for video ${videoId}, can activate later`);
	}

	async connectLocalCamera(videoId: string): Promise<{ success: boolean; error?: string }> {
		const video = this.getVideo(videoId);
		if (!video) {
			return { success: false, error: `Video ${videoId} not found` };
		}

		try {
			// First disconnect any existing input to avoid conflicts
			await this.disconnectVideoInput(videoId);

			// Get local camera stream
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { width: 1280, height: 720 },
				audio: true
			});

			// Update input state atomically to prevent reactive loops
			video.input.type = 'local-camera';
			video.input.stream = stream;
			video.input.client = null;
			video.input.roomId = null;
			video.input.connectionState = 'connected';
			video.input.preparedRoomId = null;
			video.input.connectionPolicy = 'persistent';

			console.log(`Local camera connected to video ${videoId}`);
			return { success: true };
		} catch (error) {
			console.error(`Failed to connect local camera to video ${videoId}:`, error);
			// Ensure clean state on error
			video.input.connectionState = 'disconnected';
			return { success: false, error: error instanceof Error ? error.message : String(error) };
		}
	}

	async connectRemoteStream(workspaceId: string, videoId: string, roomId: string, policy: 'persistent' | 'lazy' = 'persistent'): Promise<{ success: boolean; error?: string }> {
		const video = this.getVideo(videoId);
		if (!video) {
			return { success: false, error: `Video ${videoId} not found` };
		}

		try {
			// First disconnect any existing input
			await this.disconnectVideoInput(videoId);

			// Update connection state
			video.input.connectionState = 'connecting';

			const consumer = new videoClient.VideoConsumer(settings.transportServerUrl);
			const connected = await consumer.connect(workspaceId, roomId, 'consumer-id');
			
			if (!connected) {
				throw new Error('Failed to connect to remote stream');
			}

			// Start receiving video
			await consumer.startReceiving();

			// Set up stream receiving
			consumer.on('streamReceived', (stream: MediaStream) => {
				video.input.stream = stream;
			});

			// Update input state
			video.input.type = 'remote-stream';
			video.input.client = consumer;
			video.input.roomId = roomId;
			video.input.preparedRoomId = null; // Clear prepared since we're now connected
			video.input.connectionState = 'connected';
			video.input.connectionPolicy = policy;

			console.log(`Remote stream connected to video ${videoId} with policy ${policy}`);
			return { success: true };
		} catch (error) {
			console.error(`Failed to connect remote stream to video ${videoId}:`, error);
			return { success: false, error: error instanceof Error ? error.message : String(error) };
		}
	}

	async disconnectVideoInput(videoId: string): Promise<void> {
		const video = this.getVideo(videoId);
		if (!video) {
			console.warn(`Video ${videoId} not found for disconnection`);
			return;
		}

		console.log(`Disconnecting input from video ${videoId}, current type: ${video.input.type}`);

		try {
			// Stop local camera tracks if any
			if (video.input.stream && video.input.type === 'local-camera') {
				console.log(`Stopping ${video.input.stream.getTracks().length} camera tracks`);
				video.input.stream.getTracks().forEach(track => {
					console.log(`Stopping track: ${track.kind} (${track.label})`);
					track.stop();
				});
			}

			// Disconnect remote client if any
			if (video.input.client) {
				console.log(`Disconnecting remote client for video ${videoId}`);
				video.input.client.disconnect();
			}

			// Reset input state atomically
			video.input.type = null;
			video.input.stream = null;
			video.input.client = null;
			video.input.roomId = null;
			video.input.connectionState = 'disconnected';
			video.input.preparedRoomId = null;
			video.input.connectionPolicy = 'persistent';

			console.log(`Input successfully disconnected from video ${videoId}`);
		} catch (error) {
			console.error(`Error during disconnection for video ${videoId}:`, error);
			// Still reset the state even if there was an error
			video.input.type = null;
			video.input.stream = null;
			video.input.client = null;
			video.input.roomId = null;
			video.input.connectionState = 'disconnected';
			video.input.preparedRoomId = null;
			video.input.connectionPolicy = 'persistent';
			throw error;
		}
	}

	// ============= OUTPUT MANAGEMENT =============

	async startVideoOutput(workspaceId: string, videoId: string): Promise<{ success: boolean; error?: string; roomId?: string }> {
		const video = this.getVideo(videoId);
		if (!video) {
			return { success: false, error: `Video ${videoId} not found` };
		}

		if (!video.canOutput) {
			return { success: false, error: 'Cannot output - input must be local camera' };
		}

		try {
			const producer = new videoClient.VideoProducer(settings.transportServerUrl);
			
			// Create room
			const result = await producer.createRoom(workspaceId);
			const connected = await producer.connect(result.workspaceId, result.roomId, 'producer-id');
			
			if (!connected) {
				throw new Error('Failed to connect producer');
			}

			// Start camera with existing stream
			if (video.input.stream) {
				await producer.startCamera({
					video: { width: 1280, height: 720 },
					audio: true
				});
			}

			// Update output state
			video.output.active = true;
			video.output.client = producer;
			video.output.roomId = result.roomId;

			// Refresh room list
			await this.listRooms(workspaceId);

			console.log(`Output started for video ${videoId}, room created: ${result.roomId}`);
			return { success: true, roomId: result.roomId };
		} catch (error) {
			console.error(`Failed to start output for video ${videoId}:`, error);
			return { success: false, error: error instanceof Error ? error.message : String(error) };
		}
	}

	async stopVideoOutput(videoId: string): Promise<void> {
		const video = this.getVideo(videoId);
		if (!video) return;

		if (video.output.client) {
			video.output.client.stopStreaming();
			video.output.client.disconnect();
		}

		video.output.active = false;
		video.output.client = null;
		video.output.roomId = null;

		console.log(`Output stopped for video ${videoId}`);
	}

	/**
	 * Clean up all videos
	 */
	async destroy(): Promise<void> {
		const cleanupPromises = this._videos.map(async (video) => {
			await this.disconnectVideoInput(video.id);
			await this.stopVideoOutput(video.id);
		});
		await Promise.allSettled(cleanupPromises);
		this._videos.length = 0;
	}
}

// Global video manager instance
export const videoManager = new VideoManager(); 