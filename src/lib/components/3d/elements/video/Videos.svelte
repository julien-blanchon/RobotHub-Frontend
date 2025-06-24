<script lang="ts">
	import { useThrelte } from "@threlte/core";
	import { videoManager } from "$lib/elements/video/VideoManager.svelte";
	import { onMount } from "svelte";
	import VideoInputConnectionModal from "@/components/3d/elements/video/modal/VideoInputConnectionModal.svelte";
	import VideoOutputConnectionModal from "@/components/3d/elements/video/modal/VideoOutputConnectionModal.svelte";
	import type { VideoInstance } from "$lib/elements/video/VideoManager.svelte";
	import { generateName } from "$lib/utils/generateName";
	import VideoGridItem from "@/components/3d/elements/video/VideoGridItem.svelte";

	interface Props {
		workspaceId: string;
	}
	let {workspaceId}: Props = $props();

	// Modal state
	let isInputModalOpen = $state(false);
	let isOutputModalOpen = $state(false);
	let selectedVideo = $state<VideoInstance | null>(null);

	// Modal helpers
	function onInputBoxClick(video: VideoInstance) {
		selectedVideo = video;
		isInputModalOpen = true;
	}
	function onOutputBoxClick(video: VideoInstance) {
		selectedVideo = video;
		isOutputModalOpen = true;
	}
</script>

{#each videoManager.videos as video (video.id)}
	<VideoGridItem
		{video}
		{workspaceId}
		onCameraMove={() => {}}
		onInputBoxClick={onInputBoxClick}
		onOutputBoxClick={onOutputBoxClick}
	/>
{/each}

<!-- Connection Modals -->
{#if selectedVideo}
	<VideoInputConnectionModal bind:open={isInputModalOpen} video={selectedVideo} {workspaceId} />
	<VideoOutputConnectionModal bind:open={isOutputModalOpen} video={selectedVideo} {workspaceId} />
{/if}
