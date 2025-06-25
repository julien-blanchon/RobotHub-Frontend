<script lang="ts">
	import { ICON } from "$lib/utils/icon";
	import type { VideoInstance } from "$lib/elements/video/VideoManager.svelte";
	import {
		BaseStatusBox,
		StatusHeader,
		StatusContent,
		StatusIndicator,
		StatusButton
	} from "$lib/components/3d/ui";

	interface Props {
		video: VideoInstance;
		handleClick?: () => void;
	}

	let { video, handleClick }: Props = $props();

	const inputColor = "rgb(34, 197, 94)";
</script>

<BaseStatusBox
	color={inputColor}
	borderOpacity={0.6}
	backgroundOpacity={0.2}
	opacity={video.hasInput ? 1 : 0.6}
	onclick={handleClick}
>
	{#if video.hasInput}
		<!-- Active Input State -->
		{#if video.input.type === "local-camera"}
			<StatusHeader
				icon={ICON["icon-[material-symbols--download]"].svg}
				text="CAMERA"
				color={inputColor}
				opacity={0.9}
			/>
		{:else}
			<StatusHeader
				icon={ICON["icon-[material-symbols--download]"].svg}
				text="REMOTE"
				color="rgb(96, 165, 250)"
				opacity={0.9}
			/>
		{/if}

		<StatusContent
			title={video.input.type === "local-camera" ? "Local Camera" : `Room: ${video.input.roomId}`}
			subtitle="Connected"
			color={inputColor}
			variant="primary"
		/>

		<!-- Active pulse indicator -->
		<StatusIndicator color={inputColor} />
	{:else}
		<!-- No Input State -->
		<StatusHeader
			icon={ICON["icon-[material-symbols--download]"].svg}
			text="NO INPUT"
			color={inputColor}
			opacity={0.7}
		/>

		<StatusContent title="Click to Start" color={inputColor} variant="secondary" />

		<StatusButton
			icon={ICON["icon-[mdi--plus]"].svg}
			text="Add Input"
			color={inputColor}
			backgroundOpacity={0.1}
			textOpacity={0.7}
		/>
	{/if}
</BaseStatusBox>
