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
    let customRoomId = $state('');
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
            error = err instanceof Error ? err.message : 'Failed to refresh rooms';
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
                error = result.error || 'Failed to start output to room';
            }
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to start output to room';
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
                customRoomId = '';
                await refreshRooms();
                toast.success("Room Created", {
                    description: `Successfully created room ${result.roomId}`
                });
            } else {
                error = result.error || 'Failed to create room';
            }
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to create room';
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
                customRoomId = '';
                await refreshRooms();
                toast.success("Room Created & Broadcasting", {
                    description: `Successfully created room and started broadcasting`
                });
            } else {
                error = result.error || 'Failed to create room and start output';
            }
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to create room and start output';
        } finally {
            isConnecting = false;
        }
    }

    async function handleStopOutput() {
        try {
            isConnecting = true;
            error = null;
            await videoManager.stopVideoOutput(video.id);
            toast.success("Broadcasting Stopped", {
                description: "Successfully stopped video broadcasting"
            });
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to stop broadcasting';
        } finally {
            isConnecting = false;
        }
    }
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="max-h-[85vh] max-w-4xl overflow-hidden border-slate-600 bg-slate-900 text-slate-100"
	>
		<Dialog.Header class="pb-3">
			<Dialog.Title class="flex items-center gap-2 text-lg font-bold text-slate-100">
				<span class="icon-[mdi--video] size-5 text-blue-400"></span>
				Video Output - {video?.name || 'No Video Selected'}
			</Dialog.Title>
			<Dialog.Description class="text-sm text-slate-400">
				Broadcast your local camera to remote viewers in rooms
			</Dialog.Description>
		</Dialog.Header>

		<div class="max-h-[calc(85vh-10rem)] overflow-y-auto">
			<div class="space-y-4 pb-4">
				<!-- Error display -->
				{#if error}
					<Alert.Root class="border-red-500/30 bg-red-900/20">
						<span class="icon-[mdi--alert-circle] size-4 text-red-400"></span>
						<Alert.Title class="text-red-300">Broadcasting Error</Alert.Title>
						<Alert.Description class="text-red-400 text-sm">
							{error}
						</Alert.Description>
					</Alert.Root>
				{/if}
			<!-- Current Status Overview -->
			<Card.Root class="border-blue-500/30 bg-blue-900/20">
				<Card.Content class="p-4">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<span class="icon-[mdi--video] size-4 text-blue-400"></span>
							<span class="text-sm font-medium text-blue-300">Current Video Output</span>
						</div>
						{#if video?.hasOutput}
							<Badge variant="default" class="bg-blue-600 text-xs">
								Broadcasting
							</Badge>
						{:else}
							<Badge variant="secondary" class="text-xs text-slate-400">Not Broadcasting</Badge>
						{/if}
					</div>
					{#if video?.hasOutput}
						<div class="mt-2 text-xs text-blue-400/70">
							{#if video.output.roomId}
								Room: {video.output.roomId}
							{:else}
								Broadcasting to server
							{/if}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Output Requirements -->
			{#if !video?.canOutput}
				<Card.Root class="border-yellow-500/30 bg-yellow-500/5">
					<Card.Header>
						<Card.Title class="flex items-center gap-2 text-base text-yellow-200">
							<span class="icon-[mdi--alert] size-4"></span>
							Requirements
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-2 text-sm text-yellow-300">
							{#if !video?.hasInput}
								<div class="flex items-center gap-2">
									<span class="icon-[mdi--close-circle] size-3 text-red-400"></span>
									No video input connected
								</div>
							{:else if video.input.type !== 'local-camera'}
								<div class="flex items-center gap-2">
									<span class="icon-[mdi--close-circle] size-3 text-red-400"></span>
									Input must be local camera (cannot re-broadcast remote streams)
								</div>
							{/if}
							<div class="mt-2 text-xs text-yellow-400/70">
								To enable output, first connect to your local camera in the Video Input modal.
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Current Output Details -->
			{#if video?.hasOutput}
				<Card.Root class="border-blue-500/30 bg-blue-500/5">
					<Card.Header>
						<Card.Title class="flex items-center gap-2 text-base text-blue-200">
							<span class="icon-[mdi--broadcast] size-4"></span>
							Broadcasting
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="rounded-lg border border-blue-500/30 bg-blue-900/20 p-3">
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-medium text-blue-300">
										Streaming to Server
									</p>
									{#if video.output.roomId}
										<p class="text-xs text-blue-400/70">
											Room ID: {video.output.roomId}
										</p>
									{/if}
									<p class="text-xs text-blue-400/70">
										Source: Local Camera
									</p>
									{#if video.input.stream}
										<p class="text-xs text-blue-400/70">
											Video: {video.input.stream.getVideoTracks().length} tracks
										</p>
										<p class="text-xs text-blue-400/70">
											Audio: {video.input.stream.getAudioTracks().length} tracks
										</p>
									{/if}
								</div>
								<Button
									variant="destructive"
									size="sm"
									onclick={handleStopOutput}
									class="h-7 px-2 text-xs"
								>
									<span class="icon-[mdi--stop] mr-1 size-3"></span>
									Stop
								</Button>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Remote Broadcasting -->
			<Card.Root class="border-orange-500/30 bg-orange-500/5">
				<Card.Header>
					<div class="flex items-center justify-between">
						<div>
							<Card.Title class="flex items-center gap-2 text-base text-orange-200">
								<span class="icon-[mdi--broadcast] size-4"></span>
								Remote Broadcasting (Rooms)
							</Card.Title>
							<Card.Description class="text-xs text-orange-300/70">
								Broadcast your camera feed to remote viewers in rooms
							</Card.Description>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onclick={refreshRooms}
							disabled={videoManager.roomsLoading || isConnecting}
							class="h-7 px-2 text-xs text-orange-300 hover:text-orange-200 hover:bg-orange-500/20"
						>
							{#if videoManager.roomsLoading}
								<span class="icon-[mdi--loading] animate-spin size-3 mr-1"></span>
								Refreshing
							{:else}
								<span class="icon-[mdi--refresh] size-3 mr-1"></span>
								Refresh
							{/if}
						</Button>
					</div>
				</Card.Header>
				<Card.Content class="space-y-4">
					{#if video?.hasOutput}
						<!-- Broadcasting State -->
						<div class="rounded-lg border border-orange-500/30 bg-orange-900/20 p-3">
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-medium text-orange-300">Broadcasting Active</p>
									<p class="text-xs text-orange-400/70">Sending video to remote viewers</p>
								</div>
								<Button
									variant="destructive"
									size="sm"
									onclick={handleStopOutput}
									disabled={isConnecting}
									class="h-7 px-2 text-xs"
								>
									<span class="icon-[mdi--stop] mr-1 size-3"></span>
									{isConnecting ? 'Stopping...' : 'Stop'}
								</Button>
							</div>
						</div>
					{:else if video?.canOutput}
						<!-- Create New Room -->
						<div class="rounded border-2 border-dashed border-green-500/50 bg-green-500/5 p-3">
							<div class="space-y-2">
								<div class="flex items-center gap-2">
									<span class="icon-[mdi--plus-circle] size-4 text-green-400"></span>
									<p class="text-sm font-medium text-green-300">Create New Room</p>
								</div>
								<p class="text-xs text-green-400/70">
									Create a room to broadcast your camera feed
								</p>
								<input
									bind:value={customRoomId}
									placeholder={`Room ID (default: ${video.id})`}
									disabled={isConnecting || video?.hasOutput}
									class="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-slate-100 disabled:opacity-50"
								/>
								<div class="flex gap-1">
									<Button
										variant="secondary"
										size="sm"
										onclick={createRoom}
										disabled={isConnecting || video?.hasOutput}
										class="h-6 px-2 text-xs bg-green-600 hover:bg-green-700 disabled:opacity-50"
									>
										Create Only
									</Button>
									<Button
										variant="secondary"
										size="sm"
										onclick={createRoomAndStartOutput}
										disabled={isConnecting || video?.hasOutput}
										class="h-6 px-2 text-xs bg-green-600 hover:bg-green-700 disabled:opacity-50"
									>
										Create & Start
									</Button>
								</div>
							</div>
						</div>

						<!-- Existing Rooms -->
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<span class="text-xs font-medium text-orange-300">Join Existing Room:</span>
								<span class="text-xs text-slate-400">
									{videoManager.rooms.length} room{videoManager.rooms.length !== 1 ? 's' : ''} available
								</span>
							</div>
							
							<div class="max-h-40 space-y-2 overflow-y-auto">
								{#if videoManager.rooms.length === 0}
									<div class="text-center py-3 text-xs text-slate-400">
										{videoManager.roomsLoading ? 'Loading rooms...' : 'No rooms available. Create one to get started.'}
									</div>
								{:else}
									{#each videoManager.rooms as room}
										<div class="rounded border border-slate-600 bg-slate-800/50 p-2">
											<div class="flex items-start justify-between gap-3">
												<div class="flex-1 min-w-0">
													<p class="text-xs font-medium text-slate-200 truncate">
														{room.id}
													</p>
													<div class="flex gap-3 text-xs text-slate-400">
														<span>{room.participants?.producer ? '🔴 Occupied' : '🟢 Available'}</span>
														<span>👥 {room.participants?.consumers?.length || 0} viewers</span>
													</div>
												</div>
												{#if !room.participants?.producer}
													<Button
														variant="secondary"
														size="sm"
														onclick={() => handleStartOutputToRoom(room.id)}
														disabled={isConnecting || video?.hasOutput}
														class="h-6 px-2 text-xs bg-orange-600 hover:bg-orange-700 shrink-0 disabled:opacity-50"
													>
														<span class="icon-[mdi--broadcast] mr-1 size-3"></span>
														Join as Output
													</Button>
												{:else}
													<Button
														variant="ghost"
														size="sm"
														disabled
														class="text-xs opacity-50 shrink-0"
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

						{#if video?.hasOutput}
							<p class="text-xs text-slate-500">
								Stop current broadcast to join a different room
							</p>
						{/if}
					{:else}
						<!-- Cannot output -->
						<div class="space-y-3">
							<div class="text-center text-sm text-slate-500">
								Connect to local camera first to enable broadcasting
							</div>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Help Information -->
			<Alert.Root class="border-slate-700 bg-slate-800/30">
				<span class="icon-[mdi--help-circle] size-4 text-slate-400"></span>
				<Alert.Title class="text-slate-300">Video Broadcasting</Alert.Title>
				<Alert.Description class="text-slate-400 text-xs">
					<strong>Requirements:</strong> Local camera input only • <strong>Remote streams:</strong> Cannot be re-broadcasted • Only one output per room
				</Alert.Description>
			</Alert.Root>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root> 