<script lang="ts">
  import type { Robot } from '../Robot.svelte.js';

  interface Props {
    robot: Robot;
  }

  let { robot }: Props = $props();

  const joints = $derived(robot.jointArray);
  const isManualControlEnabled = $derived(robot.isManualControlEnabled);

  function updateJoint(name: string, value: number) {
    if (!isManualControlEnabled) return;
    robot.updateJoint(name, value);
  }
</script>

<div class="bg-slate-800 border border-slate-600 rounded-lg p-4 space-y-4">
  <div class="flex items-center justify-between">
    <h3 class="text-lg font-semibold text-slate-100">
      Robot Controls - {robot.id}
    </h3>
    <div class="flex items-center gap-2">
      {#if isManualControlEnabled}
        <span class="text-green-400 text-sm">Manual Control</span>
      {:else}
        <span class="text-orange-400 text-sm">External Control</span>
      {/if}
    </div>
  </div>

  <div class="space-y-4">
    {#each joints as joint}
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <span class="text-slate-200">{joint.name}</span>
          <span class="text-sm text-slate-400">
            {joint.value.toFixed(1)}%
          </span>
        </div>
        
        <div class="flex items-center gap-4">
          {#if joint.name.toLowerCase() === 'jaw' || joint.name.toLowerCase() === 'gripper'}
            <span class="text-xs text-slate-400 w-12">0% (closed)</span>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={joint.value}
              disabled={!isManualControlEnabled}
              oninput={(e) => updateJoint(joint.name, parseFloat(e.currentTarget.value))}
              class="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span class="text-xs text-slate-400 w-12">100% (open)</span>
          {:else}
            <span class="text-xs text-slate-400 w-8">-100%</span>
            <input
              type="range"
              min="-100"
              max="100"
              step="1"
              value={joint.value}
              disabled={!isManualControlEnabled}
              oninput={(e) => updateJoint(joint.name, parseFloat(e.currentTarget.value))}
              class="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <span class="text-xs text-slate-400 w-8">+100%</span>
          {/if}
        </div>

        {#if joint.limits}
          <div class="text-xs text-slate-500">
            URDF limits: {(joint.limits.lower)}° to {joint.limits.upper}°
          </div>
        {/if}
      </div>
    {/each}
  </div>
</div> 