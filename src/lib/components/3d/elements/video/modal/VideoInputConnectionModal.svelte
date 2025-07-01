<script lang="ts">
	import * as Dialog from "@/components/ui/dialog";
	import { Button } from "@/components/ui/button";
	import * as Card from "@/components/ui/card";
	import * as Alert from "@/components/ui/alert";
	import { Badge } from "@/components/ui/badge";
	import { toast } from "svelte-sonner";
	import { videoManager } from "$lib/elements/video/VideoManager.svelte";
	import type { VideoInstance } from "$lib/elements/video/VideoManager.svelte";
	import { settings } from "$lib/runes/settings.svelte";

	interface Props {
		workspaceId: string;
		open: boolean;
		video: VideoInstance;
	}

	let { open = $bindable(), video, workspaceId }: Props = $props();

	let isConnecting = $state(false);
	let error = $state<string | null>(null);
	let customRoomId = $state("");
	let hasLoadedRooms = $state(false);

	// Auto-load rooms when modal opens (only once per modal session)
	$effect(() => {
		if (open && !hasLoadedRooms && !videoManager.roomsLoading) {
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
			await videoManager.refreshRooms(workspaceId);
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to refresh rooms";
		}
	}

	async function handleConnectCamera() {
		try {
			isConnecting = true;
			error = null;

			const result = await videoManager.connectLocalCamera(video.id);
			if (result.success) {
				toast.success("Camera Connected", {
					description: "Successfully connected to local camera"
				});
			} else {
				error = result.error || "Failed to connect camera";
				toast.error("Camera Connection Failed", {
					description: error
				});
			}
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to connect camera";
			toast.error("Camera Connection Error", {
				description: error
			});
		} finally {
			isConnecting = false;
		}
	}

	async function handleConnectToRoom(roomId: string) {
		try {
			isConnecting = true;
			error = null;
			const result = await videoManager.connectRemoteStream(workspaceId, video.id, roomId);
			if (result.success) {
				toast.success("Connected to Room", {
					description: `Successfully connected to room ${roomId} - receiving video stream`
				});
			} else {
				error = result.error || "Failed to connect to room";
			}
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to connect to room";
		} finally {
			isConnecting = false;
		}
	}

	async function createRoom() {
		try {
			isConnecting = true;
			error = null;
			const roomId = customRoomId.trim() || video.id;
			const result = await videoManager.createVideoRoom(workspaceId, roomId);

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

	async function createRoomAndConnect() {
		try {
			isConnecting = true;
			error = null;
			const roomId = customRoomId.trim() || video.id;
			const createResult = await videoManager.createVideoRoom(workspaceId, roomId);

			if (!createResult.success) {
				error = createResult.error || "Failed to create room";
				return;
			}

			const connectResult = await videoManager.connectRemoteStream(
				workspaceId,
				video.id,
				createResult.roomId!
			);
			if (connectResult.success) {
				customRoomId = "";
				await refreshRooms();
				toast.success("Room Created & Connected", {
					description: `Successfully created and connected to room ${createResult.roomId} - receiving video stream`
				});
			} else {
				error = connectResult.error || "Failed to connect to room";
			}
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to create room and connect";
		} finally {
			isConnecting = false;
		}
	}

	async function handleDisconnect() {
		try {
			isConnecting = true;
			error = null;
			await videoManager.disconnectVideoInput(video.id);

			// Small delay to ensure reactive state updates
			await new Promise((resolve) => setTimeout(resolve, 100));

			toast.success("Video Input Disconnected", {
				description: "Successfully disconnected video input"
			});
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to disconnect video input";
			toast.error("Disconnect Failed", {
				description: error
			});
		} finally {
			isConnecting = false;
		}
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
				<span class="icon-[mdi--video-input-component] size-5 text-green-500 dark:text-green-400"
				></span>
				Video Input - {video?.name || "No Video Selected"}
			</Dialog.Title>
			<Dialog.Description class="text-sm text-slate-600 dark:text-slate-400">
				Configure video input source: local camera for recording or remote streams from rooms
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
				<!-- Current Status Overview -->
				<Card.Root
					class="border-green-300/30 bg-green-100/20 dark:border-green-500/30 dark:bg-green-900/20"
				>
					<Card.Content class="p-4">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<span
									class="icon-[mdi--video-input-component] size-4 text-green-500 dark:text-green-400"
								></span>
								<span class="text-sm font-medium text-green-700 dark:text-green-300"
									>Current Video Input</span
								>
							</div>
							{#if video?.hasInput}
								<Badge variant="default" class="bg-green-500 text-xs dark:bg-green-600">
									{video.input.type === "local-camera" ? "Local Camera" : "Remote Stream"}
								</Badge>
							{:else}
								<Badge variant="secondary" class="text-xs text-slate-600 dark:text-slate-400"
									>No Input Connected</Badge
								>
							{/if}
						</div>
						{#if video?.hasInput}
							<div class="mt-2 text-xs text-green-600/70 dark:text-green-400/70">
								{#if video.input.roomId}
									Room: {video.input.roomId}
								{:else}
									Source: Local Device Camera
								{/if}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Current Input Details -->
				{#if video?.hasInput}
					<Card.Root
						class="border-green-300/30 bg-green-100/5 dark:border-green-500/30 dark:bg-green-500/5"
					>
						<Card.Header>
							<Card.Title
								class="flex items-center gap-2 text-base text-green-700 dark:text-green-200"
							>
								<span class="icon-[mdi--video] size-4"></span>
								Current Input
							</Card.Title>
						</Card.Header>
						<Card.Content>
							<div
								class="rounded-lg border border-green-300/30 bg-green-100/20 p-3 dark:border-green-500/30 dark:bg-green-900/20"
							>
								<div class="flex items-center justify-between">
									<div>
										<p class="text-sm font-medium text-green-700 dark:text-green-300">
											{video.input.type === "local-camera" ? "Local Camera" : "Remote Stream"}
										</p>
										{#if video.input.roomId}
											<p class="text-xs text-green-600/70 dark:text-green-400/70">
												Room: {video.input.roomId}
											</p>
										{/if}
										{#if video.input.stream}
											<p class="text-xs text-green-600/70 dark:text-green-400/70">
												Video: {video.input.stream.getVideoTracks().length} tracks
											</p>
											<p class="text-xs text-green-600/70 dark:text-green-400/70">
												Audio: {video.input.stream.getAudioTracks().length} tracks
											</p>
										{/if}
									</div>
									<Button
										variant="destructive"
										size="sm"
										onclick={handleDisconnect}
										class="h-7 px-2 text-xs"
									>
										<span class="icon-[mdi--close-circle] mr-1 size-3"></span>
										Disconnect
									</Button>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{/if}

				<!-- Local Camera -->
				<Card.Root
					class="border-blue-300/30 bg-blue-100/5 dark:border-blue-500/30 dark:bg-blue-500/5"
				>
					<Card.Header>
						<Card.Title class="flex items-center gap-2 text-base text-blue-700 dark:text-blue-200">
							<span class="icon-[mdi--camera] size-4"></span>
							Local Camera
						</Card.Title>
						<Card.Description class="text-xs text-blue-600/70 dark:text-blue-300/70">
							Use your device camera for direct video capture and recording
						</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-3">
						{#if video?.hasInput && video.input.type === "local-camera"}
							<!-- Camera Connected State -->
							<div
								class="rounded-lg border border-blue-300/30 bg-blue-100/20 p-3 dark:border-blue-500/30 dark:bg-blue-900/20"
							>
								<div class="flex items-center justify-between">
									<div>
										<p class="text-sm font-medium text-blue-700 dark:text-blue-300">
											Camera Connected
										</p>
										<p class="text-xs text-blue-600/70 dark:text-blue-400/70">
											Local device camera active
										</p>
									</div>
									<Button
										variant="destructive"
										size="sm"
										onclick={handleDisconnect}
										disabled={isConnecting}
										class="h-7 px-2 text-xs"
									>
										<span class="icon-[mdi--close-circle] mr-1 size-3"></span>
										{isConnecting ? "Disconnecting..." : "Disconnect"}
									</Button>
								</div>
							</div>
						{:else}
							<!-- Camera Connection Button -->
							<Button
								variant="secondary"
								onclick={handleConnectCamera}
								disabled={isConnecting || video?.hasInput}
								class="w-full bg-blue-500 text-sm text-white hover:bg-blue-600 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
							>
								<span class="icon-[mdi--camera] mr-2 size-4"></span>
								{isConnecting ? "Connecting..." : "Connect to Camera"}
							</Button>

							{#if video?.hasInput}
								<p class="text-xs text-slate-600 dark:text-slate-500">
									Disconnect current input to connect camera
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
									class="flex items-center gap-2 pb-1 text-base text-purple-700 dark:text-purple-200"
								>
									<span class="icon-[mdi--cloud-download] size-4"></span>
									Remote Control
								</Card.Title>
								<Card.Description class="text-xs text-purple-600/70 dark:text-purple-300/70">
									Receive video streams from remote cameras or AI systems
								</Card.Description>
							</div>
							<Button
								variant="ghost"
								size="sm"
								onclick={refreshRooms}
								disabled={videoManager.roomsLoading || isConnecting}
								class="h-7 px-2 text-xs text-purple-700 hover:bg-purple-200/20 hover:text-purple-800 dark:text-purple-300 dark:hover:bg-purple-500/20 dark:hover:text-purple-200"
							>
								{#if videoManager.roomsLoading}
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
						{#if video?.hasInput && video.input.type !== "local-camera"}
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
											Receiving remote video stream
										</p>
									</div>
									<Button
										variant="destructive"
										size="sm"
										onclick={handleDisconnect}
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
										<span class="icon-[mdi--plus-circle] size-4 text-green-500 dark:text-green-400"
										></span>
										<p class="text-sm font-medium text-green-700 dark:text-green-300">
											Create New Room
										</p>
									</div>
									<p class="text-xs text-green-600/70 dark:text-green-400/70">
										Create a room to receive video from others
									</p>
									<input
										bind:value={customRoomId}
										placeholder={`Room ID (default: ${video.id})`}
										disabled={isConnecting || video?.hasInput}
										class="w-full rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-900 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
									/>
									<div class="flex gap-1">
										<Button
											variant="secondary"
											size="sm"
											onclick={createRoom}
											disabled={isConnecting || video?.hasInput}
											class="h-6 bg-green-500 px-2 text-xs hover:bg-green-600 disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-700"
										>
											Create Only
										</Button>
										<Button
											variant="secondary"
											size="sm"
											onclick={createRoomAndConnect}
											disabled={isConnecting || video?.hasInput}
											class="h-6 bg-green-500 px-2 text-xs hover:bg-green-600 disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-700"
										>
											Create & Connect
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
										{videoManager.rooms.length} room{videoManager.rooms.length !== 1 ? "s" : ""} available
									</span>
								</div>

								<div class="max-h-40 space-y-2 overflow-y-auto">
									{#if videoManager.rooms.length === 0}
										<div class="py-3 text-center text-xs text-slate-600 dark:text-slate-400">
											{videoManager.roomsLoading
												? "Loading rooms..."
												: "No rooms available. Create one to get started."}
										</div>
									{:else}
										{#each videoManager.rooms as room}
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
														<div
															class="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400"
														>
															<span
																>{room.participants?.producer
																	? "📹 Has Output"
																	: "📭 No Output"}</span
															>
															<span>👥 {room.participants?.consumers?.length || 0} inputs</span>
															<!-- Monitoring links -->
															<div class="flex gap-1">
																<a
																	href={`${settings.transportServerUrl.replace("/api", "")}/${workspaceId}/video/consumer?room=${room.id}`}
																	target="_blank"
																	rel="noopener noreferrer"
																	class="inline-flex items-center gap-1 rounded bg-blue-500/10 px-1.5 py-0.5 text-xs text-blue-600 hover:bg-blue-500/20 dark:bg-blue-400/10 dark:text-blue-400 dark:hover:bg-blue-400/20"
																	title="Monitor Consumer"
																>
																	<span class="icon-[mdi--monitor-eye] size-3"></span>
																	Consumer
																</a>
																<a
																	href={`${settings.transportServerUrl.replace("/api", "")}/${workspaceId}/video/producer?room=${room.id}`}
																	target="_blank"
																	rel="noopener noreferrer"
																	class="inline-flex items-center gap-1 rounded bg-green-500/10 px-1.5 py-0.5 text-xs text-green-600 hover:bg-green-500/20 dark:bg-green-400/10 dark:text-green-400 dark:hover:bg-green-400/20"
																	title="Monitor Producer"
																>
																	<span class="icon-[mdi--monitor-eye] size-3"></span>
																	Producer
																</a>
															</div>
														</div>
													</div>
													{#if room.participants?.producer}
														<Button
															variant="secondary"
															size="sm"
															onclick={() => handleConnectToRoom(room.id)}
															disabled={isConnecting || video?.hasInput}
															class="h-6 shrink-0 bg-purple-500 px-2 text-xs hover:bg-purple-600 disabled:opacity-50 dark:bg-purple-600 dark:hover:bg-purple-700"
														>
															<span class="icon-[mdi--download] mr-1 size-3"></span>
															Join as Input
														</Button>
													{:else}
														<Button
															variant="ghost"
															size="sm"
															disabled
															class="shrink-0 text-xs opacity-50"
														>
															No Output
														</Button>
													{/if}
												</div>
											</div>
										{/each}
									{/if}
								</div>
							</div>

							{#if video?.hasInput}
								<p class="text-xs text-slate-600 dark:text-slate-500">
									Disconnect current input to join a room
								</p>
							{/if}
						{/if}
					</Card.Content>
				</Card.Root>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
