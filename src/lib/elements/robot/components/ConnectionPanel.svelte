<script lang="ts">
  import type { Robot } from '../Robot.svelte.js';
  import { robotManager } from '../RobotManager.svelte.js';
  import { settings } from '$lib/runes/settings.svelte';
  import USBCalibrationPanel from '../calibration/USBCalibrationPanel.svelte';
  import { USBConsumer } from '../drivers/USBConsumer.js';
  import { USBProducer } from '../drivers/USBProducer.js';

  interface Props {
    robot: Robot;
    workspaceId: string;
  }

  let { robot, workspaceId }: Props = $props();

  const hasConsumer = $derived(robot.hasConsumer);
  const outputDriverCount = $derived(robot.outputDriverCount);
  const consumer = $derived(robot.consumer);
  const producers = $derived(robot.producers);

  // Connection configs - using transport server for communication
  let remoteRobotId = $state(robot.id);
  let connecting = $state(false);
  let error = $state<string | null>(null);

  // USB connection flow state
  let showUSBCalibration = $state(false);
  let pendingUSBConnection: 'consumer' | 'producer' | null = $state(null);

  // Room management state
  const rooms = $derived(robotManager.rooms);
  const roomsLoading = $derived(robotManager.roomsLoading);
  let selectedRoomId = $state('');
  let newRoomId = $state('');
  let showRoomManagement = $state(true); // Show rooms by default

  // Auto-load rooms when component loads
  $effect(() => {
    if (rooms.length === 0 && !roomsLoading && workspaceId) {
      refreshRooms();
    }
  });

  // Set up calibration completion callback with position sync
  robot.calibrationManager.onCalibrationCompleteWithPositions((finalPositions) => {
    console.log('[ConnectionPanel] Calibration complete, syncing robot to final positions');
    robot.syncToCalibrationPositions(finalPositions);
  });

  async function connectUSBConsumer() {
    try {
      connecting = true;
      error = null;

      // Check if calibration is needed
      if (robot.calibrationManager.needsCalibration) {
        pendingUSBConnection = 'consumer';
        showUSBCalibration = true;
        return; // Don't proceed with connection yet
      }

      await robot.setConsumer({
        type: 'usb',
        baudRate: 1000000
      });
    } catch (err) {
      console.error('Failed to connect USB consumer:', err);
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      connecting = false;
    }
  }

  async function connectRemoteConsumer() {
    try {
      connecting = true;
      error = null;
      await robot.setConsumer({
        type: 'remote',
        url: settings.transportServerUrl,
        robotId: remoteRobotId,
        workspaceId: workspaceId
      });
    } catch (err) {
      console.error('Failed to connect remote consumer:', err);
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      connecting = false;
    }
  }

  async function connectUSBProducer() {
    try {
      connecting = true;
      error = null;

      // Check if calibration is needed
      if (robot.calibrationManager.needsCalibration) {
        pendingUSBConnection = 'producer';
        showUSBCalibration = true;
        return; // Don't proceed with connection yet
      }

      await robot.addProducer({
        type: 'usb',
        baudRate: 1000000
      });
    } catch (err) {
      console.error('Failed to connect USB producer:', err);
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      connecting = false;
    }
  }

  async function connectRemoteProducer() {
    try {
      connecting = true;
      error = null;
      await robot.addProducer({
        type: 'remote',
        url: settings.transportServerUrl,
        robotId: remoteRobotId,
        workspaceId: workspaceId
      });
    } catch (err) {
      console.error('Failed to connect remote producer:', err);
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      connecting = false;
    }
  }

  async function disconnectConsumer() {
    try {
      connecting = true;
      error = null;
      await robot.removeConsumer();
    } catch (err) {
      console.error('Failed to disconnect consumer:', err);
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      connecting = false;
    }
  }

  async function disconnectProducer(producerId: string) {
    try {
      connecting = true;
      error = null;
      await robot.removeProducer(producerId);
    } catch (err) {
      console.error('Failed to disconnect producer:', err);
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      connecting = false;
    }
  }

  // Room management functions
  async function refreshRooms() {
    try {
      await robotManager.refreshRooms(workspaceId);
    } catch (err) {
      console.error('Failed to refresh rooms:', err);
      error = err instanceof Error ? err.message : 'Failed to refresh rooms';
    }
  }

  async function createRoom() {
    try {
      connecting = true;
      error = null;
      const result = await robotManager.createRoboticsRoom(workspaceId, newRoomId || undefined);
      if (result.success) {
        newRoomId = '';
        await refreshRooms();
      } else {
        error = result.error || 'Failed to create room';
      }
    } catch (err) {
      console.error('Failed to create room:', err);
      error = err instanceof Error ? err.message : 'Failed to create room';
    } finally {
      connecting = false;
    }
  }

  async function joinRoomAsConsumer() {
    if (!selectedRoomId) {
      error = 'Please select a room';
      return;
    }
    
    try {
      connecting = true;
      error = null;
      await robotManager.connectConsumerToRoom(workspaceId, robot.id, selectedRoomId);
    } catch (err) {
      console.error('Failed to join room as consumer:', err);
      error = err instanceof Error ? err.message : 'Failed to join room as consumer';
    } finally {
      connecting = false;
    }
  }

  async function joinRoomAsProducer() {
    if (!selectedRoomId) {
      error = 'Please select a room';
      return;
    }
    
    try {
      connecting = true;
      error = null;
      await robotManager.connectProducerToRoom(workspaceId, robot.id, selectedRoomId);
    } catch (err) {
      console.error('Failed to join room as producer:', err);
      error = err instanceof Error ? err.message : 'Failed to join room as producer';
    } finally {
      connecting = false;
    }
  }

  async function createRoomAndJoinAsProducer() {
    try {
      connecting = true;
      error = null;
      const result = await robotManager.connectProducerAsProducer(workspaceId, robot.id, newRoomId || undefined);
      if (result.success) {
        newRoomId = '';
        await refreshRooms();
      } else {
        error = result.error || 'Failed to create room and join as producer';
      }
    } catch (err) {
      console.error('Failed to create room and join as producer:', err);
      error = err instanceof Error ? err.message : 'Failed to create room and join as producer';
    } finally {
      connecting = false;
    }
  }

  // Handle calibration completion
  async function onCalibrationComplete() {
    showUSBCalibration = false;
    
    if (pendingUSBConnection === 'consumer') {
      await connectUSBConsumer();
    } else if (pendingUSBConnection === 'producer') {
      await connectUSBProducer();
    }
    
    pendingUSBConnection = null;
  }

  function onCalibrationCancel() {
    showUSBCalibration = false;
    pendingUSBConnection = null;
    connecting = false;
  }
