/**
 * Video Streaming System - Input/Output Architecture
 * Clean separation between input sources and output destinations
 */

import { video } from '@robothub/transport-server-client';
import type { video as videoTypes } from '@robothub/transport-server-client';
import { settings } from '$lib/runes/settings.svelte';

// Input/Output state using runes
export class VideoStreamingState {
  // Input state (what you're viewing)
  input = $state({
    type: null as 'local-camera' | 'remote-stream' | null,
    stream: null as MediaStream | null,
    client: null as videoTypes.VideoConsumer | null,
    roomId: null as string | null,
  });

  // Output state (what you're broadcasting)
  output = $state({
    active: false,
    client: null as videoTypes.VideoProducer | null,
    roomId: null as string | null,
  });

  // Room listing state
  rooms = $state<videoTypes.RoomInfo[]>([]);
  roomsLoading = $state(false);

  // Derived state
  get hasInput() {
    return this.input.type !== null && this.input.stream !== null;
  }

  get hasOutput() {
    return this.output.active;
  }

  get canOutput() {
    // Can only output if input is local camera (not remote stream)
    return this.input.type === 'local-camera' && this.input.stream !== null;
  }

  get currentStream() {
    return this.input.stream;
  }
}

// Create global instance
export const videoStreaming = new VideoStreamingState();

// External action functions
export const videoActions = {

  // Room management
  async listRooms(workspaceId: string): Promise<videoTypes.RoomInfo[]> {
    videoStreaming.roomsLoading = true;
    try {
      const client = new video.VideoClientCore(settings.transportServerUrl);
      const rooms = await client.listRooms(workspaceId);
      videoStreaming.rooms = rooms;
      return rooms;
    } catch (error) {
      console.error('Failed to list rooms:', error);
      videoStreaming.rooms = [];
      return [];
    } finally {
      videoStreaming.roomsLoading = false;
    }
  },

  // Input actions
  async connectLocalCamera(): Promise<{ success: boolean; error?: string }> {
    try {
      // Get local camera stream - no server connection needed for local viewing
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true
      });

      // First disconnect any existing input to avoid conflicts
      await this.disconnectInput();

      // Update input state - purely local, no server interaction
      videoStreaming.input.type = 'local-camera';
      videoStreaming.input.stream = stream;
      videoStreaming.input.client = null;
      videoStreaming.input.roomId = null;

      console.log('Local camera connected (local viewing only)');
      return { success: true };
    } catch (error) {
      console.error('Failed to connect local camera:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  async connectRemoteStream(workspaceId: string, roomId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // First disconnect any existing input
      await this.disconnectInput();

      const consumer = new video.VideoConsumer(settings.transportServerUrl);
      const connected = await consumer.connect(workspaceId, roomId, 'consumer-id');
      
      if (!connected) {
        throw new Error('Failed to connect to remote stream');
      }

      // Start receiving video
      await consumer.startReceiving();

      // Set up stream receiving
      consumer.on('streamReceived', (stream: MediaStream) => {
        videoStreaming.input.stream = stream;
      });

      // Update input state
      videoStreaming.input.type = 'remote-stream';
      videoStreaming.input.client = consumer;
      videoStreaming.input.roomId = roomId;

      console.log('Remote stream connected');
      return { success: true };
    } catch (error) {
      console.error('Failed to connect remote stream:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  async disconnectInput(): Promise<void> {
    // Stop local camera tracks if any
    if (videoStreaming.input.stream && videoStreaming.input.type === 'local-camera') {
      videoStreaming.input.stream.getTracks().forEach(track => track.stop());
    }

    // Disconnect remote client if any
    if (videoStreaming.input.client) {
      videoStreaming.input.client.disconnect();
    }

    // Reset input state
    videoStreaming.input.type = null;
    videoStreaming.input.stream = null;
    videoStreaming.input.client = null;
    videoStreaming.input.roomId = null;

    console.log('Input disconnected');
  },

  // Output actions
  async startOutput(workspaceId: string): Promise<{ success: boolean; error?: string; roomId?: string }> {
    if (!videoStreaming.canOutput) {
      return { success: false, error: 'Cannot output - input must be local camera' };
    }

    try {
      const producer = new video.VideoProducer(settings.transportServerUrl);
      
      // Create room
      const roomData = await producer.createRoom(workspaceId);
      const connected = await producer.connect(roomData.workspaceId, roomData.roomId, 'producer-id');
      
      if (!connected) {
        throw new Error('Failed to connect producer');
      }

      // Use the current input stream for output by starting camera with existing stream
      if (videoStreaming.input.stream) {
        // We need to use the producer's startCamera method properly
        // For now, we'll start a new camera stream since we can't directly use existing stream
        await producer.startCamera({
          video: { width: 1280, height: 720 },
          audio: true
        });
      }

      // Update output state
      videoStreaming.output.active = true;
      videoStreaming.output.client = producer;
      videoStreaming.output.roomId = roomData.roomId;

      // Refresh room list
      await this.listRooms(workspaceId);

      console.log('Output started, room created:', roomData.roomId);
      return { success: true, roomId: roomData.roomId };
    } catch (error) {
      console.error('Failed to start output:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  async stopOutput(): Promise<void> {
    if (videoStreaming.output.client) {
      videoStreaming.output.client.disconnect();
    }

    // Reset output state
    videoStreaming.output.active = false;
    videoStreaming.output.client = null;
    videoStreaming.output.roomId = null;

    console.log('Output stopped');
  },

  // Utility functions
  async refreshRooms(workspaceId: string): Promise<void> {
    await this.listRooms(workspaceId);
  },

  getAvailableRooms(): videoTypes.RoomInfo[] {
    return videoStreaming.rooms.filter(room => room.participants.producer !== null);
  },

  getRoomById(roomId: string): videoTypes.RoomInfo | undefined {
    return videoStreaming.rooms.find(room => room.id === roomId);
  }
}; 