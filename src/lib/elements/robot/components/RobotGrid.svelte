<script lang="ts">
	import { T } from "@threlte/core";
	import { robotManager } from "../RobotManager.svelte.js";
	import { settings } from "$lib/runes/settings.svelte";
	import RobotItem from "./RobotItem.svelte";
	import type { Robot } from "../Robot.svelte.js";

	let selectedRobot = $state<Robot | null>(null);
	let showConnectionModal = $state(false);
	let modalType = $state<"consumer" | "producer" | "manual">("consumer");

	function handleRobotClick(robot: Robot, type: "consumer" | "producer" | "manual") {
		selectedRobot = robot;
		modalType = type;
		showConnectionModal = true;
	}

	// Access reactive robots
	const robots = $derived(robotManager.robots);
</script>

<T.Group>
	{#each robots as robot (robot.id)}
		<RobotItem {robot} onInteract={handleRobotClick} />
	{/each}
</T.Group>

<!-- Connection modal will be added here -->
{#if showConnectionModal && selectedRobot}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
		<div class="m-4 w-full max-w-md space-y-4 rounded-lg bg-slate-800 p-6">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-semibold text-white">
					{modalType === "consumer"
						? "Consumer Driver"
						: modalType === "producer"
							? "Producer Drivers"
							: "Manual Control"}
				</h2>
				<button
					onclick={() => (showConnectionModal = false)}
					class="text-gray-400 hover:text-white"
				>
					✕
				</button>
			</div>

			<div class="space-y-3">
				{#if modalType === "consumer"}
					<button
						onclick={async () => {
							await selectedRobot?.setConsumer({ type: "usb", baudRate: 1000000 });
							showConnectionModal = false;
						}}
						class="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
					>
						Connect USB Consumer
					</button>
					<button
						onclick={async () => {
							await selectedRobot?.setConsumer({
								type: "remote",
								url: settings.transportServerUrl
									.replace("http://", "ws://")
									.replace("https://", "wss://"),
								robotId: selectedRobot.id
							});
							showConnectionModal = false;
						}}
						class="w-full rounded-md bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
					>
						Connect Transport Consumer
					</button>
				{:else if modalType === "producer"}
					<button
						onclick={async () => {
							await selectedRobot?.addProducer({ type: "usb", baudRate: 1000000 });
							showConnectionModal = false;
						}}
						class="w-full rounded-md bg-green-600 px-4 py-2 text-white hover:bg-green-700"
					>
						Connect USB Producer
					</button>
					<button
						onclick={async () => {
							await selectedRobot?.addProducer({
								type: "remote",
								url: settings.transportServerUrl
									.replace("http://", "ws://")
									.replace("https://", "wss://"),
								robotId: selectedRobot.id
							});
							showConnectionModal = false;
						}}
						class="w-full rounded-md bg-orange-600 px-4 py-2 text-white hover:bg-orange-700"
					>
						Connect Transport Producer
					</button>
				{:else}
					<p class="text-gray-300">Manual control interface would go here</p>
				{/if}
			</div>

			<div class="text-center text-xs text-slate-500">
				{#if modalType !== "manual"}
					Note: USB connections will prompt for calibration if needed
				{/if}
			</div>
		</div>
	</div>
{/if}
