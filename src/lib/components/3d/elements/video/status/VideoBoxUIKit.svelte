<script lang="ts">
	import { ICON } from "$lib/utils/icon";
	import type { VideoInstance } from "$lib/elements/video/VideoManager.svelte";
	import { 
		BaseStatusBox, 
		StatusHeader, 
		StatusContent
	} from "$lib/components/3d/ui";

	interface Props {
		video: VideoInstance;
	}

	let { video }: Props = $props();

	const videoColor = "rgb(217, 119, 6)";
</script>


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