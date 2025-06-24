<script lang="ts">
	import { ICON } from "$lib/utils/icon";
	import type { VideoInstance } from "$lib/elements/video/VideoManager.svelte";
	import { 
		BaseStatusBox, 
		StatusHeader, 
		StatusContent
	} from "$lib/components/3d/ui";
	import { Text } from "threlte-uikit";

	interface Props {
		video: VideoInstance;
	}

	let { video }: Props = $props();

	// Video theme color (orange)
	const videoColor = "rgb(217, 119, 6)";

</script>

<!--
@component
Video box showing basic video instance information and status.
Displays video name and ID with consistent theming.
-->

<BaseStatusBox
	color={videoColor}
	borderOpacity={0.6}
	backgroundOpacity={0.2}
	clickable={false}
>
		<!-- Video Header -->
		<StatusHeader
			icon={ICON["icon-[mdi--video]"].svg}
			text="VIDEO"
			color={videoColor}
			opacity={0.9}
		/>

		<!-- Video Info -->
		<StatusContent
			title={video.name}
			subtitle={video.id.slice(0, 8)}
			color="rgb(253, 230, 138)"
			variant="primary"
		/>
</BaseStatusBox> 