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

	const outputColor = "rgb(59, 130, 246)";
</script>

<BaseStatusBox
	color={outputColor}
	borderOpacity={0.6}
	backgroundOpacity={0.2}
	opacity={video.hasOutput ? 1 : !video.canOutput ? 0.4 : 0.6}
	onclick={handleClick}
>
	{#if video.hasOutput}
		<!-- Active Output State -->
		<StatusHeader
			icon={ICON["icon-[material-symbols--upload]"].svg}
			text="OUTPUT"
			color={outputColor}
			opacity={0.9}
		/>

		<StatusContent
			title="Broadcasting"
			subtitle={`Room: ${video.output.roomId}`}
			color={outputColor}
			variant="primary"
		/>

		<!-- Active pulse indicator -->
		<StatusIndicator color={outputColor} />
	{:else}
		<!-- No Output State -->
		<StatusHeader
			icon={ICON["icon-[material-symbols--upload]"].svg}
			text="NO OUTPUT"
			color={outputColor}
			opacity={0.7}
		/>

		<StatusContent
			title={video.canOutput ? "Click to Start" : "Need Camera"}
			color={outputColor}
			variant="secondary"
		/>

		<StatusButton
			icon={ICON["icon-[mdi--plus]"].svg}
			text="Add Output"
			color={outputColor}
			textOpacity={0.7}
		/>
	{/if}
</BaseStatusBox>
