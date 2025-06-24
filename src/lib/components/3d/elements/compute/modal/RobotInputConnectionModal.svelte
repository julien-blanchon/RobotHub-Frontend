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
	let selectedRobotId = $state('');
	let robotProducer: any = null;
	let connectedRobotId = $state<string | null>(null);

	// Get available robots from robot manager
	const robots = $derived(robotManager.robots);

	async function handleConnectRobotInput() {
		if (!compute.hasSession) {
			toast.error('No AI session available. Create a session first.');
			return;
		}

		if (!selectedRobotId) {
			toast.error('Please select a robot to connect.');
			return;
		}

		isConnecting = true;
		try {
			// Get the joint input room ID from the AI session
			const jointInputRoomId = compute.sessionData?.joint_input_room_id;
			if (!jointInputRoomId) {
				throw new Error('No joint input room found in AI session');
			}

			// Find the selected robot
			const robot = robotManager.robots.find(r => r.id === selectedRobotId);
			if (!robot) {
				throw new Error(`Robot ${selectedRobotId} not found`);
			}

			// Connect robot as PRODUCER to the joint input room (robot sends joint states TO AI)
			await robotManager.connectProducerToRoom(workspaceId, selectedRobotId, jointInputRoomId);

			connectedRobotId = selectedRobotId;

			toast.success('Robot input connected to AI session', {
				description: `Robot ${selectedRobotId} now sends joint data to AI`
			});

		} catch (error) {
			console.error('Robot input connection error:', error);
			toast.error('Failed to connect robot input', {
				description: error instanceof Error ? error.message : 'Unknown error'
			});
		} finally {
			isConnecting = false;
		}
	}

	async function handleDisconnectRobotInput() {
		if (!connectedRobotId) return;

		try {
			// Find the connected robot
			const robot = robotManager.robots.find(r => r.id === connectedRobotId);
			if (robot) {
				// Disconnect producer from the joint input room
				for (const producer of robot.producers) {
					await robot.removeProducer(producer.id);
				}
			}

			connectedRobotId = null;
			toast.success('Robot input disconnected');
		} catch (error) {
			console.error('Disconnect error:', error);
			toast.error('Error disconnecting robot input');
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
		class="max-h-[80vh] max-w-xl overflow-y-auto border-slate-600 bg-slate-900 text-slate-100"
	>
		<Dialog.Header class="pb-3">
			<Dialog.Title class="flex items-center gap-2 text-lg font-bold text-slate-100">
				<span class="icon-[mdi--robot-industrial] size-5 text-amber-400"></span>
				Robot Input - {compute.name || 'No Compute Selected'}
			</Dialog.Title>
			<Dialog.Description class="text-sm text-slate-400">
				Connect robot joint data as input for AI inference
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<!-- AI Session Status -->
			<div
				class="flex items-center justify-between rounded-lg border border-purple-500/30 bg-purple-900/20 p-3"
			>
				<div class="flex items-center gap-2">
					<span class="icon-[mdi--brain] size-4 text-purple-400"></span>
					<span class="text-sm font-medium text-purple-300">AI Session</span>
				</div>
				{#if compute.hasSession}
					<Badge variant="default" class="bg-purple-600 text-xs">
						{compute.statusInfo.statusText}
					</Badge>
				{:else}
					<Badge variant="secondary" class="text-xs text-slate-400">No Session</Badge>
				{/if}
			</div>

			{#if !compute.hasSession}
				<Card.Root class="border-yellow-500/30 bg-yellow-500/5">
					<Card.Header>
						<Card.Title class="flex items-center gap-2 text-base text-yellow-200">
							<span class="icon-[mdi--alert] size-4"></span>
							AI Session Required
						</Card.Title>
					</Card.Header>
					<Card.Content class="text-sm text-yellow-300">
						You need to create an AI session before connecting robot inputs.
						The session provides a joint input room for receiving robot data.
					</Card.Content>
				</Card.Root>
			{:else}
				<!-- Robot Selection and Connection -->
				<Card.Root class="border-amber-500/30 bg-amber-500/5">
					<Card.Header>
						<Card.Title class="flex items-center gap-2 text-base text-amber-200">
							<span class="icon-[mdi--robot-industrial] size-4"></span>
							Robot Input Connection
						</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<!-- Available Robots -->
						<div class="space-y-2">
							<div class="text-sm font-medium text-amber-300">Available Robots:</div>
							<div class="max-h-40 overflow-y-auto space-y-2">
								{#if robots.length === 0}
									<div class="text-center py-4 text-sm text-slate-400">
										No robots available. Add robots first.
									</div>
								{:else}
									{#each robots as robot}
										<button
											onclick={() => selectedRobotId = robot.id}
											class="w-full p-3 rounded border text-left {selectedRobotId === robot.id 
												? 'border-amber-500 bg-amber-500/20' 
												: 'border-slate-600 bg-slate-800/50 hover:bg-slate-700/50'}"
										>
											<div class="flex items-center justify-between">
												<div>
													<div class="text-xs text-slate-400">
														ID: {robot.id}
													</div>
													<div class="text-xs text-slate-400">
														Producers: {robot.producers.length}
													</div>
												</div>
												<div class="flex items-center gap-2">
													{#if robot.producers.length > 0}
														<Badge variant="default" class="bg-green-600 text-xs">
															Active
														</Badge>
													{:else}
														<Badge variant="secondary" class="text-xs">
															Available
														</Badge>
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
							<div class="rounded-lg border border-amber-500/30 bg-amber-900/20 p-3">
								<div class="flex items-center justify-between">
									<div>
										<p class="text-sm font-medium text-amber-300">
											Selected Robot: {selectedRobotId}
										</p>
										<p class="text-xs text-amber-400/70">
											{connectedRobotId === selectedRobotId ? 'Connected to AI' : 'Not Connected'}
										</p>
									</div>
									{#if connectedRobotId !== selectedRobotId}
										<Button
											variant="default"
											size="sm"
											onclick={handleConnectRobotInput}
											disabled={isConnecting}
											class="bg-amber-600 hover:bg-amber-700 text-xs disabled:opacity-50"
										>
											{#if isConnecting}
												<span class="icon-[mdi--loading] animate-spin mr-1 size-3"></span>
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
				<Card.Root class="border-blue-500/30 bg-blue-500/5">
					<Card.Header>
						<Card.Title class="flex items-center gap-2 text-base text-blue-200">
							<span class="icon-[mdi--information] size-4"></span>
							Data Flow: Robot → AI Session
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-2 text-xs">
							<div class="flex justify-between items-center p-2 rounded bg-slate-800/50">
								<span class="text-blue-300 font-medium">Joint Input Room:</span>
								<span class="text-blue-200 font-mono">{compute.sessionData?.joint_input_room_id}</span>
							</div>
							<div class="text-slate-400 text-xs">
								The robot will act as a <strong>PRODUCER</strong> and send its current joint positions to this room for AI processing.
								The inference server receives this data as a CONSUMER.
								All joint values should be normalized (-100 to +100 for most joints, 0 to 100 for gripper).
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Connection Status -->
				{#if connectedRobotId}
					<Card.Root class="border-green-500/30 bg-green-500/5">
						<Card.Header>
							<Card.Title class="flex items-center gap-2 text-base text-green-200">
								<span class="icon-[mdi--check-circle] size-4"></span>
								Active Connection
							</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="text-sm text-green-300">
								Robot <span class="font-mono">{connectedRobotId}</span> is now sending joint data to the AI session as a producer.
								The AI model will use this data along with camera inputs for inference.
							</div>
						</Card.Content>
					</Card.Root>
				{/if}
			{/if}

			<!-- Quick Info -->
			<div class="rounded border border-slate-700 bg-slate-800/30 p-2 text-xs text-slate-500">
				<span class="icon-[mdi--information] mr-1 size-3"></span>
				Robot input: Robot acts as PRODUCER sending joint positions → Inference server acts as CONSUMER receiving data for processing.
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root> 