<script lang="ts">
	import * as Dialog from "@/components/ui/dialog";
	import { Button } from "@/components/ui/button";
	import * as Card from "@/components/ui/card";
	import { Badge } from "@/components/ui/badge";
	import { toast } from "svelte-sonner";
	import type { RemoteCompute } from "$lib/elements/compute//RemoteCompute.svelte";
	import { robotManager } from "$lib/elements/robot/RobotManager.svelte";

	interface Props {
		workspaceId: string;
		open: boolean;
		compute: RemoteCompute;
	}

	let { open = $bindable(), compute, workspaceId }: Props = $props();

	let isConnecting = $state(false);
	let selectedRobotId = $state("");
	let robotProducer: any = null;
	let connectedRobotId = $state<string | null>(null);

	// Get available robots from robot manager
	const robots = $derived(robotManager.robots);

	async function handleConnectRobotInput() {
		if (!compute.hasSession) {
			toast.error("No Inference Session available. Create a session first.");
			return;
		}

		if (!selectedRobotId) {
			toast.error("Please select a robot to connect.");
			return;
		}

		isConnecting = true;
		try {
			// Get the joint input room ID from the Inference Session
			const jointInputRoomId = compute.sessionData?.joint_input_room_id;
			if (!jointInputRoomId) {
				throw new Error("No joint input room found in Inference Session");
			}

			// Find the selected robot
			const robot = robotManager.robots.find((r) => r.id === selectedRobotId);
			if (!robot) {
				throw new Error(`Robot ${selectedRobotId} not found`);
			}

			// Connect robot as PRODUCER to the joint input room (robot sends joint states TO AI)
			await robotManager.connectProducerToRoom(workspaceId, selectedRobotId, jointInputRoomId);

			connectedRobotId = selectedRobotId;

			toast.success("Robot input connected to Inference Session", {
				description: `Robot ${selectedRobotId} now sends joint data to AI`
			});
		} catch (error) {
			console.error("Robot input connection error:", error);
			toast.error("Failed to connect robot input", {
				description: error instanceof Error ? error.message : "Unknown error"
			});
		} finally {
			isConnecting = false;
		}
	}

	async function handleDisconnectRobotInput() {
		if (!connectedRobotId) return;

		try {
			// Find the connected robot
			const robot = robotManager.robots.find((r) => r.id === connectedRobotId);
			if (robot) {
				// Disconnect producer from the joint input room
				for (const producer of robot.producers) {
					await robot.removeProducer(producer.id);
				}
			}

			connectedRobotId = null;
			toast.success("Robot input disconnected");
		} catch (error) {
			console.error("Disconnect error:", error);
			toast.error("Error disconnecting robot input");
		}
	}

	// Cleanup on modal close
	$effect(() => {
		if (!open) {
			// Don't auto-disconnect when modal closes, user might want to keep connection
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="max-h-[80vh] max-w-xl overflow-y-auto border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
	>
		<Dialog.Header class="pb-3">
			<Dialog.Title
				class="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100"
			>
				<span class="icon-[mdi--robot-industrial] size-5 text-amber-500 dark:text-amber-400"></span>
				Robot Input - {compute.name || "No Compute Selected"}
			</Dialog.Title>
			<Dialog.Description class="text-sm text-slate-600 dark:text-slate-400">
				Connect robot joint data as input for AI inference
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<!-- Inference Session Status -->
			<div
				class="flex items-center justify-between rounded-lg border border-purple-300/30 bg-purple-100/20 p-3 dark:border-purple-500/30 dark:bg-purple-900/20"
			>
				<div class="flex items-center gap-2">
					<span class="icon-[mdi--brain] size-4 text-purple-500 dark:text-purple-400"></span>
					<span class="text-sm font-medium text-purple-700 dark:text-purple-300"
						>Inference Session</span
					>
				</div>
				{#if compute.hasSession}
					<Badge variant="default" class="bg-purple-500 text-xs dark:bg-purple-600">
						{compute.statusInfo.statusText}
					</Badge>
				{:else}
					<Badge variant="secondary" class="text-xs text-slate-600 dark:text-slate-400"
						>No Session</Badge
					>
				{/if}
			</div>

			{#if !compute.hasSession}
				<Card.Root
					class="border-yellow-300/30 bg-yellow-100/5 dark:border-yellow-500/30 dark:bg-yellow-500/5"
				>
					<Card.Header>
						<Card.Title
							class="flex items-center gap-2 text-base text-yellow-700 dark:text-yellow-200"
						>
							<span class="icon-[mdi--alert] size-4"></span>
							Inference Session Required
						</Card.Title>
					</Card.Header>
					<Card.Content class="text-sm text-yellow-700 dark:text-yellow-300">
						You need to create an Inference Session before connecting robot inputs. The session
						provides a joint input room for receiving robot data.
					</Card.Content>
				</Card.Root>
			{:else}
				<!-- Robot Selection and Connection -->
				<Card.Root
					class="border-amber-300/30 bg-amber-100/5 dark:border-amber-500/30 dark:bg-amber-500/5"
				>
					<Card.Header>
						<Card.Title
							class="flex items-center gap-2 text-base text-amber-700 dark:text-amber-200"
						>
							<span class="icon-[mdi--robot-industrial] size-4"></span>
							Robot Input Connection
						</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<!-- Available Robots -->
						<div class="space-y-2">
							<div class="text-sm font-medium text-amber-700 dark:text-amber-300">
								Available Robots:
							</div>
							<div class="max-h-40 space-y-2 overflow-y-auto">
								{#if robots.length === 0}
									<div class="py-4 text-center text-sm text-slate-600 dark:text-slate-400">
										No robots available. Add robots first.
									</div>
								{:else}
									{#each robots as robot}
										<button
											onclick={() => (selectedRobotId = robot.id)}
											class="w-full rounded border p-3 text-left {selectedRobotId === robot.id
												? 'border-amber-400 bg-amber-100/20 dark:border-amber-500 dark:bg-amber-500/20'
												: 'border-slate-300 bg-slate-50/50 hover:bg-slate-100/50 dark:border-slate-600 dark:bg-slate-800/50 dark:hover:bg-slate-700/50'}"
										>
											<div class="flex items-center justify-between">
												<div>
													<div class="text-xs text-slate-600 dark:text-slate-400">
														ID: {robot.id}
													</div>
													<div class="text-xs text-slate-600 dark:text-slate-400">
														Producers: {robot.producers.length}
													</div>
												</div>
												<div class="flex items-center gap-2">
													{#if robot.producers.length > 0}
														<Badge variant="default" class="bg-green-500 text-xs dark:bg-green-600">
															Active
														</Badge>
													{:else}
														<Badge variant="secondary" class="text-xs">Available</Badge>
													{/if}
												</div>
											</div>
										</button>
									{/each}
								{/if}
							</div>
						</div>

						<!-- Connection Status -->
						{#if selectedRobotId}
							<div
								class="rounded-lg border border-amber-300/30 bg-amber-100/20 p-3 dark:border-amber-500/30 dark:bg-amber-900/20"
							>
								<div class="flex items-center justify-between">
									<div>
										<p class="text-sm font-medium text-amber-700 dark:text-amber-300">
											Selected Robot: {selectedRobotId}
										</p>
										<p class="text-xs text-amber-600/70 dark:text-amber-400/70">
											{connectedRobotId === selectedRobotId ? "Connected to AI" : "Not Connected"}
										</p>
									</div>
									{#if connectedRobotId !== selectedRobotId}
										<Button
											variant="default"
											size="sm"
											onclick={handleConnectRobotInput}
											disabled={isConnecting}
											class="bg-amber-500 text-xs hover:bg-amber-600 disabled:opacity-50 dark:bg-amber-600 dark:hover:bg-amber-700"
										>
											{#if isConnecting}
												<span class="icon-[mdi--loading] mr-1 size-3 animate-spin"></span>
												Connecting...
											{:else}
												<span class="icon-[mdi--link] mr-1 size-3"></span>
												Connect Input
											{/if}
										</Button>
									{:else}
										<Button
											variant="destructive"
											size="sm"
											onclick={handleDisconnectRobotInput}
											class="text-xs"
										>
											<span class="icon-[mdi--close-circle] mr-1 size-3"></span>
											Disconnect
										</Button>
									{/if}
								</div>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Session Joint Input Details -->
				<Card.Root
					class="border-blue-300/30 bg-blue-100/5 dark:border-blue-500/30 dark:bg-blue-500/5"
				>
					<Card.Header>
						<Card.Title class="flex items-center gap-2 text-base text-blue-700 dark:text-blue-200">
							<span class="icon-[mdi--information] size-4"></span>
							Data Flow: Robot → Inference Session
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-2 text-xs">
							<div
								class="flex items-center justify-between rounded bg-slate-100/50 p-2 dark:bg-slate-800/50"
							>
								<span class="font-medium text-blue-700 dark:text-blue-300">Joint Input Room:</span>
								<span class="font-mono text-blue-800 dark:text-blue-200"
									>{compute.sessionData?.joint_input_room_id}</span
								>
							</div>
							<div class="text-xs text-slate-600 dark:text-slate-400">
								The robot will act as a <strong>PRODUCER</strong> and send its current joint positions
								to this room for AI processing. The inference server receives this data as a CONSUMER.
								All joint values should be normalized (-100 to +100 for most joints, 0 to 100 for gripper).
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Connection Status -->
				{#if connectedRobotId}
					<Card.Root
						class="border-green-300/30 bg-green-100/5 dark:border-green-500/30 dark:bg-green-500/5"
					>
						<Card.Header>
							<Card.Title
								class="flex items-center gap-2 text-base text-green-700 dark:text-green-200"
							>
								<span class="icon-[mdi--check-circle] size-4"></span>
								Active Connection
							</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="text-sm text-green-700 dark:text-green-300">
								Robot <span class="font-mono">{connectedRobotId}</span> is now sending joint data to
								the Inference Session as a producer. The AI model will use this data along with camera
								inputs for inference.
							</div>
						</Card.Content>
					</Card.Root>
				{/if}
			{/if}

			<!-- Quick Info -->
			<div
				class="rounded border border-slate-300 bg-slate-100/30 p-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-500"
			>
				<span class="icon-[mdi--information] mr-1 size-3"></span>
				Robot input: Robot acts as PRODUCER sending joint positions → Inference server acts as CONSUMER
				receiving data for processing.
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
