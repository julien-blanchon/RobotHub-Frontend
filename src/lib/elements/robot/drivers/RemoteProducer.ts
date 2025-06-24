import type { Producer, ConnectionStatus, RobotCommand, RemoteDriverConfig } from '../models.js';
import { robotics } from "@robothub/transport-server-client";
import type { JointData } from "@robothub/transport-server-client/robotics";

export class RemoteProducer implements Producer {
  readonly id: string;
  readonly name: string;
  readonly config: RemoteDriverConfig;
  
  private _status: ConnectionStatus = { isConnected: false };
  private statusCallbacks: ((status: ConnectionStatus) => void)[] = [];
  
  private producer: robotics.RoboticsProducer | null = null;
  private client: robotics.RoboticsClientCore | null = null;
  private workspaceId: string | null = null;
  
  // State update interval for producer mode
  private stateUpdateInterval?: ReturnType<typeof setInterval>;
  private lastKnownState: Record<string, number> = {};

  constructor(config: RemoteDriverConfig) {
    this.config = config;
    this.id = `remote-producer-${config.robotId}-${Date.now()}`;
    this.name = `Remote Producer (${config.robotId})`;
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  async connect(joinExistingRoom = false): Promise<void> {
    try {
      const serverUrl = this.config.url.replace(/^ws/, "http");
      console.log(`[RemoteProducer] Connecting to ${serverUrl} for robot ${this.config.robotId} (join mode: ${joinExistingRoom})`);
      
      // Create core client for room management
      this.client = new robotics.RoboticsClientCore(serverUrl);
      
      // Create producer to send commands
      this.producer = new robotics.RoboticsProducer(serverUrl);
      
      // Set up event handlers
      this.producer.onConnected(() => {
        console.log(`[RemoteProducer] Connected to room ${this.config.robotId}`);
        this.startStateUpdates();
      });

      this.producer.onDisconnected(() => {
        console.log(`[RemoteProducer] Disconnected from room ${this.config.robotId}`);
        this.stopStateUpdates();
      });

      this.producer.onError((error: string) => {
        console.error(`[RemoteProducer] Error:`, error);
        this._status = { isConnected: false, error: `Producer error: ${error}` };
        this.notifyStatusChange();
        this.stopStateUpdates();
      });

      // Use workspace ID from config or default
      this.workspaceId = this.config.workspaceId || 'default-workspace';

      let roomData;
      if (joinExistingRoom) {
        // Join existing room (for AI session integration)
        roomData = { workspaceId: this.workspaceId, roomId: this.config.robotId };
        console.log(`[RemoteProducer] Joining existing room ${this.config.robotId} in workspace ${this.workspaceId}`);
      } else {
        // Create new room (for standalone operation)
        roomData = await this.client.createRoom(this.workspaceId, this.config.robotId);
        console.log(`[RemoteProducer] Created new room ${roomData.roomId} in workspace ${roomData.workspaceId}`);
      }

      const success = await this.producer.connect(roomData.workspaceId, roomData.roomId, this.id);
      
      if (!success) {
        throw new Error("Failed to connect producer to room");
      }

      this._status = { isConnected: true, lastConnected: new Date() };
      this.notifyStatusChange();
      
      console.log(`[RemoteProducer] Connected successfully to workspace ${roomData.workspaceId}, room ${roomData.roomId}`);
    } catch (error) {
      console.error(`[RemoteProducer] Connection failed:`, error);
      this._status = { isConnected: false, error: `Connection failed: ${error}` };
      this.notifyStatusChange();
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    console.log(`[RemoteProducer] Disconnecting...`);
    
    this.stopStateUpdates();

    if (this.producer) {
      await this.producer.disconnect();
      this.producer = null;
    }
    if (this.client) {
      // Client doesn't need explicit disconnect
      this.client = null;
    }

    this.workspaceId = null;
    this._status = { isConnected: false };
    this.notifyStatusChange();
    
    console.log(`[RemoteProducer] Disconnected`);
  }

  async sendCommand(command: RobotCommand): Promise<void> {
    if (!this._status.isConnected || !this.producer) {
      throw new Error('Cannot send command: Remote producer not connected');
    }

    try {
      console.debug(`[RemoteProducer] Sending command:`, command);

      // Update last known state for periodic updates
      command.joints.forEach(joint => {
        this.lastKnownState[joint.name] = joint.value;
      });

      // Send joint update with normalized values
      const joints = command.joints.map(joint => ({
        name: joint.name,
        value: joint.value // Already normalized
      }));

      await this.producer.sendJointUpdate(joints);
      console.debug(`[RemoteProducer] Sent joint update with ${joints.length} joints`);
    } catch (error) {
      console.error('[RemoteProducer] Failed to send command:', error);
      throw error;
    }
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

  // Private methods
  private startStateUpdates(): void {
    // Send periodic state updates to keep remote server informed
    this.stateUpdateInterval = setInterval(async () => {
      if (this.producer && this._status.isConnected && Object.keys(this.lastKnownState).length > 0) {
        try {
          await this.producer.sendStateSync(this.lastKnownState);
        } catch (error) {
          console.error('[RemoteProducer] Failed to send state update:', error);
        }
      }
    }, 100); // 10 Hz updates
  }

  private stopStateUpdates(): void {
    if (this.stateUpdateInterval) {
      clearInterval(this.stateUpdateInterval);
      this.stateUpdateInterval = undefined;
    }
  }

  private notifyStatusChange(): void {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(this._status);
      } catch (error) {
        console.error('[RemoteProducer] Error in status callback:', error);
      }
    });
  }
} 