</script>

<div class="space-y-4">
  <!-- Connection panel -->
  <div class="bg-slate-800 border border-slate-600 rounded-lg p-4 space-y-4">
    <h3 class="text-lg font-semibold text-slate-100">Connections - {robot.id}</h3>

    <!-- Error display -->
    {#if error}
      <div class="bg-red-900/20 border border-red-500/30 rounded p-2 text-red-400 text-sm">
        {error}
      </div>
    {/if}

    <!-- Room Management Section -->
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-medium text-slate-300">Room Management</h4>
        <button
          onclick={() => showRoomManagement = !showRoomManagement}
          class="text-xs text-blue-400 hover:text-blue-300"
        >
          {showRoomManagement ? 'Hide' : 'Show'} Rooms
        </button>
      </div>

      {#if showRoomManagement}
        <div class="bg-slate-700/30 border border-slate-600 rounded p-3 space-y-3">
          <!-- Refresh Rooms -->
          <div class="flex items-center gap-2">
            <button
              onclick={refreshRooms}
              disabled={roomsLoading || connecting}
              class="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-xs"
            >
              {#if roomsLoading}
                <span class="icon-[mdi--loading] animate-spin size-3 mr-1"></span>
                Loading...
              {:else}
                <span class="icon-[mdi--refresh] size-3 mr-1"></span>
                Refresh Rooms
              {/if}
            </button>
            <span class="text-xs text-slate-400">
              {rooms.length} room{rooms.length !== 1 ? 's' : ''} available
            </span>
          </div>

          <!-- Available Rooms -->
          <div class="space-y-2">
            <span class="text-xs text-slate-400">Available Rooms:</span>
                         <div class="max-h-48 space-y-2 overflow-y-auto">
                             <!-- Create New Room Option -->
               <div class="rounded border-2 border-dashed border-green-500/50 bg-green-500/5 p-2">
                 <div class="space-y-2">
                   <div class="flex items-center gap-2">
                     <span class="text-sm font-medium text-green-300">Create New Room</span>
                   </div>
                   <p class="text-xs text-green-400/70">
                     Create a room for collaboration
                   </p>
                   <input
                     bind:value={newRoomId}
                     placeholder="Room ID (optional)"
                     disabled={connecting}
                     class="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-slate-100 disabled:opacity-50"
                   />
                   <div class="flex gap-1">
                     <button
                       onclick={createRoom}
                       disabled={connecting}
                       class="flex-1 px-2 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-xs"
                     >
                       {#if connecting}
                         <span class="icon-[mdi--loading] animate-spin size-3 mr-1"></span>
                         Creating...
                       {:else}
                         Create
                       {/if}
                     </button>
                     <button
                       onclick={createRoomAndJoinAsProducer}
                       disabled={connecting}
                       class="flex-1 px-2 py-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-xs"
                     >
                       {#if connecting}
                         <span class="icon-[mdi--loading] animate-spin size-3 mr-1"></span>
                         Creating...
                       {:else}
                         Create & Join
                       {/if}
                     </button>
                   </div>
                 </div>
               </div>

                             <!-- Existing Rooms -->
               {#if rooms.length === 0}
                 <div class="text-center py-2 text-xs text-slate-500">
                   {roomsLoading ? 'Loading...' : 'No existing rooms available'}
                 </div>
              {:else}
                                 {#each rooms as room}
                   <div class="rounded border border-slate-600 bg-slate-700/30 p-2">
                     <div class="mb-2">
                       <p class="text-sm font-medium text-slate-200 truncate">{room.id}</p>
                       <p class="text-xs text-slate-400">{room.participants?.total || 0} participants</p>
                     </div>
                     <div class="flex gap-1">
                       <button
                         onclick={() => {
                           selectedRoomId = room.id;
                           joinRoomAsConsumer();
                         }}
                         disabled={connecting}
                         class="flex-1 px-2 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-xs"
                       >
                         Join as Consumer
                       </button>
                       <button
                         onclick={() => {
                           selectedRoomId = room.id;
                           joinRoomAsProducer();
                         }}
                         disabled={connecting}
                         class="flex-1 px-2 py-1 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-xs"
                       >
                         Join as Producer
                       </button>
                     </div>
                   </div>
                 {/each}
              {/if}
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Consumer Section (Input) - SINGLE -->
    <div class="space-y-2">
      <h4 class="text-sm font-medium text-slate-300">Consumer (Receive Commands) - Single</h4>
      {#if hasConsumer}
        <div class="flex items-center justify-between bg-green-900/20 border border-green-500/30 rounded p-2">
          <div>
            <span class="text-green-300 text-sm">{consumer?.name || 'Consumer Active'}</span>
            <span class="text-xs text-slate-500 ml-2">
              {consumer?.status.isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
          </div>
          <button
            onclick={disconnectConsumer}
            disabled={connecting}
            class="px-3 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-xs"
          >
            {connecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      {:else}
        <div class="space-y-2">
          <button
            onclick={connectUSBConsumer}
            disabled={connecting}
            class="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm"
          >
            {connecting ? 'Connecting...' : 'Connect USB Consumer'}
          </button>
          <div class="space-y-2">
            <div class="flex gap-2">
              <input
                bind:value={settings.transportServerUrl}
                placeholder="Transport server URL (e.g. http://localhost:8000)"
                disabled={connecting}
                class="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 disabled:opacity-50"
              />
              <button
                onclick={connectRemoteConsumer}
                disabled={connecting}
                class="px-3 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm whitespace-nowrap"
              >
                {connecting ? 'Connecting...' : 'Remote Consumer'}
              </button>
            </div>
            <div class="text-xs text-slate-500">
              Remote Consumer: Receive commands from transport server
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Producers Section (Output) - MULTIPLE -->
    <div class="space-y-2">
      <h4 class="text-sm font-medium text-slate-300">Producers (Send Commands) - {outputDriverCount} connected</h4>
      <div class="space-y-2">
        <button
          onclick={connectUSBProducer}
          disabled={connecting}
          class="w-full py-2 px-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm"
        >
          {connecting ? 'Connecting...' : 'Add USB Producer'}
        </button>
        <button
          onclick={connectRemoteProducer}
          disabled={connecting}
          class="w-full py-2 px-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-sm"
        >
          {connecting ? 'Connecting...' : 'Add Remote Producer'}
        </button>
        <div class="text-xs text-slate-500">
          Remote Producer: Send commands to transport server. Uses Robot ID: {remoteRobotId}
        </div>
      </div>

      <!-- Connected Producers List -->
      {#each producers as producer}
        <div class="flex items-center justify-between bg-slate-700/50 border border-slate-600 rounded p-2">
          <div>
            <span class="text-slate-300 text-sm">{producer.name}</span>
            <span class="text-xs text-slate-500 ml-2">
              {producer.status.isConnected ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
          </div>
          <button
            onclick={() => disconnectProducer(producer.id)}
            disabled={connecting}
            class="px-2 py-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded text-xs"
          >
            {connecting ? 'Removing...' : 'Remove'}
          </button>
        </div>
      {/each}
    </div>

    <!-- Robot ID Config -->
    <div class="pt-2 border-t border-slate-600">
      <span class="text-xs text-slate-400">Robot ID for Remote Connections:</span>
      <input
        bind:value={remoteRobotId}
        disabled={connecting}
        class="w-full px-3 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-slate-100 mt-1 disabled:opacity-50"
      />
    </div>
  </div>

  <!-- USB Calibration Modal - Only shown when connecting USB drivers -->
  {#if showUSBCalibration}
    <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-slate-800 rounded-lg p-6 max-w-2xl w-full m-4 space-y-4">
        <div class="flex justify-between items-center">
          <h2 class="text-lg font-semibold text-white">
            USB Calibration Required
            {#if pendingUSBConnection}
              <span class="text-sm text-slate-400 ml-2">
                (for {pendingUSBConnection === 'consumer' ? 'Consumer' : 'Producer'})
              </span>
            {/if}
          </h2>
          <button
            onclick={onCalibrationCancel}
            class="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>
        
        <div class="text-sm text-slate-300 mb-4">
          Before connecting USB drivers, the robot needs to be calibrated to map its physical range to software values.
        </div>

        <USBCalibrationPanel 
          calibrationManager={robot.calibrationManager}
          connectionType={pendingUSBConnection || 'consumer'}
          {onCalibrationComplete}
          onCancel={onCalibrationCancel}
        />
      </div>
    </div>
  {/if}
</div> 