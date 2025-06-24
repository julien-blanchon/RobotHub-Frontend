<script lang="ts">
	import InputVideoBoxUIKit from "./InputVideoBoxUIKit.svelte";
	import OutputVideoBoxUIKit from "./OutputVideoBoxUIKit.svelte";
	import VideoBoxUIKit from "./VideoBoxUIKit.svelte";
	import type { VideoInstance } from "$lib/elements/video//VideoManager.svelte";
	import { Container } from "threlte-uikit";
	import { StatusArrow } from "$lib/components/3d/ui";

	interface Props {
		video: VideoInstance;
		onInputBoxClick: (video: VideoInstance) => void;
		onOutputBoxClick: (video: VideoInstance) => void;
	}

	let { video, onInputBoxClick, onOutputBoxClick }: Props = $props();

	// Colors
	const inputColor = "rgb(34, 197, 94)";
	const outputColor = "rgb(59, 130, 246)";
</script>

<Container flexDirection="row" alignItems="center" gap={12}>
	<!-- Input Video Box -->
	<InputVideoBoxUIKit {video} handleClick={() => onInputBoxClick(video)} />

	<!-- Arrow 1: Input to Video -->
	<StatusArrow 
		color={inputColor}
		opacity={video.hasInput ? 1 : 0.5}
	/>

	<!-- Video Box -->
	<VideoBoxUIKit {video} />

	<!-- Arrow 2: Video to Output -->
	<StatusArrow 
		color={outputColor}
		opacity={video.hasInput && video.hasOutput ? 1 : video.hasInput && video.canOutput ? 0.7 : 0.5}
	/>

	<!-- Output Box -->
	<OutputVideoBoxUIKit {video} handleClick={() => onOutputBoxClick(video)} />
</Container> 