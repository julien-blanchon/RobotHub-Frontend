import type { Consumer, ConnectionStatus, RobotCommand, RemoteDriverConfig } from '../models.js';
import { robotics } from "@robothub/transport-server-client";

export class RemoteConsumer implements Consumer {
  readonly id: string;
  readonly name: string;
  readonly config: RemoteDriverConfig;
  
  private _status: ConnectionStatus = { isConnected: false };
  private statusCallbacks: ((status: ConnectionStatus) => void)[] = [];
  private commandCallbacks: ((command: RobotCommand) => void)[] = [];
  
  private consumer: robotics.RoboticsConsumer | null = null;
  private client: robotics.RoboticsClientCore | null = null;
  private workspaceId: string | null = null;

  constructor(config: RemoteDriverConfig) {
    this.config = config;
    this.id = `remote-consumer-${config.robotId}-${Date.now()}`;
    this.name = `Remote Consumer (${config.robotId})`;
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  async connect(joinExistingRoom = false): Promise<void> {
    try {
      const serverUrl = this.config.url.replace(/^ws/, "http");
      console.log(`[RemoteConsumer] Connecting to ${serverUrl} for robot ${this.config.robotId} (join mode: ${joinExistingRoom})`);
      
      // Create core client for room management
      this.client = new robotics.RoboticsClientCore(serverUrl);
      
      // Create consumer to receive commands
      this.consumer = new robotics.RoboticsConsumer(serverUrl);
      
      // Set up event handlers
      this.consumer.onConnected(() => {
        console.log(`[RemoteConsumer] Connected to room ${this.config.robotId}`);
      });

      this.consumer.onDisconnected(() => {
        console.log(`[RemoteConsumer] Disconnected from room ${this.config.robotId}`);
      });

      this.consumer.onError((error) => {
        console.error(`[RemoteConsumer] Error:`, error);
        this._status = { isConnected: false, error: `Consumer error: ${error}` };
        this.notifyStatusChange();
      });

      // RECEIVE joint updates and forward as normalized commands
      this.consumer.onJointUpdate((joints) => {
        console.debug(`[RemoteConsumer] Received joint update:`, joints);
        
        const command: RobotCommand = {
          timestamp: Date.now(),
          joints: joints.map(joint => ({
            name: joint.name,
            value: joint.value, // Already normalized from server
          }))
        };
        this.notifyCommand(command);
      });

      // RECEIVE state sync
      this.consumer.onStateSync((state) => {
        console.debug(`[RemoteConsumer] Received state sync:`, state);
        
        const joints = Object.entries(state).map(([name, value]) => ({
          name,
          value: value as number
        }));

        if (joints.length > 0) {
          const command: RobotCommand = {
            timestamp: Date.now(),
            joints
          };
          this.notifyCommand(command);
        }
      });

      // Use workspace ID from config or default
      this.workspaceId = this.config.workspaceId || 'default-workspace';
      
      let roomData;
      if (joinExistingRoom) {
        // Join existing room (for AI session integration)
        roomData = { workspaceId: this.workspaceId, roomId: this.config.robotId };
        console.log(`[RemoteConsumer] Joining existing room ${this.config.robotId} in workspace ${this.workspaceId}`);
      } else {
        // Create new room (for standalone operation)
        roomData = await this.client.createRoom(this.workspaceId, this.config.robotId);
        console.log(`[RemoteConsumer] Created new room ${roomData.roomId} in workspace ${roomData.workspaceId}`);
      }

      const success = await this.consumer.connect(roomData.workspaceId, roomData.roomId, this.id);
      
      if (!success) {
        throw new Error("Failed to connect consumer to room");
      }

      this._status = { isConnected: true, lastConnected: new Date() };
      this.notifyStatusChange();
      
      console.log(`[RemoteConsumer] Connected successfully to workspace ${roomData.workspaceId}, room ${roomData.roomId}`);
    } catch (error) {
      console.error(`[RemoteConsumer] Connection failed:`, error);
      this._status = { isConnected: false, error: `Connection failed: ${error}` };
      this.notifyStatusChange();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    console.log(`[RemoteConsumer] Disconnecting...`);
    
    if (this.consumer) {
      await this.consumer.disconnect();
      this.consumer = null;
    }
    if (this.client) {
      // Client doesn't need explicit disconnect
      this.client = null;
    }

    this.workspaceId = null;
    this._status = { isConnected: false };
    this.notifyStatusChange();
    
    console.log(`[RemoteConsumer] Disconnected`);
  }

  // Event handlers
  onStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusCallbacks.push(callback);
    return () => {
      const index = this.statusCallbacks.indexOf(callback);
      if (index >= 0) {
        this.statusCallbacks.splice(index, 1);
      }
    };
  }

  onCommand(callback: (command: RobotCommand) => void): () => void {
    this.commandCallbacks.push(callback);
    return () => {
      const index = this.commandCallbacks.indexOf(callback);
      if (index >= 0) {
        this.commandCallbacks.splice(index, 1);
      }
    };
  }

  // Private methods
  private notifyCommand(command: RobotCommand): void {
    this.commandCallbacks.forEach(callback => {
      try {
        callback(command);
      } catch (error) {
        console.error('[RemoteConsumer] Error in command callback:', error);
      }
    });
  }

  private notifyStatusChange(): void {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(this._status);
      } catch (error) {
        console.error('[RemoteConsumer] Error in status callback:', error);
      }
    });
  }
} 