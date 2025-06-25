<script lang="ts">
	import type { Robot } from "$lib/elements/robot/Robot.svelte.js";
	import * as Alert from "@/components/ui/alert";
	import { Badge } from "@/components/ui/badge";
	import { Button } from "@/components/ui/button";
	import * as Card from "@/components/ui/card";
	import * as Dialog from "@/components/ui/dialog";
	import { Separator } from "@/components/ui/separator";
	import { toast } from "svelte-sonner";
	import { settings } from "$lib/runes/settings.svelte";
	import USBCalibrationPanel from "$lib/elements/robot/calibration/USBCalibrationPanel.svelte";
	import { robotManager } from "$lib/elements/robot/RobotManager.svelte.js";

	interface Props {
		workspaceId: string;
		open: boolean;
		robot: Robot;
	}

	let { open = $bindable(), robot, workspaceId }: Props = $props();

	// Connection state
	let isConnecting = $state(false);
	let error = $state<string | null>(null);

	// USB connection flow state
	let showUSBCalibration = $state(false);
	let pendingUSBConnection: "output" | null = $state(null);

	// Room management state
	let selectedRoomId = $state("");
	let customRoomId = $state("");
	let hasLoadedRooms = $state(false);

	// Reactive state from robot
	const outputDriverCount = $derived(robot.outputDriverCount);
	const producers = $derived(robot.producers);

	// Auto-load rooms when modal opens (only once per modal session)
	$effect(() => {
		if (open && !hasLoadedRooms && !robotManager.roomsLoading) {
			refreshRooms();
			hasLoadedRooms = true;
		}

		// Reset when modal closes
		if (!open) {
			hasLoadedRooms = false;
			error = null;
		}
	});

	// Set up calibration completion callback
	$effect(() => {
		robot.calibrationManager.onCalibrationCompleteWithPositions((finalPositions) => {
			robot.syncToCalibrationPositions(finalPositions);
		});
	});

	// Room management functions
	async function refreshRooms() {
		try {
			error = null;
			await robotManager.refreshRooms(workspaceId);
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to refresh rooms";
		}
	}

	async function createRoom() {
		try {
			isConnecting = true;
			error = null;
			const roomId = customRoomId.trim() || robot.id;
			const result = await robotManager.createRoboticsRoom(workspaceId, roomId);

			if (result.success) {
				customRoomId = "";
				await refreshRooms();
				toast.success("Room Created", {
					description: `Successfully created room ${result.roomId}`
				});
			} else {
				error = result.error || "Failed to create room";
			}
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to create room";
		} finally {
			isConnecting = false;
		}
	}

	async function joinRoomAsOutput() {
		if (!selectedRoomId) {
			error = "Please select a room";
			return;
		}

		try {
			isConnecting = true;
			error = null;
			await robotManager.connectProducerToRoom(workspaceId, robot.id, selectedRoomId);
			toast.success("Joined Room as Output", {
				description: `Successfully joined room ${selectedRoomId} - now sending commands`
			});
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to join room as output";
		} finally {
			isConnecting = false;
		}
	}

	async function createRoomAndJoinAsOutput() {
		try {
			isConnecting = true;
			error = null;
			const roomId = customRoomId.trim() || robot.id;
			const result = await robotManager.connectProducerAsProducer(workspaceId, robot.id, roomId);

			if (result.success) {
				customRoomId = "";
				await refreshRooms();
				toast.success("Room Created & Joined", {
					description: `Successfully created and joined room ${result.roomId} - ready to send commands`
				});
			} else {
				error = result.error || "Failed to create room and join as output";
			}
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to create room and join as output";
		} finally {
			isConnecting = false;
		}
	}

	async function connectUSBOutput() {
		try {
			isConnecting = true;
			error = null;

			// Check if calibration is needed
			if (robot.calibrationManager.needsCalibration) {
				pendingUSBConnection = "output";
				showUSBCalibration = true;
				return;
			}

			await robot.addProducer({
				type: "usb",
				baudRate: 1000000
			});

			toast.success("USB Output Connected", {
				description: "Successfully connected to physical robot hardware"
			});
		} catch (err) {
			error = err instanceof Error ? err.message : "Unknown error";
			toast.error("Failed to Connect USB Output", {
				description: `Could not connect to robot hardware: ${error}`
			});
		} finally {
			isConnecting = false;
		}
	}

	async function disconnectOutput(producerId: string) {
		try {
			isConnecting = true;
			error = null;
			await robot.removeProducer(producerId);

			toast.success("Output Disconnected", {
				description: "Successfully disconnected output"
			});
		} catch (err) {
			error = err instanceof Error ? err.message : "Unknown error";
			toast.error("Failed to Disconnect Output", {
				description: `Could not disconnect output: ${error}`
			});
		} finally {
			isConnecting = false;
		}
	}

	// Handle calibration completion
	async function onCalibrationComplete() {
		showUSBCalibration = false;

		if (pendingUSBConnection === "output") {
			await connectUSBOutput();
		}

		pendingUSBConnection = null;
	}

	function onCalibrationCancel() {
		showUSBCalibration = false;
		pendingUSBConnection = null;
		isConnecting = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="max-h-[85vh] max-w-4xl overflow-hidden border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
	>
		<Dialog.Header class="pb-3">
			<Dialog.Title
				class="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100"
			>
				<span class="icon-[mdi--devices] size-5 text-blue-500 dark:text-blue-400"></span>
				Output Connection - Robot {robot.id}
			</Dialog.Title>
			<Dialog.Description class="text-sm text-slate-600 dark:text-slate-400">
				Configure where this robot sends its movements. Multiple outputs can be active
				simultaneously.
			</Dialog.Description>
		</Dialog.Header>

		<div class="max-h-[calc(85vh-10rem)] overflow-y-auto">
			<div class="space-y-4 pb-4">
				<!-- Error display -->
				{#if error}
					<Alert.Root
						class="border-red-300/30 bg-red-100/20 dark:border-red-500/30 dark:bg-red-900/20"
					>
						<span class="icon-[mdi--alert-circle] size-4 text-red-500 dark:text-red-400"></span>
						<Alert.Title class="text-red-700 dark:text-red-300">Connection Error</Alert.Title>
						<Alert.Description class="text-sm text-red-600 dark:text-red-400">
							{error}
						</Alert.Description>
					</Alert.Root>
				{/if}

				<!-- USB Calibration Panel -->
				{#if showUSBCalibration}
					<Card.Root
						class="border-orange-300/30 bg-orange-100/20 dark:border-orange-500/30 dark:bg-orange-900/20"
					>
						<Card.Header>
							<div class="flex items-center justify-between">
								<Card.Title class="text-lg font-semibold text-orange-700 dark:text-orange-200">
									Hardware Calibration Required
								</Card.Title>
								<button
									onclick={onCalibrationCancel}
									class="text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-white"
								>
									✕
								</button>
							</div>
						</Card.Header>
						<Card.Content class="space-y-4">
							<Alert.Root
								class="border-orange-300/30 bg-orange-100/10 dark:border-orange-500/30 dark:bg-orange-500/10"
							>
								<span class="icon-[mdi--information] size-4 text-orange-500 dark:text-orange-400"
								></span>
								<Alert.Description class="text-sm text-orange-700 dark:text-orange-200">
									Before connecting to the physical robot, calibration is required to map the servo
									positions to software values. This ensures accurate control.
								</Alert.Description>
							</Alert.Root>

							<USBCalibrationPanel
								calibrationManager={robot.calibrationManager}
								connectionType="producer"
								{onCalibrationComplete}
								onCancel={onCalibrationCancel}
							/>
						</Card.Content>
					</Card.Root>
				{:else}
					<!-- Current Status Overview -->
					<Card.Root
						class="border-blue-300/30 bg-blue-100/20 dark:border-blue-500/30 dark:bg-blue-900/20"
					>
						<Card.Content class="p-4">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<span class="icon-[mdi--broadcast] size-4 text-blue-500 dark:text-blue-400"
									></span>
									<span class="text-sm font-medium text-blue-700 dark:text-blue-300"
										>Active Outputs</span
									>
								</div>
								<Badge variant="default" class="bg-blue-500 text-xs dark:bg-blue-600">
									{outputDriverCount} Connected
								</Badge>
							</div>
						</Card.Content>
					</Card.Root>

					<!-- Local Hardware Connection -->
					<Card.Root
						class="border-green-300/30 bg-green-100/5 dark:border-green-500/30 dark:bg-green-500/5"
					>
						<Card.Header>
							<Card.Title
								class="flex items-center gap-2 text-base text-green-700 dark:text-green-200"
							>
								<span class="icon-[mdi--usb-port] size-4"></span>
								Local Hardware (USB)
							</Card.Title>
							<Card.Description class="text-xs text-green-600/70 dark:text-green-300/70">
								Send commands directly to physical robot hardware
							</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-3">
							<Button
								variant="secondary"
								onclick={connectUSBOutput}
								disabled={isConnecting}
								class="w-full bg-green-500 text-sm text-white hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
							>
								<span class="icon-[mdi--usb] mr-2 size-4"></span>
								{isConnecting ? "Connecting..." : "Add USB Output"}
							</Button>
						</Card.Content>
					</Card.Root>

					<!-- Remote Collaboration -->
					<Card.Root
						class="border-orange-300/30 bg-orange-100/5 dark:border-orange-500/30 dark:bg-orange-500/5"
					>
						<Card.Header>
							<div class="flex items-center justify-between">
								<div>
									<Card.Title
										class="flex items-center gap-2 text-base text-orange-700 dark:text-orange-200"
									>
										<span class="icon-[mdi--cloud-sync] size-4"></span>
										Remote Collaboration (Rooms)
									</Card.Title>
									<Card.Description class="text-xs text-orange-600/70 dark:text-orange-300/70">
										Broadcast robot movements to remote systems and AI
									</Card.Description>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onclick={refreshRooms}
									disabled={robotManager.roomsLoading || isConnecting}
									class="h-7 px-2 text-xs text-orange-700 hover:bg-orange-200/20 hover:text-orange-800 dark:text-orange-300 dark:hover:bg-orange-500/20 dark:hover:text-orange-200"
								>
									{#if robotManager.roomsLoading}
										<span class="icon-[mdi--loading] mr-1 size-3 animate-spin"></span>
										Refreshing
									{:else}
										<span class="icon-[mdi--refresh] mr-1 size-3"></span>
										Refresh
									{/if}
								</Button>
							</div>
						</Card.Header>
						<Card.Content class="space-y-4">
							<!-- Create New Room -->
							<div
								class="rounded border-2 border-dashed border-green-400/50 bg-green-100/5 p-3 dark:border-green-500/50 dark:bg-green-500/5"
							>
								<div class="space-y-2">
									<div class="flex items-center gap-2">
										<span class="icon-[mdi--plus-circle] size-4 text-green-500 dark:text-green-400"
										></span>
										<p class="text-sm font-medium text-green-700 dark:text-green-300">
											Create New Room
										</p>
									</div>
									<p class="text-xs text-green-600/70 dark:text-green-400/70">
										Create a room to broadcast this robot's movements
									</p>
									<input
										bind:value={customRoomId}
										placeholder={`Room ID (default: ${robot.id})`}
										disabled={isConnecting}
										class="w-full rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-900 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
									/>
									<div class="flex gap-1">
										<Button
											variant="secondary"
											size="sm"
											onclick={createRoom}
											disabled={isConnecting}
											class="h-6 bg-green-500 px-2 text-xs hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
										>
											Create Only
										</Button>
										<Button
											variant="secondary"
											size="sm"
											onclick={createRoomAndJoinAsOutput}
											disabled={isConnecting}
											class="h-6 bg-green-500 px-2 text-xs hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700"
										>
											Create & Join as Output
										</Button>
									</div>
								</div>
							</div>

							<!-- Existing Rooms -->
							<div class="space-y-2">
								<div class="flex items-center justify-between">
									<span class="text-xs font-medium text-orange-700 dark:text-orange-300"
										>Join Existing Room:</span
									>
									<span class="text-xs text-slate-600 dark:text-slate-400">
										{robotManager.rooms.length} room{robotManager.rooms.length !== 1 ? "s" : ""} available
									</span>
								</div>

								<div class="max-h-40 space-y-2 overflow-y-auto">
									{#if robotManager.rooms.length === 0}
										<div class="py-3 text-center text-xs text-slate-600 dark:text-slate-400">
											{robotManager.roomsLoading
												? "Loading rooms..."
												: "No rooms available. Create one to get started."}
										</div>
									{:else}
										{#each robotManager.rooms as room}
											<div
												class="rounded border border-slate-300 bg-slate-50/50 p-2 dark:border-slate-600 dark:bg-slate-800/50"
											>
												<div class="flex items-start justify-between gap-3">
													<div class="min-w-0 flex-1">
														<p
															class="truncate text-xs font-medium text-slate-800 dark:text-slate-200"
														>
															{room.id}
														</p>
														<div class="flex gap-3 text-xs text-slate-600 dark:text-slate-400">
															<span>{room.has_producer ? "🔴 Occupied" : "🟢 Available"}</span>
															<span>👥 {room.participants?.total || 0} users</span>
														</div>
													</div>
													{#if !room.has_producer}
														<Button
															variant="secondary"
															size="sm"
															onclick={() => {
																selectedRoomId = room.id;
																joinRoomAsOutput();
															}}
															disabled={isConnecting}
															class="h-6 shrink-0 bg-orange-500 px-2 text-xs hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700"
														>
															<span class="icon-[mdi--login] mr-1 size-3"></span>
															Join as Output
														</Button>
													{:else}
														<Button
															variant="ghost"
															size="sm"
															disabled
															class="h-6 shrink-0 px-2 text-xs opacity-50"
														>
															Occupied
														</Button>
													{/if}
												</div>
											</div>
										{/each}
									{/if}
								</div>
							</div>
						</Card.Content>
					</Card.Root>

					<!-- Connected Outputs -->
					{#if producers.length > 0}
						<Card.Root
							class="border-blue-300/30 bg-blue-100/5 dark:border-blue-500/30 dark:bg-blue-500/5"
						>
							<Card.Header>
								<Card.Title
									class="flex items-center gap-2 text-base text-blue-700 dark:text-blue-200"
								>
									<span class="icon-[mdi--connection] size-4"></span>
									Connected Outputs
								</Card.Title>
							</Card.Header>
							<Card.Content>
								<div class="max-h-32 space-y-2 overflow-y-auto">
									{#each producers as producer}
										<div
											class="flex items-center justify-between rounded-md bg-slate-100/50 p-2 dark:bg-slate-700/50"
										>
											<div class="flex items-center gap-2">
												<span
													class="size-2 rounded-full {producer.status.isConnected
														? 'bg-green-500 dark:bg-green-400'
														: 'bg-red-500 dark:bg-red-400'}"
												></span>
												<span class="text-sm text-slate-700 dark:text-slate-300"
													>{producer.name}</span
												>
												<Badge variant="secondary" class="text-xs">{producer.id.slice(0, 12)}</Badge
												>
											</div>
											<Button
												variant="destructive"
												size="sm"
												onclick={() => disconnectOutput(producer.id)}
												disabled={isConnecting}
												class="h-6 px-2 text-xs"
											>
												<span class="icon-[mdi--close] size-3"></span>
											</Button>
										</div>
									{/each}
								</div>
							</Card.Content>
						</Card.Root>
					{/if}

					<!-- Help Information -->
					<Alert.Root
						class="border-slate-300 bg-slate-100/30 dark:border-slate-700 dark:bg-slate-800/30"
					>
						<span class="icon-[mdi--help-circle] size-4 text-slate-600 dark:text-slate-400"></span>
						<Alert.Title class="text-slate-700 dark:text-slate-300">Output Sources</Alert.Title>
						<Alert.Description class="text-xs text-slate-600 dark:text-slate-400">
							<strong>USB:</strong> Control physical hardware • <strong>Remote:</strong> Broadcast to
							network • Multiple outputs can be active
						</Alert.Description>
					</Alert.Root>
				{/if}
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
