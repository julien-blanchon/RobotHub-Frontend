import { Robot } from './Robot.svelte.js';
import type { JointState, USBDriverConfig, RemoteDriverConfig } from './models.js';
import type { Position3D } from '$lib/types/positionable.js';
import { createUrdfRobot } from '@/elements/robot/createRobot.svelte.js';
import type { RobotUrdfConfig } from '$lib/types/urdf.js';
import { generateName } from '$lib/utils/generateName.js';
import { positionManager } from '$lib/utils/positionManager.js';
import { settings } from '$lib/runes/settings.svelte';
import { robotics } from '@robohub/transport-server-client';
import type { robotics as roboticsTypes } from '@robohub/transport-server-client';

export class RobotManager {
  private _robots = $state<Robot[]>([]);
  
  // Room management state - using transport server for communication
  rooms = $state<roboticsTypes.RoomInfo[]>([]);
  roomsLoading = $state(false);

  // Reactive getters
  get robots(): Robot[] {
    return this._robots;
  }

  get robotCount(): number {
    return this._robots.length;
  }

  /**
   * Room Management Methods
   */
  async listRooms(workspaceId: string): Promise<roboticsTypes.RoomInfo[]> {
    try {
      const client = new robotics.RoboticsClientCore(settings.transportServerUrl);
      const rooms = await client.listRooms(workspaceId);
      this.rooms = rooms;
      return rooms;
    } catch (error) {
      console.error('Failed to list robotics rooms:', error);
      return [];
    }
  }

  async refreshRooms(workspaceId: string): Promise<void> {
    this.roomsLoading = true;
    try {
      await this.listRooms(workspaceId);
    } finally {
      this.roomsLoading = false;
    }
  }

