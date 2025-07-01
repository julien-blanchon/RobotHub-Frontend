<script lang="ts">
	import { onMount } from "svelte";
	import { remoteComputeManager } from "$lib/elements/compute/RemoteComputeManager.svelte";
	import AISessionConnectionModal from "@/components/3d/elements/compute/modal/AISessionConnectionModal.svelte";
	import AIModelConfigurationModal from "@/components/3d/elements/compute/modal/AIModelConfigurationModal.svelte";
	import VideoInputConnectionModal from "@/components/3d/elements/compute/modal/VideoInputConnectionModal.svelte";
	import RobotInputConnectionModal from "@/components/3d/elements/compute/modal/RobotInputConnectionModal.svelte";
	import RobotOutputConnectionModal from "@/components/3d/elements/compute/modal/RobotOutputConnectionModal.svelte";
	import ComputeGridItem from "@/components/3d/elements/compute/ComputeGridItem.svelte";
	import type { RemoteCompute } from "$lib/elements/compute/RemoteCompute.svelte";
	import { interactivity } from "@threlte/extras";

	interface Props {
		workspaceId: string;
	}
	let { workspaceId }: Props = $props();

	let isAISessionModalOpen = $state(false);
	let isAIConfigModalOpen = $state(false);
	let isVideoInputModalOpen = $state(false);
	let isRobotInputModalOpen = $state(false);
	let isRobotOutputModalOpen = $state(false);
	let selectedCompute = $state<RemoteCompute | null>(null);

	function handleVideoInputBoxClick(compute: RemoteCompute) {
		selectedCompute = compute;
		if (!compute.hasSession) {
			// If no session exists, open the session creation modal
			isAISessionModalOpen = true;
		} else {
			// If session exists, open video connection modal
			isVideoInputModalOpen = true;
		}
	}

	function handleRobotInputBoxClick(compute: RemoteCompute) {
		selectedCompute = compute;
		if (!compute.hasSession) {
			// If no session exists, open the session creation modal
			isAISessionModalOpen = true;
		} else {
			// If session exists, open robot input connection modal
			isRobotInputModalOpen = true;
		}
	}

	function handleRobotOutputBoxClick(compute: RemoteCompute) {
		selectedCompute = compute;
		if (!compute.hasSession) {
			// If no session exists, open the session creation modal
			isAISessionModalOpen = true;
		} else {
			// If session exists, open robot output connection modal
			isRobotOutputModalOpen = true;
		}
	}

	// Auto-refresh compute statuses periodically
	onMount(() => {
		const interval = setInterval(async () => {
			for (const compute of remoteComputeManager.computes) {
				if (compute.hasSession) {
					await remoteComputeManager.getSessionStatus(compute.id);
				}
			}
		}, 5000); // Refresh every 5 seconds

		return () => clearInterval(interval);
	});
	interactivity({
		filter: (hits, state) => {
			return hits.slice(0, 1);
		}
	});
</script>

{#each remoteComputeManager.computes as compute (compute.id)}
	<ComputeGridItem
		{compute}
		onVideoInputBoxClick={handleVideoInputBoxClick}
		onRobotInputBoxClick={handleRobotInputBoxClick}
		onRobotOutputBoxClick={handleRobotOutputBoxClick}
	/>
{/each}

{#if selectedCompute}
	<!-- Inference Session Configuration Modal (for existing computes without sessions) -->
	<AISessionConnectionModal
		bind:open={isAISessionModalOpen}
		compute={selectedCompute}
		{workspaceId}
	/>
	<!-- Video Input Connection Modal -->
	<VideoInputConnectionModal
		bind:open={isVideoInputModalOpen}
		compute={selectedCompute}
		{workspaceId}
	/>
	<!-- Robot Input Connection Modal -->
	<RobotInputConnectionModal
		bind:open={isRobotInputModalOpen}
		compute={selectedCompute}
		{workspaceId}
	/>
	<!-- Robot Output Connection Modal -->
	<RobotOutputConnectionModal
		bind:open={isRobotOutputModalOpen}
		compute={selectedCompute}
		{workspaceId}
	/>
{/if}

<!-- AI Model Configuration Modal (for creating new models) -->
<AIModelConfigurationModal bind:open={isAIConfigModalOpen} {workspaceId} />
