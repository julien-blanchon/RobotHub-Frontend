<script lang="ts">
	import * as Dialog from "@/components/ui/dialog";
	import { video } from '@robothub/transport-server-client';
	import type { video as videoTypes } from '@robothub/transport-server-client';
	import { Button } from "@/components/ui/button";
	import * as Card from "@/components/ui/card";
	import { Badge } from "@/components/ui/badge";
	import { toast } from "svelte-sonner";
	import { settings } from "$lib/runes/settings.svelte";
	import { videoManager } from "$lib/elements/video/VideoManager.svelte";
	import type { RemoteCompute } from "$lib/elements/compute/RemoteCompute.svelte";

	interface Props {
		workspaceId: string;
		open: boolean;
		compute: RemoteCompute;
	}

	let { open = $bindable(), compute, workspaceId }: Props = $props();

	let isConnecting = $state(false);
	let selectedCameraName = $state('front');
	let localStream: MediaStream | null = $state(null);
	let videoProducer: any = null;

	// Auto-refresh rooms when modal opens
	$effect(() => {
		if (open) {
			videoManager.refreshRooms(workspaceId);
		}
	});

	async function handleConnectLocalCamera() {
		if (!compute.hasSession) {
			toast.error('No AI session available. Create a session first.');
			return;
		}

		isConnecting = true;
		try {
			// Get user media
			const stream = await navigator.mediaDevices.getUserMedia({
				video: true,
				audio: false
			});
			localStream = stream;

			// Get the camera room ID for the selected camera
			const cameraRoomId = compute.sessionData?.camera_room_ids[selectedCameraName];
			if (!cameraRoomId) {
				throw new Error(`No room found for camera: ${selectedCameraName}`);
			}

			// Create video producer and connect to the camera room
			videoProducer = new video.VideoProducer(settings.transportServerUrl);
			
			// Connect to the EXISTING camera room (don't create new one)
			const participantId = `frontend-camera-${selectedCameraName}-${Date.now()}`;
			const success = await videoProducer.connect(workspaceId, cameraRoomId, participantId);
			
			if (!success) {
				throw new Error('Failed to connect to camera room');
			}

			// Start streaming
			await videoProducer.startCamera();

			toast.success(`Camera connected to AI session`, {
				description: `Local camera streaming to ${selectedCameraName} input`
			});

		} catch (error) {
			console.error('Camera connection error:', error);
			toast.error('Failed to connect camera', {
				description: error instanceof Error ? error.message : 'Unknown error'
			});
		} finally {
			isConnecting = false;
		}
	}

	async function handleDisconnectCamera() {
		try {
			if (videoProducer) {
				await videoProducer.stopStreaming();
				await videoProducer.disconnect();
				videoProducer = null;
			}

			if (localStream) {
				localStream.getTracks().forEach(track => track.stop());
				localStream = null;
			}

			toast.success('Camera disconnected');
		} catch (error) {
			console.error('Disconnect error:', error);
			toast.error('Error disconnecting camera');
		}
	}

	// Cleanup on modal close
	$effect(() => {
		return () => {
            if (!open) {
                handleDisconnectCamera();
            }
        };
    });
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="max-h-[80vh] max-w-xl overflow-y-auto border-slate-600 bg-slate-900 text-slate-100"
	>
		<Dialog.Header class="pb-3">
			<Dialog.Title class="flex items-center gap-2 text-lg font-bold text-slate-100">
				<span class="icon-[mdi--video-input-component] size-5 text-green-400"></span>
				Video Input - {compute.name || 'No Compute Selected'}
			</Dialog.Title>
			<Dialog.Description class="text-sm text-slate-400">
				Connect camera streams to provide visual input for AI inference
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
						You need to create an AI session before connecting video inputs.
						The session defines which camera names are available for connection.
					</Card.Content>
				</Card.Root>
			{:else}
				<!-- Camera Selection and Connection -->
				<Card.Root class="border-green-500/30 bg-green-500/5">
					<Card.Header>
						<Card.Title class="flex items-center gap-2 text-base text-green-200">
							<span class="icon-[mdi--camera] size-4"></span>
							Camera Connection
						</Card.Title>
					</Card.Header>
					<Card.Content class="space-y-4">
						<!-- Available Cameras -->
						<div class="space-y-2">
							<div class="text-sm font-medium text-green-300">Available Camera Inputs:</div>
							<div class="grid grid-cols-2 gap-2">
								{#each compute.sessionConfig?.cameraNames || [] as cameraName}
									<button
										onclick={() => selectedCameraName = cameraName}
										class="p-2 rounded border text-left {selectedCameraName === cameraName 
											? 'border-green-500 bg-green-500/20' 
											: 'border-slate-600 bg-slate-800/50 hover:bg-slate-700/50'}"
									>
										<div class="text-sm font-medium">{cameraName}</div>
										<div class="text-xs text-slate-400">
											Room: {compute.sessionData?.camera_room_ids[cameraName]?.slice(-8)}
										</div>
									</button>
								{/each}
							</div>
						</div>

						<!-- Connection Status -->
						<div class="rounded-lg border border-green-500/30 bg-green-900/20 p-3">
							<div class="flex items-center justify-between">
								<div>
									<p class="text-sm font-medium text-green-300">
										Selected Camera: {selectedCameraName}
									</p>
									<p class="text-xs text-green-400/70">
										{localStream ? 'Connected' : 'Not Connected'}
									</p>
								</div>
								{#if !localStream}
									<Button
										variant="default"
										size="sm"
										onclick={handleConnectLocalCamera}
										disabled={isConnecting}
										class="bg-green-600 hover:bg-green-700 text-xs disabled:opacity-50"
									>
										{#if isConnecting}
											<span class="icon-[mdi--loading] animate-spin mr-1 size-3"></span>
											Connecting...
										{:else}
											<span class="icon-[mdi--camera] mr-1 size-3"></span>
											Connect Camera
										{/if}
									</Button>
								{:else}
									<Button
										variant="destructive"
										size="sm"
										onclick={handleDisconnectCamera}
										class="text-xs"
									>
										<span class="icon-[mdi--close-circle] mr-1 size-3"></span>
										Disconnect
									</Button>
								{/if}
							</div>
						</div>

						<!-- Live Preview -->
						{#if localStream}
							<div class="space-y-2">
								<div class="text-sm font-medium text-green-300">Live Preview:</div>
								<div class="rounded border border-green-500/30 bg-black/50 aspect-video overflow-hidden">
									<video
										autoplay
										muted
										playsinline
										class="w-full h-full object-cover"
										onloadedmetadata={(e) => {
											const video = e.target as HTMLVideoElement;
											video.srcObject = localStream;
										}}
									></video>
								</div>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Session Camera Details -->
				<Card.Root class="border-blue-500/30 bg-blue-500/5">
					<Card.Header>
						<Card.Title class="flex items-center gap-2 text-base text-blue-200">
							<span class="icon-[mdi--information] size-4"></span>
							Session Camera Details
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-2 text-xs">
							{#each Object.entries(compute.sessionData?.camera_room_ids || {}) as [camera, roomId]}
								<div class="flex justify-between items-center p-2 rounded bg-slate-800/50">
									<span class="text-blue-300 font-medium">{camera}</span>
									<span class="text-blue-200 font-mono">{roomId}</span>
								</div>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Quick Info -->
			<div class="rounded border border-slate-700 bg-slate-800/30 p-2 text-xs text-slate-500">
				<span class="icon-[mdi--information] mr-1 size-3"></span>
				Video inputs stream camera data to the AI model for visual processing. Each camera connects to a dedicated room in the session.
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root> 