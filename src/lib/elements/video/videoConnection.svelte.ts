/**
 * Video Connection System using Svelte 5 Runes
 * Clean and simple video producer/consumer management
 */

import { video } from '@robothub/transport-server-client';
import type { video as videoTypes } from '@robothub/transport-server-client';
import { settings } from '$lib/runes/settings.svelte';

// Simple connection state using runes
export class VideoConnectionState {
  // Producer state
  producer = $state({
    connected: false,
    client: null as videoTypes.VideoProducer | null,
    roomId: null as string | null,
    stream: null as MediaStream | null,
  });

  // Consumer state
  consumer = $state({
    connected: false,
    client: null as videoTypes.VideoConsumer | null,
    roomId: null as string | null,
    stream: null as MediaStream | null,
  });

  // Room listing state
  rooms = $state<videoTypes.RoomInfo[]>([]);
  roomsLoading = $state(false);

  // Derived state
  get hasProducer() {
    return this.producer.connected;
  }

  get hasConsumer() {
    return this.consumer.connected;
  }

  get isStreaming() {
    return this.hasProducer && this.producer.stream !== null;
  }

  get canConnectConsumer() {
    return this.hasProducer && this.producer.roomId !== null;
  }
}

// Create global instance
export const videoConnection = new VideoConnectionState();

// External action functions
export const videoActions = {

  // Room management
  async listRooms(workspaceId: string): Promise<videoTypes.RoomInfo[]> {
    videoConnection.roomsLoading = true;
    try {
      const client = new video.VideoClientCore(settings.transportServerUrl);
      const rooms = await client.listRooms(workspaceId);
      videoConnection.rooms = rooms;
      return rooms;
    } catch (error) {
      console.error('Failed to list rooms:', error);
      videoConnection.rooms = [];
      return [];
    } finally {
      videoConnection.roomsLoading = false;
    }
  },

  async createRoom(workspaceId: string, roomId?: string): Promise<string | null> {
    try {
      const client = new video.VideoClientCore(settings.transportServerUrl);
      const result = await client.createRoom(workspaceId, roomId);
      if (result) {
        // Refresh room list
        await this.listRooms(workspaceId);
        return result.roomId;
      }
      return null;
    } catch (error) {
      console.error('Failed to create room:', error);
      return null;
    }
  },

  async deleteRoom(workspaceId: string, roomId: string): Promise<boolean> {
    try {
      const client = new video.VideoClientCore(settings.transportServerUrl);
      await client.deleteRoom(workspaceId, roomId);
      // Refresh room list
      await this.listRooms(workspaceId);
      return true;
    } catch (error) {
      console.error('Failed to delete room:', error);
      return false;
    }
  },

  // Producer actions (simplified - only remote/local camera)
  async connectProducer(workspaceId: string): Promise<{ success: boolean; error?: string; roomId?: string }> {
    try {
      const producer = new video.VideoProducer(settings.transportServerUrl);
      
      // Create or join room
      const roomData = await producer.createRoom(workspaceId);
      const connected = await producer.connect(roomData.workspaceId, roomData.roomId);
      
      if (!connected) {
        throw new Error('Failed to connect producer');
      }

      // Start camera stream
      const stream = await producer.startCamera({
        video: { width: 1280, height: 720 },
        audio: true
      });

      // Update state
      videoConnection.producer.connected = true;
      videoConnection.producer.client = producer;
      videoConnection.producer.roomId = roomData.roomId;
      videoConnection.producer.stream = stream;

      // Refresh room list
      await this.listRooms(workspaceId);

      return { success: true, roomId: roomData.roomId };
    } catch (error) {
      console.error('Failed to connect producer:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  async disconnectProducer(): Promise<void> {
    if (videoConnection.producer.client) {
      videoConnection.producer.client.disconnect();
    }
    if (videoConnection.producer.stream) {
      videoConnection.producer.stream.getTracks().forEach(track => track.stop());
    }
    
    // Reset state
    videoConnection.producer.connected = false;
    videoConnection.producer.client = null;
    videoConnection.producer.roomId = null;
    videoConnection.producer.stream = null;
  },

  // Consumer actions (simplified - only remote consumer)
  async connectConsumer(workspaceId: string, roomId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const consumer = new video.VideoConsumer(settings.transportServerUrl);
      const connected = await consumer.connect(workspaceId, roomId);
      
      if (!connected) {
        throw new Error('Failed to connect consumer');
      }

      // Start receiving video
      await consumer.startReceiving();

      // Set up stream receiving
      consumer.on('streamReceived', (stream: MediaStream) => {
        videoConnection.consumer.stream = stream;
      });

      // Update state
      videoConnection.consumer.connected = true;
      videoConnection.consumer.client = consumer;
      videoConnection.consumer.roomId = roomId;

      return { success: true };
    } catch (error) {
      console.error('Failed to connect consumer:', error);
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },

  async disconnectConsumer(): Promise<void> {
    if (videoConnection.consumer.client) {
      videoConnection.consumer.client.disconnect();
    }
    
    // Reset state
    videoConnection.consumer.connected = false;
    videoConnection.consumer.client = null;
    videoConnection.consumer.roomId = null;
    videoConnection.consumer.stream = null;
  },

  // Utility functions
  async refreshRooms(workspaceId: string): Promise<void> {
    await this.listRooms(workspaceId);
  },

  getAvailableRooms(): videoTypes.RoomInfo[] {
    return videoConnection.rooms.filter(room => room.participants.producer !== null);
  },

  getRoomById(roomId: string): videoTypes.RoomInfo | undefined {
    return videoConnection.rooms.find(room => room.id === roomId);
  }
}; 