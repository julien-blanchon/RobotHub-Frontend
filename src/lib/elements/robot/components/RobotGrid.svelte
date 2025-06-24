<script lang="ts">
  import { T } from "@threlte/core";
  import { robotManager } from '../RobotManager.svelte.js';
  import { settings } from '$lib/runes/settings.svelte';
  import RobotItem from './RobotItem.svelte';
  import type { Robot } from '../Robot.svelte.js';
  
  let selectedRobot = $state<Robot | null>(null);
  let showConnectionModal = $state(false);
  let modalType = $state<'consumer' | 'producer' | 'manual'>('consumer');

  function handleRobotClick(robot: Robot, type: 'consumer' | 'producer' | 'manual') {
    selectedRobot = robot;
    modalType = type;
    showConnectionModal = true;
  }

  // Access reactive robots
  const robots = $derived(robotManager.robots);
</script>

<T.Group>
  {#each robots as robot (robot.id)}
    <RobotItem 
      {robot} 
      onInteract={handleRobotClick}
    />
  {/each}
</T.Group>

<!-- Connection modal will be added here -->
{#if showConnectionModal && selectedRobot}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="bg-slate-800 rounded-lg p-6 max-w-md w-full m-4 space-y-4">
      <div class="flex justify-between items-center">
        <h2 class="text-lg font-semibold text-white">
          {modalType === 'consumer' ? 'Consumer Driver' : modalType === 'producer' ? 'Producer Drivers' : 'Manual Control'}
        </h2>
        <button
          onclick={() => showConnectionModal = false}
          class="text-gray-400 hover:text-white"
        >
          ✕
        </button>
      </div>
      
      <div class="space-y-3">
        {#if modalType === 'consumer'}
          <button
            onclick={async () => {
              await selectedRobot?.setConsumer({ type: 'usb', baudRate: 1000000 });
              showConnectionModal = false;
            }}
            class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
          >
            Connect USB Consumer
          </button>
          <button
            onclick={async () => {
              await selectedRobot?.setConsumer({ 
                type: 'remote', 
                url: settings.transportServerUrl.replace('http://', 'ws://').replace('https://', 'wss://'), 
                robotId: selectedRobot.id 
              });
              showConnectionModal = false;
            }}
            class="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md"
          >
            Connect Transport Consumer
          </button>
        {:else if modalType === 'producer'}
          <button
            onclick={async () => {
              await selectedRobot?.addProducer({ type: 'usb', baudRate: 1000000 });
              showConnectionModal = false;
            }}
            class="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
          >
            Connect USB Producer
          </button>
          <button
            onclick={async () => {
              await selectedRobot?.addProducer({ 
                type: 'remote', 
                url: settings.transportServerUrl.replace('http://', 'ws://').replace('https://', 'wss://'), 
                robotId: selectedRobot.id 
              });
              showConnectionModal = false;
            }}
            class="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md"
          >
            Connect Transport Producer
          </button>
        {:else}
          <p class="text-gray-300">Manual control interface would go here</p>
        {/if}
      </div>
      
      <div class="text-xs text-slate-500 text-center">
        {#if modalType !== 'manual'}
          Note: USB connections will prompt for calibration if needed
        {/if}
      </div>
    </div>
  </div>
{/if} 