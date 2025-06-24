import type { Positionable, Position3D } from '$lib/types/positionable.js';
import type { AISessionConfig, AISessionResponse } from './RemoteComputeManager.svelte';

export type ComputeStatus = 'disconnected' | 'ready' | 'running' | 'stopped' | 'initializing';

export class RemoteCompute implements Positionable {
  readonly id: string;
  
  // Reactive state using Svelte 5 runes
  position = $state<Position3D>({ x: 0, y: 0, z: 0 });
  name = $state<string>('');
  status = $state<ComputeStatus>('disconnected');
  
  // Session data
  sessionId = $state<string | null>(null);
  sessionConfig = $state<AISessionConfig | null>(null);
  sessionData = $state<AISessionResponse | null>(null);
  
  // Derived reactive values
  hasSession = $derived(this.sessionId !== null);
  isRunning = $derived(this.status === 'running');
  canStart = $derived(this.status === 'ready' || this.status === 'stopped');
  canStop = $derived(this.status === 'running');

  constructor(id: string, name?: string) {
    this.id = id;
    this.name = name || `Compute ${id}`;
  }

  /**
   * Get input connections (camera and joint inputs)
   */
  get inputConnections() {
    if (!this.sessionData) return null;
    
    return {
      cameras: this.sessionData.camera_room_ids,
      jointInput: this.sessionData.joint_input_room_id,
      workspaceId: this.sessionData.workspace_id
    };
  }

  /**
   * Get output connections (joint output)
   */
  get outputConnections() {
    if (!this.sessionData) return null;
    
    return {
      jointOutput: this.sessionData.joint_output_room_id,
      workspaceId: this.sessionData.workspace_id
    };
  }

  /**
   * Get display information for UI
   */
  get displayInfo() {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      sessionId: this.sessionId,
      policyPath: this.sessionConfig?.policyPath,
      cameraNames: this.sessionConfig?.cameraNames || [],
      hasSession: this.hasSession,
      isRunning: this.isRunning,
      canStart: this.canStart,
      canStop: this.canStop
    };
  }

  /**
   * Get status for billboard display
   */
  get statusInfo() {
    const status = this.status;
    let statusText = '';
    let statusColor = '';
    
    switch (status) {
      case 'disconnected':
        statusText = 'Disconnected';
        statusColor = 'rgb(107, 114, 128)'; // gray
        break;
      case 'ready':
        statusText = 'Ready';
        statusColor = 'rgb(245, 158, 11)'; // yellow
        break;
      case 'running':
        statusText = 'Running';
        statusColor = 'rgb(34, 197, 94)'; // green
        break;
      case 'stopped':
        statusText = 'Stopped';
        statusColor = 'rgb(239, 68, 68)'; // red
        break;
      case 'initializing':
        statusText = 'Initializing';
        statusColor = 'rgb(59, 130, 246)'; // blue
        break;
    }

    return {
      status,
      statusText,
      statusColor,
      emoji: this.getStatusEmoji()
    };
  }

  private getStatusEmoji(): string {
    switch (this.status) {
      case 'disconnected': return '⚪';
      case 'ready': return '🟡';
      case 'running': return '🟢';
      case 'stopped': return '🔴';
      case 'initializing': return '🟠';
      default: return '⚪';
    }
  }

  /**
   * Reset session data
   */
  resetSession(): void {
    this.sessionId = null;
    this.sessionConfig = null;
    this.sessionData = null;
    this.status = 'disconnected';
  }

  /**
   * Update position
   */
  updatePosition(newPosition: Position3D): void {
    this.position = { ...newPosition };
  }

  /**
   * Update name
   */
  updateName(newName: string): void {
    this.name = newName;
  }
} 