  async createRoboticsRoom(workspaceId: string, roomId?: string): Promise<{ success: boolean; roomId?: string; error?: string }> {
    try {
      const client = new robotics.RoboticsClientCore(settings.transportServerUrl);
      const result = await client.createRoom(workspaceId, roomId);
      // Refresh rooms list to include the new room  
      await this.refreshRooms(workspaceId);
      return { success: true, roomId: result.roomId };
    } catch (error) {
      console.error('Failed to create robotics room:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  generateRoomId(robotId: string): string {
    return `${robotId}-${generateName()}`;
  }

  /**
   * Connect consumer to an existing robotics room as consumer
   * This will receive commands from producers in that room
   */
  async connectConsumerToRoom(workspaceId: string, robotId: string, roomId: string): Promise<void> {
    const robot = this.getRobot(robotId);
    if (!robot) {
      throw new Error(`Robot ${robotId} not found`);
    }

    const config: RemoteDriverConfig = {
      type: 'remote',
      url: settings.transportServerUrl.replace('http://', 'ws://').replace('https://', 'wss://'),
      robotId: roomId,
      workspaceId: workspaceId
    };

    // Use joinAsConsumer to join existing room
    await robot.joinAsConsumer(config);
  }

  /**
   * Connect producer to an existing robotics room as producer
   * This will send commands to consumers in that room
   */
  async connectProducerToRoom(workspaceId: string, robotId: string, roomId: string): Promise<void> {
    const robot = this.getRobot(robotId);
    if (!robot) {
      throw new Error(`Robot ${robotId} not found`);
    }

    const config: RemoteDriverConfig = {
      type: 'remote',
      url: settings.transportServerUrl.replace('http://', 'ws://').replace('https://', 'wss://'),
      robotId: roomId,
      workspaceId: workspaceId
    };

    // Use joinAsProducer to join existing room
    await robot.joinAsProducer(config);
  }

  /**
   * Create and connect producer as producer to a new room
   */
  async connectProducerAsProducer(workspaceId: string, robotId: string, roomId?: string): Promise<{ success: boolean; roomId?: string; error?: string }> {
    try {
      // Create room first if roomId provided, otherwise generate one
      const finalRoomId = roomId || this.generateRoomId(robotId);
      const createResult = await this.createRoboticsRoom(workspaceId, finalRoomId);
      
      if (!createResult.success) {
        return createResult;
      }

      // Connect producer to the new room
      await this.connectProducerToRoom(workspaceId, robotId, createResult.roomId!);
      
      return { success: true, roomId: createResult.roomId };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Create a robot with the default SO-100 arm configuration
   */
  async createSO100Robot(id?: string, position?: Position3D): Promise<Robot> {
    const robotId = id || `so100-${Date.now()}`;
    const urdfConfig: RobotUrdfConfig = {
      urdfUrl: "/robots/so-100/so_arm100.urdf"
    };
    
    return this.createRobotFromUrdf(robotId, urdfConfig, position);
  }

  /**
   * Create a new robot directly from URDF configuration - automatically extracts joint limits
   */
  async createRobotFromUrdf(id: string, urdfConfig: RobotUrdfConfig, position?: Position3D): Promise<Robot> {
    // Check if robot already exists
    if (this._robots.find(r => r.id === id)) {
      throw new Error(`Robot with ID ${id} already exists`);
    }

    try {
      // Load and parse URDF
      const robotState = await createUrdfRobot(urdfConfig);
      
      // Extract joint information from URDF
      const joints: JointState[] = [];
      let servoId = 1; // Auto-assign servo IDs in order
      
      for (const urdfJoint of robotState.urdfRobot.joints) {
        // Only include revolute joints (movable joints)
        if (urdfJoint.type === 'revolute' && urdfJoint.name) {
          const jointState: JointState = {
            name: urdfJoint.name,
            value: 0, // Start at center (0%)
            servoId: servoId++
          };
          
          // Extract limits from URDF if available
          if (urdfJoint.limit) {
            jointState.limits = {
              lower: urdfJoint.limit.lower,
              upper: urdfJoint.limit.upper
            };
          }
          
          joints.push(jointState);
        }
      }
      
      console.log(`Extracted ${joints.length} joints from URDF:`, joints.map(j => `${j.name} [${j.limits?.lower?.toFixed(2)}:${j.limits?.upper?.toFixed(2)}]`));
      
      // Create robot with extracted joints AND URDF robot state
      const robot = new Robot(id, joints, robotState.urdfRobot);

      // Set position (from position manager if not provided)
      robot.position = position || positionManager.getNextPosition();

      // Add to reactive array
      this._robots.push(robot);

      console.log(`Created robot ${id} from URDF. Total robots: ${this._robots.length}`);
      return robot;
      
    } catch (error) {
      console.error(`Failed to create robot ${id} from URDF:`, error);
      throw error;
    }
  }

  /**
   * Create a new robot with joints defined at initialization (for backwards compatibility)
   */
  createRobot(id: string, joints: JointState[], position?: Position3D): Robot {
    // Check if robot already exists
    if (this._robots.find(r => r.id === id)) {
      throw new Error(`Robot with ID ${id} already exists`);
    }

    // Create robot
    const robot = new Robot(id, joints);

    // Set position (from position manager if not provided)
    robot.position = position || positionManager.getNextPosition();

    // Add to reactive array
    this._robots.push(robot);

    console.log(`Created robot ${id}. Total robots: ${this._robots.length}`);
    return robot;
  }

  /**
   * Remove a robot
   */
  async removeRobot(id: string): Promise<void> {
    const robotIndex = this._robots.findIndex(r => r.id === id);
    if (robotIndex === -1) return;

    const robot = this._robots[robotIndex];

    // Clean up robot resources
    await robot.destroy();

    // Remove from reactive array
    this._robots.splice(robotIndex, 1);

    console.log(`Removed robot ${id}. Remaining robots: ${this._robots.length}`);
  }

  /**
   * Get robot by ID
   */
  getRobot(id: string): Robot | undefined {
    return this._robots.find(r => r.id === id);
  }



  /**
   * Clean up all robots
   */
  async destroy(): Promise<void> {
    const cleanupPromises = this._robots.map(robot => robot.destroy());
    await Promise.allSettled(cleanupPromises);
    this._robots.length = 0;
  }
}

// Global robot manager instance
export const robotManager = new RobotManager();