<script lang="ts">
	import * as Dialog from "@/components/ui/dialog";
	import { Button } from "@/components/ui/button";
	import * as Card from "@/components/ui/card";
	import * as Alert from "@/components/ui/alert";
	import { Badge } from "@/components/ui/badge";
	import { toast } from "svelte-sonner";
	import { videoManager } from "$lib/elements/video//VideoManager.svelte";
	import type { VideoInstance } from "$lib/elements/video//VideoManager.svelte";

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
                error = result.error || 'Failed to connect camera';
                toast.error("Camera Connection Failed", {
                    description: error
                });
            }
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to connect camera';
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
                error = result.error || 'Failed to connect to room';
            }
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to connect to room';
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

    async function createRoomAndConnect() {
        try {
            isConnecting = true;
            error = null;
            const roomId = customRoomId.trim() || video.id;
            const createResult = await videoManager.createVideoRoom(workspaceId, roomId);
            
            if (!createResult.success) {
                error = createResult.error || 'Failed to create room';
                return;
            }
            
            const connectResult = await videoManager.connectRemoteStream(workspaceId, video.id, createResult.roomId!);
            if (connectResult.success) {
                customRoomId = '';
                await refreshRooms();
                toast.success("Room Created & Connected", {
                    description: `Successfully created and connected to room ${createResult.roomId} - receiving video stream`
                });
            } else {
                error = connectResult.error || 'Failed to connect to room';
            }
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to create room and connect';
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
            await new Promise(resolve => setTimeout(resolve, 100));
            
            toast.success("Video Input Disconnected", {
                description: "Successfully disconnected video input"
            });
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to disconnect video input';
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
		class="max-h-[85vh] max-w-4xl overflow-hidden border-slate-600 bg-slate-900 text-slate-100"
	>
		<Dialog.Header class="pb-3">
			<Dialog.Title class="flex items-center gap-2 text-lg font-bold text-slate-100">
				<span class="icon-[mdi--video-input-component] size-5 text-green-400"></span>
				Video Input - {video?.name || 'No Video Selected'}
			</Dialog.Title>
			<Dialog.Description class="text-sm text-slate-400">
				Configure video input source: local camera for recording or remote streams from rooms
			</Dialog.Description>
		</Dialog.Header>

		<div class="max-h-[calc(85vh-10rem)] overflow-y-auto">
			<div class="space-y-4 pb-4">
				<!-- Error display -->
				{#if error}
					<Alert.Root class="border-red-500/30 bg-red-900/20">
						<span class="icon-[mdi--alert-circle] size-4 text-red-400"></span>
						<Alert.Title class="text-red-300">Connection Error</Alert.Title>
						<Alert.Description class="text-red-400 text-sm">
							{error}
						</Alert.Description>
					</Alert.Root>
				{/if}
			<!-- Current Status Overview -->
			<Card.Root class="border-green-500/30 bg-green-900/20">
				<Card.Content class="p-4">
					<div class="flex items-center justify-between">
						<div class="flex items-center gap-2">
							<span class="icon-[mdi--video-input-component] size-4 text-green-400"></span>
							<span class="text-sm font-medium text-green-300">Current Video Input</span>
						</div>
						{#if video?.hasInput}
							<Badge variant="default" class="bg-green-600 text-xs">
								{video.input.type === 'local-camera' ? 'Local Camera' : 'Remote Stream'}
							</Badge>
						{:else}
							<Badge variant="secondary" class="text-xs text-slate-400">No Input Connected</Badge>
						{/if}
					</div>
					{#if video?.hasInput}
						<div class="mt-2 text-xs text-green-400/70">
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
				<Card.Root class="border-green-500/30 bg-green-500/5">
					<Card.Header>
						<Card.Title class="flex items-center gap-2 text-base text-green-200">
							<span class="icon-[mdi--video] size-4"></span>
							Current Input
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="rounded-lg border border-green-500/30 bg-green-900/20 p-3">
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-medium text-green-300">
										{video.input.type === 'local-camera' ? 'Local Camera' : 'Remote Stream'}
									</p>
									{#if video.input.roomId}
										<p class="text-xs text-green-400/70">
											Room: {video.input.roomId}
										</p>
									{/if}
									{#if video.input.stream}
										<p class="text-xs text-green-400/70">
											Video: {video.input.stream.getVideoTracks().length} tracks
										</p>
										<p class="text-xs text-green-400/70">
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
			<Card.Root class="border-blue-500/30 bg-blue-500/5">
				<Card.Header>
					<Card.Title class="flex items-center gap-2 text-base text-blue-200">
						<span class="icon-[mdi--camera] size-4"></span>
						Local Camera
					</Card.Title>
					<Card.Description class="text-xs text-blue-300/70">
						Use your device camera for direct video capture and recording
					</Card.Description>
				</Card.Header>
				<Card.Content class="space-y-3">
					{#if video?.hasInput && video.input.type === 'local-camera'}
						<!-- Camera Connected State -->
						<div class="rounded-lg border border-blue-500/30 bg-blue-900/20 p-3">
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-medium text-blue-300">Camera Connected</p>
									<p class="text-xs text-blue-400/70">Local device camera active</p>
								</div>
								<Button
									variant="destructive"
									size="sm"
									onclick={handleDisconnect}
									disabled={isConnecting}
									class="h-7 px-2 text-xs"
								>
									<span class="icon-[mdi--close-circle] mr-1 size-3"></span>
									{isConnecting ? 'Disconnecting...' : 'Disconnect'}
								</Button>
							</div>
						</div>
					{:else}
						<!-- Camera Connection Button -->
						<Button
							variant="secondary"
							onclick={handleConnectCamera}
							disabled={isConnecting || video?.hasInput}
							class="w-full bg-blue-600 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
						>
							<span class="icon-[mdi--camera] mr-2 size-4"></span>
							{isConnecting ? 'Connecting...' : 'Connect to Camera'}
						</Button>
						
						{#if video?.hasInput}
							<p class="text-xs text-slate-500">
								Disconnect current input to connect camera
							</p>
						{/if}
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Remote Collaboration -->
			<Card.Root class="border-purple-500/30 bg-purple-500/5">
				<Card.Header>
					<div class="flex items-center justify-between">
						<div>
							<Card.Title class="flex items-center gap-2 text-base text-purple-200">
								<span class="icon-[mdi--cloud-download] size-4"></span>
								Remote Collaboration (Rooms)
							</Card.Title>
							<Card.Description class="text-xs text-purple-300/70">
								Receive video streams from remote cameras or AI systems
							</Card.Description>
						</div>
						<Button
							variant="ghost"
							size="sm"
							onclick={refreshRooms}
							disabled={videoManager.roomsLoading || isConnecting}
							class="h-7 px-2 text-xs text-purple-300 hover:text-purple-200 hover:bg-purple-500/20"
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
					{#if video?.hasInput && video.input.type !== 'local-camera'}
						<!-- Remote Connected State -->
						<div class="rounded-lg border border-purple-500/30 bg-purple-900/20 p-3">
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-medium text-purple-300">Room Connected</p>
									<p class="text-xs text-purple-400/70">Receiving remote video stream</p>
								</div>
								<Button
									variant="destructive"
									size="sm"
									onclick={handleDisconnect}
									disabled={isConnecting}
									class="h-7 px-2 text-xs"
								>
									<span class="icon-[mdi--close-circle] mr-1 size-3"></span>
									{isConnecting ? 'Leaving...' : 'Leave Room'}
								</Button>
							</div>
						</div>
					{:else}
						<!-- Create New Room -->
						<div class="rounded border-2 border-dashed border-green-500/50 bg-green-500/5 p-3">
							<div class="space-y-2">
								<div class="flex items-center gap-2">
									<span class="icon-[mdi--plus-circle] size-4 text-green-400"></span>
									<p class="text-sm font-medium text-green-300">Create New Room</p>
								</div>
								<p class="text-xs text-green-400/70">
									Create a room to receive video from others
								</p>
								<input
									bind:value={customRoomId}
									placeholder={`Room ID (default: ${video.id})`}
									disabled={isConnecting || video?.hasInput}
									class="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-slate-100 disabled:opacity-50"
								/>
								<div class="flex gap-1">
									<Button
										variant="secondary"
										size="sm"
										onclick={createRoom}
										disabled={isConnecting || video?.hasInput}
										class="h-6 px-2 text-xs bg-green-600 hover:bg-green-700 disabled:opacity-50"
									>
										Create Only
									</Button>
									<Button
										variant="secondary"
										size="sm"
										onclick={createRoomAndConnect}
										disabled={isConnecting || video?.hasInput}
										class="h-6 px-2 text-xs bg-green-600 hover:bg-green-700 disabled:opacity-50"
									>
										Create & Connect
									</Button>
								</div>
							</div>
						</div>

						<!-- Existing Rooms -->
						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<span class="text-xs font-medium text-purple-300">Join Existing Room:</span>
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
														<span>{room.participants?.producer ? '📹 Has Output' : '📭 No Output'}</span>
														<span>👥 {room.participants?.consumers?.length || 0} inputs</span>
													</div>
												</div>
												{#if room.participants?.producer}
													<Button
														variant="secondary"
														size="sm"
														onclick={() => handleConnectToRoom(room.id)}
														disabled={isConnecting || video?.hasInput}
														class="h-6 px-2 text-xs bg-purple-600 hover:bg-purple-700 shrink-0 disabled:opacity-50"
													>
														<span class="icon-[mdi--download] mr-1 size-3"></span>
														Join as Input
													</Button>
												{:else}
													<Button
														variant="ghost"
														size="sm"
														disabled
														class="text-xs opacity-50 shrink-0"
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
							<p class="text-xs text-slate-500">
								Disconnect current input to join a room
							</p>
						{/if}
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Help Information -->
			<Alert.Root class="border-slate-700 bg-slate-800/30">
				<span class="icon-[mdi--help-circle] size-4 text-slate-400"></span>
				<Alert.Title class="text-slate-300">Video Input Sources</Alert.Title>
				<Alert.Description class="text-slate-400 text-xs">
					<strong>Camera:</strong> Local device camera • <strong>Remote:</strong> Video streams from rooms • Only one active at a time
				</Alert.Description>
			</Alert.Root>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root> 