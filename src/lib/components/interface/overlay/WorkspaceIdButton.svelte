<script lang="ts">
	import { Button } from "@/components/ui/button";
	import * as Dialog from "@/components/ui/dialog";
	import * as Card from "@/components/ui/card";
	import { Badge } from "@/components/ui/badge";
	import { toast } from "svelte-sonner";

	interface Props {
		workspaceId: string;
		open?: boolean;
	}

	let { workspaceId, open = $bindable(false) }: Props = $props();

	// Copy workspace ID to clipboard
	let isCopying = $state(false);
	
	const copyWorkspaceId = async () => {
		try {
			isCopying = true;
			await navigator.clipboard.writeText(workspaceId);
			toast.success('Workspace ID copied!', {
				description: 'Share this ID with others to access the same video streams, robot controls, and Inference Sessions in this workspace.'
			});
			setTimeout(() => {
				isCopying = false;
			}, 200);
		} catch (err) {
			console.error('Failed to copy workspace ID:', err);
			toast.error('Failed to copy workspace ID');
			isCopying = false;
		}
	};

	// Extract first and last 3 letters from workspace ID
	const getWorkspaceDisplay = (id: string) => {
		if (id.length <= 6) return `#${id}`;
		return `#${id.slice(0, 3)}...${id.slice(-3)}`;
	};

	// Copy full URL to clipboard
	const copyUrl = async () => {
		const url = `http://blanchon-lerobot-arena.hf.space/${workspaceId}`;
		try {
			await navigator.clipboard.writeText(url);
			toast.success('Workspace URL copied!', {
				description: 'Share this URL for direct access to this workspace.'
			});
		} catch (err) {
			console.error('Failed to copy URL:', err);
			toast.error('Failed to copy URL');
		}
	};
</script>

<!-- Workspace ID Button -->
<div class="flex items-center overflow-hidden rounded-lg h-8">
	<div class="flex items-center h-full bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
		<!-- Workspace ID Display with Copy on Hover -->
		<button
			onclick={copyWorkspaceId}
			class="group relative flex items-center px-3 h-full text-sm font-mono text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 cursor-pointer"
			title="Click to copy workspace ID"
		>
			<!-- Workspace ID Text -->
			<span class="transition-opacity duration-300 group-hover:opacity-0">
				{getWorkspaceDisplay(workspaceId)}
			</span>
			
			<!-- Copy Icon (appears on hover) -->
			<span class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
				<span 
					class="icon-[mdi--content-copy] size-4 text-slate-600 dark:text-slate-400 transition-transform duration-200"
					class:animate-pulse={isCopying}
					class:scale-110={isCopying}
				></span>
			</span>
		</button>
		
		<!-- Modal Button -->
		<Button
			variant="ghost"
			size="sm"
			onclick={() => open = true}
			class="rounded-none border-0 border-l border-slate-200 dark:border-slate-700 px-3 h-full text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200"
			title="Open workspace details"
		>
			<span class="icon-[mdi--information-outline] size-4"></span>
		</Button>
	</div>
</div>

<!-- Workspace Details Modal -->
<Dialog.Root bind:open>
	<Dialog.Content
		class="max-w-lg border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
	>
		<Dialog.Header class="pb-4">
			<Dialog.Title class="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100">
				<span class="icon-[mdi--share-variant] size-5 text-blue-500 dark:text-blue-400"></span>
				Workspace Sharing
			</Dialog.Title>
			<Dialog.Description class="text-sm text-slate-600 dark:text-slate-400">
				Connect and collaborate with others using this workspace
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<!-- Workspace URL -->
			<Card.Root class="gap-2 border-blue-300/30 bg-blue-100/10 dark:border-blue-500/30 dark:bg-blue-500/10">
				<Card.Header >
					<Card.Title class="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-200">
						<span class="icon-[mdi--link] size-4"></span>
						Direct Access URL
					</Card.Title>
				</Card.Header>
				<Card.Content class="pt-0">
					<div class="space-y-2">
						<div class="rounded-lg border border-slate-300 bg-slate-50 p-2 dark:border-slate-600 dark:bg-slate-800">
							<div class="break-all font-mono text-sm text-slate-800 dark:text-slate-200">
								https://blanchon-robothub-frontend.hf.space<span class="bg-blue-100 text-blue-800 px-1 rounded dark:bg-blue-900 dark:text-blue-200">{workspaceId}</span>
							</div>
						</div>
						<Button
							variant="outline"
							size="sm"
							onclick={copyUrl}
							class="w-full text-xs"
						>
							<span class="icon-[mdi--content-copy] mr-2 size-3"></span>
							Copy URL
						</Button>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Key Features -->
			<div class="space-y-3">
				<h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">What you can share:</h3>
				
				<div class="space-y-2 text-sm">
					<div class="flex items-start gap-2">
						<span class="icon-[mdi--video] size-4 text-green-500 mt-0.5 flex-shrink-0"></span>
						<span class="text-slate-600 dark:text-slate-400">
							<strong class="text-slate-800 dark:text-slate-200">Video Streams</strong> - Live camera feeds from connected devices
						</span>
					</div>
					
					<div class="flex items-start gap-2">
						<span class="icon-[mdi--robot] size-4 text-orange-500 mt-0.5 flex-shrink-0"></span>
						<span class="text-slate-600 dark:text-slate-400">
							<strong class="text-slate-800 dark:text-slate-200">Robot Control</strong> - Real-time teleoperation and monitoring
						</span>
					</div>
					
					<div class="flex items-start gap-2">
						<span class="icon-[mdi--brain] size-4 text-purple-500 mt-0.5 flex-shrink-0"></span>
						<span class="text-slate-600 dark:text-slate-400">
							<strong class="text-slate-800 dark:text-slate-200">AI Sessions</strong> - Shared inference and autonomous control
						</span>
					</div>
				</div>
			</div>

			<!-- Privacy & Security -->
			<Card.Root class="border-amber-300/30 bg-amber-100/10 dark:border-amber-500/30 dark:bg-amber-500/10">
				<Card.Content>
					<div class="flex items-start gap-2">
						<span class="icon-[mdi--shield-check] size-4 text-amber-600 mt-0.5 flex-shrink-0"></span>
						<div class="text-sm">
							<div class="font-medium text-amber-700 dark:text-amber-300 mb-1">Private Workspace</div>
							<div class="text-amber-600 dark:text-amber-400">
								Only users with this workspace ID can access your resources. Share it securely with trusted collaborators.
							</div>
						</div>
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Use Cases -->
			<div class="rounded-lg border border-slate-300 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-800">
				<div class="text-xs text-slate-600 dark:text-slate-400">
					<span class="icon-[mdi--lightbulb] mr-1 size-3"></span>
					<strong>Tip:</strong> Use this for remote teleoperation, collaborative research, demonstrations, or sharing your robot setup with team members across different networks.
				</div>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root> 