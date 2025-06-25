<script lang="ts">
	import * as Dialog from "@/components/ui/dialog";
	import { Button } from "@/components/ui/button";
	import * as Card from "@/components/ui/card";
	import * as Alert from "@/components/ui/alert";
	import { Badge } from "@/components/ui/badge";
	import { toast } from "svelte-sonner";
	import { videoManager } from "$lib/elements/video/VideoManager.svelte";
	import type { VideoInstance } from "$lib/elements/video/VideoManager.svelte";

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
	let mediaRecorder: MediaRecorder | null = null;
	let recordedChunks: Blob[] = [];

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

	async function handleStartOutputToRoom(roomId: string) {
		try {
			isConnecting = true;
			error = null;
			const result = await videoManager.startVideoOutputToRoom(workspaceId, video.id, roomId);
			if (result.success) {
				toast.success("Broadcasting Started", {
					description: `Successfully started broadcasting to room ${roomId}`
				});
			} else {
				error = result.error || "Failed to start output to room";
			}
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to start output to room";
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

	async function createRoomAndStartOutput() {
		try {
			isConnecting = true;
			error = null;
			const roomId = customRoomId.trim() || video.id;
			const result = await videoManager.startVideoOutputAsProducer(workspaceId, video.id);
			if (result.success) {
				customRoomId = "";
				await refreshRooms();
				toast.success("Room Created & Broadcasting", {
					description: `Successfully created room and started broadcasting`
				});
			} else {
				error = result.error || "Failed to create room and start output";
			}
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to create room and start output";
		} finally {
			isConnecting = false;
		}
	}

	async function handleStartRecording() {
		try {
			if (!video.canOutput || !video.input.stream) {
				error = "No local camera input available for recording";
				return;
			}

			isConnecting = true;
			error = null;

			recordedChunks = [];
			mediaRecorder = new MediaRecorder(video.input.stream, { mimeType: "video/webm; codecs=vp9" });

			mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) recordedChunks.push(event.data);
			};

			mediaRecorder.onstop = () => {
				const blob = new Blob(recordedChunks, { type: "video/webm" });
				const url = URL.createObjectURL(blob);
				const a = document.createElement("a");
				a.href = url;
				a.download = `${video.name || video.id}.webm`;
				a.click();
				URL.revokeObjectURL(url);
			};

			mediaRecorder.start();

			// Update video output state locally
			video.output.active = true;
			video.output.type = "recording";
			video.output.stream = video.input.stream;
			video.output.roomId = null;
			video.output.client = null;

			toast.success("Recording Started", { description: "Local recording has started" });
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to start recording";
		} finally {
			isConnecting = false;
		}
	}

	async function handleStopOutput() {
		try {
			isConnecting = true;
			error = null;

			if (video.output.type === "recording") {
				if (mediaRecorder && mediaRecorder.state !== "inactive") {
					mediaRecorder.stop();
				}
				video.output.active = false;
				video.output.type = null;
				video.output.stream = null;
				toast.success("Recording Stopped", { description: "Recording saved to file" });
			} else {
				await videoManager.stopVideoOutput(video.id);
				toast.success("Broadcasting Stopped", {
					description: "Successfully stopped video broadcasting"
				});
			}
		} catch (err) {
			error = err instanceof Error ? err.message : "Failed to stop output";
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
				<span class="icon-[mdi--video-wireless-outline] size-5 text-orange-500 dark:text-orange-400"
				></span>
				Video Output - {video?.name || "No Video Selected"}
			</Dialog.Title>
			<Dialog.Description class="text-sm text-slate-600 dark:text-slate-400">
				Configure video output: local recording or remote broadcast to rooms
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
					class="border-orange-300/30 bg-orange-100/20 dark:border-orange-500/30 dark:bg-orange-900/20"
				>
					<Card.Content class="p-4">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-2">
								<span
									class="icon-[mdi--video-wireless-outline] size-4 text-orange-500 dark:text-orange-400"
								></span>
								<span class="text-sm font-medium text-orange-700 dark:text-orange-300"
									>Current Video Output</span
								>
							</div>
							{#if video?.hasOutput}
								<Badge variant="default" class="bg-orange-500 text-xs dark:bg-orange-600">
									{video.output.type === "recording" ? "Recording" : "Remote Broadcast"}
								</Badge>
							{:else}
								<Badge variant="secondary" class="text-xs text-slate-600 dark:text-slate-400"
									>No Output Active</Badge
								>
							{/if}
						</div>
						{#if video?.hasOutput}
							<div class="mt-2 text-xs text-orange-600/70 dark:text-orange-400/70">
								{#if video.output.roomId}
									Broadcasting to Room: {video.output.roomId}
								{:else}
									Recording to local storage
								{/if}
							</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Current Output Details -->
				{#if video?.hasOutput}
					<Card.Root
						class="border-orange-300/30 bg-orange-100/5 dark:border-orange-500/30 dark:bg-orange-500/5"
					>
						<Card.Header>
							<Card.Title
								class="flex items-center gap-2 text-base text-orange-700 dark:text-orange-200"
							>
								<span class="icon-[mdi--video-wireless] size-4"></span>
								Current Output
							</Card.Title>
						</Card.Header>
						<Card.Content>
							<div
								class="rounded-lg border border-orange-300/30 bg-orange-100/20 p-3 dark:border-orange-500/30 dark:bg-orange-900/20"
							>
								<div class="flex items-center justify-between">
									<div>
										<p class="text-sm font-medium text-orange-700 dark:text-orange-300">
											{video.output.type === "recording" ? "Local Recording" : "Remote Broadcast"}
										</p>
										{#if video.output.roomId}
											<p class="text-xs text-orange-600/70 dark:text-orange-400/70">
												Room: {video.output.roomId}
											</p>
										{/if}
										{#if video.output.stream}
											<p class="text-xs text-orange-600/70 dark:text-orange-400/70">
												Status: Active • {video.output.stream.getVideoTracks().length} video tracks
											</p>
										{/if}
									</div>
									<Button
										variant="destructive"
										size="sm"
										onclick={handleStopOutput}
										class="h-7 px-2 text-xs"
									>
										<span class="icon-[mdi--close-circle] mr-1 size-3"></span>
										Stop
									</Button>
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				{/if}

				<!-- Local Recording -->
				<Card.Root
					class="border-blue-300/30 bg-blue-100/5 dark:border-blue-500/30 dark:bg-blue-500/5"
				>
					<Card.Header>
						<Card.Title class="flex items-center gap-2 text-base text-blue-700 dark:text-blue-200">
							<span class="icon-[mdi--record-rec] size-4"></span>
							Local Recording
						</Card.Title>
						<Card.Description class="text-xs text-blue-600/70 dark:text-blue-300/70">
							Record video directly to your device for later use
						</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-3">
						{#if video?.hasOutput && video.output.type === "recording"}
							<!-- Recording Active State -->
							<div
								class="rounded-lg border border-blue-300/30 bg-blue-100/20 p-3 dark:border-blue-500/30 dark:bg-blue-900/20"
							>
								<div class="flex items-center justify-between">
									<div>
										<p class="text-sm font-medium text-blue-700 dark:text-blue-300">
											Recording Active
										</p>
										<p class="text-xs text-blue-600/70 dark:text-blue-400/70">
											Saving to local device
										</p>
									</div>
									<Button
										variant="destructive"
										size="sm"
										onclick={handleStopOutput}
										disabled={isConnecting}
										class="h-7 px-2 text-xs"
									>
										<span class="icon-[mdi--stop] mr-1 size-3"></span>
										{isConnecting ? "Stopping..." : "Stop Recording"}
									</Button>
								</div>
							</div>
						{:else}
							<!-- Recording Start Button -->
							<Button
								variant="secondary"
								onclick={handleStartRecording}
								disabled={isConnecting || video?.hasOutput}
								class="w-full bg-blue-500 text-sm text-white hover:bg-blue-600 disabled:opacity-50 dark:bg-blue-600 dark:hover:bg-blue-700"
							>
								<span class="icon-[mdi--record] mr-2 size-4"></span>
								{isConnecting ? "Starting..." : "Start Recording"}
							</Button>

							{#if video?.hasOutput}
								<p class="text-xs text-slate-600 dark:text-slate-500">
									Stop current output to start recording
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
									<span class="icon-[mdi--cloud-upload] size-4"></span>
									Remote Collaboration (Rooms)
								</Card.Title>
								<Card.Description class="text-xs text-purple-600/70 dark:text-purple-300/70">
									Broadcast video stream to remote systems and users
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
						{#if video?.hasOutput && video.output.type !== "recording"}
							<!-- Remote Connected State -->
							<div
								class="rounded-lg border border-purple-300/30 bg-purple-100/20 p-3 dark:border-purple-500/30 dark:bg-purple-900/20"
							>
								<div class="flex items-center justify-between">
									<div>
										<p class="text-sm font-medium text-purple-700 dark:text-purple-300">
											Broadcasting to Room
										</p>
										<p class="text-xs text-purple-600/70 dark:text-purple-400/70">
											Video stream active
										</p>
									</div>
									<Button
										variant="destructive"
										size="sm"
										onclick={handleStopOutput}
										disabled={isConnecting}
										class="h-7 px-2 text-xs"
									>
										<span class="icon-[mdi--close-circle] mr-1 size-3"></span>
										{isConnecting ? "Stopping..." : "Stop Broadcast"}
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
										Create a room to broadcast your video
									</p>
									<input
										bind:value={customRoomId}
										placeholder={`Room ID (default: ${video.id})`}
										disabled={isConnecting || video?.hasOutput}
										class="w-full rounded border border-slate-300 bg-slate-50 px-2 py-1 text-xs text-slate-900 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
									/>
									<div class="flex gap-1">
										<Button
											variant="secondary"
											size="sm"
											onclick={createRoom}
											disabled={isConnecting || video?.hasOutput}
											class="h-6 bg-green-500 px-2 text-xs hover:bg-green-600 disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-700"
										>
											Create Only
										</Button>
										<Button
											variant="secondary"
											size="sm"
											onclick={createRoomAndStartOutput}
											disabled={isConnecting || video?.hasOutput}
											class="h-6 bg-green-500 px-2 text-xs hover:bg-green-600 disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-700"
										>
											Create & Broadcast
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
														<div class="flex gap-3 text-xs text-slate-600 dark:text-slate-400">
															<span
																>{room.participants?.producer
																	? "🔴 Has Output"
																	: "🟢 Available"}</span
															>
															<span>👥 {room.participants?.consumers?.length || 0} inputs</span>
														</div>
													</div>
													{#if !room.participants?.producer}
														<Button
															variant="secondary"
															size="sm"
															onclick={() => handleStartOutputToRoom(room.id)}
															disabled={isConnecting || video?.hasOutput}
															class="h-6 shrink-0 bg-purple-500 px-2 text-xs hover:bg-purple-600 disabled:opacity-50 dark:bg-purple-600 dark:hover:bg-purple-700"
														>
															<span class="icon-[mdi--upload] mr-1 size-3"></span>
															Join as Output
														</Button>
													{:else}
														<Button
															variant="ghost"
															size="sm"
															disabled
															class="shrink-0 text-xs opacity-50"
														>
															Has Output
														</Button>
													{/if}
												</div>
											</div>
										{/each}
									{/if}
								</div>
							</div>

							{#if video?.hasOutput}
								<p class="text-xs text-slate-600 dark:text-slate-500">
									Stop current output to join a room
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
					<Alert.Title class="text-slate-700 dark:text-slate-300">Video Output Options</Alert.Title>
					<Alert.Description class="text-xs text-slate-600 dark:text-slate-400">
						<strong>Recording:</strong> Save locally • <strong>Remote:</strong> Broadcast to rooms •
						Only one active at a time
					</Alert.Description>
				</Alert.Root>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
