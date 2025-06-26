<script lang="ts">
	import * as Dialog from "@/components/ui/dialog";
	import { Button } from "@/components/ui/button";
	import * as Card from "@/components/ui/card";
	import * as Alert from "@/components/ui/alert";
	import { Badge } from "@/components/ui/badge";
	import { toast } from "svelte-sonner";

	import type { Robot } from "$lib/elements/robot/Robot.svelte.js";
	import { robotManager } from "$lib/elements/robot/RobotManager.svelte.js";
	import USBCalibrationPanel from "$lib/elements/robot/calibration/USBCalibrationPanel.svelte";

	interface Props {
		workspaceId: string;
		open: boolean;
		robot: Robot;
	}

	let { open = $bindable(), robot, workspaceId }: Props = $props();

	let isConnecting = $state(false);
	let error = $state<string | null>(null);
	let showUSBCalibration = $state(false);
	let pendingUSBConnection: "input" | null = $state(null);
	let selectedRoomId = $state("");
	let customRoomId = $state("");
	let showRoomManagement = $state(true);
	let hasLoadedRooms = $state(false);

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

	async function joinRoomAsInput() {
		if (!selectedRoomId) {
			error = "Please select a room";
			return;
		}

		try {
			isConnecting = true;
			error = null;
			await robotManager.connectConsumerToRoom(workspaceId, robot.id, selectedRoomId);
			toast.success("Joined Room as Input", {
				description: `Successfully joined room ${selectedRoomId} - now receiving commands`
			});
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to join room as input";
		} finally {
			isConnecting = false;
		}
	}

	async function createRoomAndJoinAsInput() {
		try {
			isConnecting = true;
			error = null;
			const roomId = customRoomId.trim() || robot.id;
			const result = await robotManager.createRoboticsRoom(workspaceId, roomId);

			if (result.success) {
				await robotManager.connectConsumerToRoom(workspaceId, robot.id, result.roomId!);
				customRoomId = "";
				await refreshRooms();
				toast.success("Room Created & Joined", {
					description: `Successfully created and joined room ${result.roomId} - ready to receive commands`
				});
			} else {
				error = result.error || "Failed to create room and join as input";
			}
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to create room and join as input";
		} finally {
			isConnecting = false;
		}
	}

	async function connectUSBInput() {
		try {
			isConnecting = true;
			error = null;

			// Create USB consumer first, which will handle calibration internally
			await robot.setConsumer({
				type: "usb",
				baudRate: 1000000
			});

			// Check if the new consumer needs calibration
			const uncalibratedDrivers = robot.getUncalibratedUSBDrivers();
			if (uncalibratedDrivers.length > 0) {
				pendingUSBConnection = "input";
				showUSBCalibration = true;
				return;
			}

			toast.success("USB Input Connected", {
				description: "Successfully connected to physical robot hardware"
			});
		} catch (err) {
			error = err instanceof Error ? err.message : "Unknown error";
			toast.error("Failed to Connect USB Input", {
				description: `Could not connect to robot hardware: ${error}`
			});
		} finally {
			isConnecting = false;
		}
	}

	async function disconnectInput() {
		try {
			isConnecting = true;
			error = null;
			await robot.removeConsumer();

			toast.success("Input Disconnected", {
				description: "Successfully disconnected input source"
			});
		} catch (err) {
			error = err instanceof Error ? err.message : "Unknown error";
			toast.error("Failed to Disconnect Input", {
				description: `Could not disconnect input: ${error}`
			});
		} finally {
			isConnecting = false;
		}
	}

	async function onCalibrationComplete() {
		showUSBCalibration = false;
		pendingUSBConnection = null;

		toast.success("Calibration Complete", {
			description: "Hardware calibrated and ready for use"
		});
	}

	function onCalibrationCancel() {
		showUSBCalibration = false;
		pendingUSBConnection = null;
		isConnecting = false;
		
		// Clean up the uncalibrated USB consumer
		robot.removeConsumer().catch(err => {
			console.error("Failed to clean up USB consumer after calibration cancel:", err);
		});
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
				<span class="icon-[mdi--account-supervisor] size-5 text-green-500 dark:text-green-400"
				></span>
				Input Connection - Robot {robot.id}
			</Dialog.Title>
			<Dialog.Description class="text-sm text-slate-600 dark:text-slate-400">
				Configure how this robot receives commands. Choose between direct hardware control or remote
				collaboration.
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

							<!-- Show calibration panels for each uncalibrated USB driver -->
							{#each robot.getUncalibratedUSBDrivers() as usbDriver}
								<USBCalibrationPanel
									calibrationManager={usbDriver}
									connectionType="consumer"
									{onCalibrationComplete}
									onCancel={onCalibrationCancel}
								/>
							{:else}
								<div class="text-center text-slate-400">
									No USB drivers require calibration
								</div>
							{/each}
						</Card.Content>
					</Card.Root>
				{:else}
					<!-- Current Status Overview -->
					<Card.Root
						class="border-green-300/30 bg-green-100/20 dark:border-green-500/30 dark:bg-green-900/20"
					>
						<Card.Content class="p-4">
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<span class="icon-[mdi--connection] size-4 text-green-500 dark:text-green-400"
									></span>
									<span class="text-sm font-medium text-green-700 dark:text-green-300"
										>Current Input Source</span
									>
								</div>
								{#if robot.hasConsumer}
									<Badge variant="default" class="bg-green-500 text-xs dark:bg-green-600">
										{robot.consumer?.name || "Connected"}
									</Badge>
								{:else}
									<Badge variant="secondary" class="text-xs text-slate-600 dark:text-slate-400"
										>No Input Connected</Badge
									>
								{/if}
							</div>
							{#if robot.hasConsumer}
								<div class="mt-2 text-xs text-green-600/70 dark:text-green-400/70">
									Status: {robot.consumer?.status.isConnected ? "Connected" : "Disconnected"}
								</div>
							{/if}
						</Card.Content>
					</Card.Root>

					<!-- Local Hardware Connection -->
					<Card.Root
						class="border-blue-300/30 bg-blue-100/5 dark:border-blue-500/30 dark:bg-blue-500/5"
					>
						<Card.Header>
							<Card.Title
								class="flex items-center gap-2 text-base text-blue-700 dark:text-blue-200"
							>
								<span class="icon-[mdi--usb-port] size-4"></span>
								Local Hardware (USB)
							</Card.Title>
							<Card.Description class="text-xs text-blue-600/70 dark:text-blue-300/70">
								Read physical robot movements in real-time
							</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-3">
							{#if robot.hasConsumer && robot.consumer?.name === "USB Consumer"}
								<!-- USB Connected State -->
								<div
									class="rounded-lg border border-blue-300/30 bg-blue-100/20 p-3 dark:border-blue-500/30 dark:bg-blue-900/20"
								>
									<div class="flex items-center justify-between">
										<div>
											<p class="text-sm font-medium text-blue-700 dark:text-blue-300">
												Hardware Connected
											</p>
											<p class="text-xs text-blue-600/70 dark:text-blue-400/70">
												Reading physical servo positions
											</p>
										</div>
										<Button
											variant="destructive"
											size="sm"
											onclick={disconnectInput}
											disabled={isConnecting}
											class="h-7 px-2 text-xs"
										>
											<span class="icon-[mdi--close-circle] mr-1 size-3"></span>
											{isConnecting ? "Disconnecting..." : "Disconnect"}
										</Button>
									</div>
								</div>
							{:else}
								<!-- USB Connection Button -->
								<Button
									variant="secondary"
									onclick={connectUSBInput}
									disabled={isConnecting || robot.hasConsumer}
									class="w-full bg-blue-500 text-sm text-white hover:bg-blue-600 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
								>
									<span class="icon-[mdi--usb] mr-2 size-4"></span>
									{isConnecting ? "Connecting..." : "Connect to Hardware"}
								</Button>

								{#if robot.hasConsumer}
									<p class="text-xs text-slate-600 dark:text-slate-500">
										Disconnect current input to connect USB hardware
									</p>
								{/if}
							{/if}
						</Card.Content>
					</Card.Root>

					<!-- Remote Collaboration -->
					<Card.Root
						class="border-purple-300/30 bg-purple-100/5 dark:border-purple-500/30 dark:bg-purple-500/5"
					>
						<Card.Header>
							<div class="flex items-center justify-between">
								<div>
									<Card.Title
										class="flex items-center gap-2 text-base text-purple-700 dark:text-purple-200"
									>
										<span class="icon-[mdi--cloud-sync] size-4"></span>
										Remote Collaboration (Rooms)
									</Card.Title>
									<Card.Description class="text-xs text-purple-600/70 dark:text-purple-300/70">
										Receive commands from AI systems, remote users, or other software
									</Card.Description>
								</div>
								<Button
									variant="ghost"
									size="sm"
									onclick={refreshRooms}
									disabled={robotManager.roomsLoading || isConnecting}
									class="h-7 px-2 text-xs text-purple-700 hover:bg-purple-200/20 hover:text-purple-800 dark:text-purple-300 dark:hover:bg-purple-500/20 dark:hover:text-purple-200"
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
							{#if robot.hasConsumer && robot.consumer?.name?.includes("Remote Consumer")}
								<!-- Remote Connected State -->
								<div
									class="rounded-lg border border-purple-300/30 bg-purple-100/20 p-3 dark:border-purple-500/30 dark:bg-purple-900/20"
								>
									<div class="flex items-center justify-between">
										<div>
											<p class="text-sm font-medium text-purple-700 dark:text-purple-300">
												Room Connected
											</p>
											<p class="text-xs text-purple-600/70 dark:text-purple-400/70">
												Receiving remote commands
											</p>
										</div>
										<Button
											variant="destructive"
											size="sm"
											onclick={disconnectInput}
											disabled={isConnecting}
											class="h-7 px-2 text-xs"
										>
											<span class="icon-[mdi--close-circle] mr-1 size-3"></span>
											{isConnecting ? "Leaving..." : "Leave Room"}
										</Button>
									</div>
								</div>
							{:else}
								<!-- Create New Room -->
								<div
									class="rounded border-2 border-dashed border-green-400/50 bg-green-100/5 p-3 dark:border-green-500/50 dark:bg-green-500/5"
								>
									<div class="space-y-2">
										<div class="flex items-center gap-2">
											<span
												class="icon-[mdi--plus-circle] size-4 text-green-500 dark:text-green-400"
											></span>
											<p class="text-sm font-medium text-green-700 dark:text-green-300">
												Create New Room
											</p>
										</div>
										<p class="text-xs text-green-600/70 dark:text-green-400/70">
											Create a room where others can send commands to this robot
										</p>
										<input
											bind:value={customRoomId}
											placeholder={`Room ID (default: ${robot.id})`}
											disabled={isConnecting || robot.hasConsumer}
											class="w-full rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-900 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
										/>
										<div class="flex gap-1">
											<Button
												variant="secondary"
												size="sm"
												onclick={createRoom}
												disabled={isConnecting || robot.hasConsumer}
												class="h-6 bg-green-500 px-2 text-xs hover:bg-green-600 disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-700"
											>
												Create Only
											</Button>
											<Button
												variant="secondary"
												size="sm"
												onclick={createRoomAndJoinAsInput}
												disabled={isConnecting || robot.hasConsumer}
												class="h-6 bg-green-500 px-2 text-xs hover:bg-green-600 disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-700"
											>
												Create & Join as Input
											</Button>
										</div>
									</div>
								</div>

								<!-- Existing Rooms -->
								<div class="space-y-2">
									<div class="flex items-center justify-between">
										<span class="text-xs font-medium text-purple-700 dark:text-purple-300"
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
																<span>{room.has_producer ? "📤 Has Output" : "📥 No Output"}</span>
																<span>👥 {room.participants?.total || 0} users</span>
															</div>
														</div>
														<Button
															variant="secondary"
															size="sm"
															onclick={() => {
																selectedRoomId = room.id;
																joinRoomAsInput();
															}}
															disabled={isConnecting || robot.hasConsumer}
															class="h-6 shrink-0 bg-purple-500 px-2 text-xs hover:bg-purple-600 disabled:opacity-50 dark:bg-purple-600 dark:hover:bg-purple-700"
														>
															<span class="icon-[mdi--login] mr-1 size-3"></span>
															Join as Input
														</Button>
													</div>
												</div>
											{/each}
										{/if}
									</div>
								</div>

								{#if robot.hasConsumer}
									<p class="text-xs text-slate-600 dark:text-slate-500">
										Disconnect current input to join a room
									</p>
								{/if}
							{/if}
						</Card.Content>
					</Card.Root>

					<!-- Help Information -->
					<Alert.Root
						class="border-slate-300 bg-slate-100/30 dark:border-slate-700 dark:bg-slate-800/30"
					>
						<span class="icon-[mdi--help-circle] size-4 text-slate-600 dark:text-slate-400"></span>
						<Alert.Title class="text-slate-700 dark:text-slate-300">Input Sources</Alert.Title>
						<Alert.Description class="text-xs text-slate-600 dark:text-slate-400">
							<strong>USB:</strong> Read physical movements • <strong>Remote:</strong> Receive network
							commands • Only one active at a time
						</Alert.Description>
					</Alert.Root>
				{/if}
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
