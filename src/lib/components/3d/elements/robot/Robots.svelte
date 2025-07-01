<script lang="ts">
	import { robotManager } from "$lib/elements/robot/RobotManager.svelte.js";
	import { onMount, onDestroy } from "svelte";
	import InputConnectionModal from "@/components/3d/elements/robot/modal/InputConnectionModal.svelte";
	import OutputConnectionModal from "@/components/3d/elements/robot/modal/OutputConnectionModal.svelte";
	import ManualControlSheet from "@/components/3d/elements/robot/modal/ManualControlSheet.svelte";
	import type { Robot } from "$lib/elements/robot/Robot.svelte.js";
	import { generateName } from "$lib/utils/generateName";
	import RobotGridItem from "@/components/3d/elements/robot/RobotGridItem.svelte";
	import { interactivity } from "@threlte/extras";

	interface Props {
		workspaceId: string;
	}
	let { workspaceId }: Props = $props();

	let isInputModalOpen = $state(false);
	let isOutputModalOpen = $state(false);
	let isManualControlSheetOpen = $state(false);
	let selectedRobot = $state<Robot | null>(null);

	function onInputBoxClick(robot: Robot) {
		selectedRobot = robot;
		isInputModalOpen = true;
	}

	function onRobotBoxClick(robot: Robot) {
		selectedRobot = robot;
		isManualControlSheetOpen = true;
	}

	function onOutputBoxClick(robot: Robot) {
		selectedRobot = robot;
		isOutputModalOpen = true;
	}

	onMount(async () => {
		async function createRobot() {
			try {
				const robotId = generateName();
				await robotManager.createSO100Robot(robotId, {
					x: 0,
					y: 0,
					z: 0
				});
			} catch (error) {
				console.error("Failed to create robot:", error);
			}
		}

		if (robotManager.robots.length === 0) {
			await createRobot();
		}
	});

	onDestroy(() => {
		// Clean up robots and unlock servos for safety
		console.log("🧹 Cleaning up robots and unlocking servos...");
		robotManager
			.destroy()
			.then(() => {
				console.log("✅ Cleanup completed successfully");
			})
			.catch((error) => {
				console.error("❌ Error during cleanup:", error);
			});
	});
	interactivity({
		filter: (hits, state) => {
			return hits.slice(0, 1);
		}
	});
</script>

{#each robotManager.robots as robot (robot.id)}
	<RobotGridItem
		{robot}
		onCameraMove={() => {}}
		{onInputBoxClick}
		{onRobotBoxClick}
		{onOutputBoxClick}
	/>
{/each}

<!-- Connection Modals -->
{#if selectedRobot}
	<InputConnectionModal bind:open={isInputModalOpen} robot={selectedRobot} {workspaceId} />
	<OutputConnectionModal bind:open={isOutputModalOpen} robot={selectedRobot} {workspaceId} />
	<ManualControlSheet bind:open={isManualControlSheetOpen} robot={selectedRobot} {workspaceId} />
{/if}
