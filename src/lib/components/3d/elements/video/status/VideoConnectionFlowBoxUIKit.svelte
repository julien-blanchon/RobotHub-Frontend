<script lang="ts">
	import InputVideoBoxUIKit from "./InputVideoBoxUIKit.svelte";
	import OutputVideoBoxUIKit from "./OutputVideoBoxUIKit.svelte";
	import VideoBoxUIKit from "./VideoBoxUIKit.svelte";
	import type { VideoInstance } from "$lib/elements/video/VideoManager.svelte";
	import { Container } from "threlte-uikit";
	import { StatusArrow } from "$lib/components/3d/ui";
	import { Tween } from "svelte/motion";
	import { cubicOut } from "svelte/easing";

	interface Props {
		visible: boolean;
		video: VideoInstance;
		onInputBoxClick: (video: VideoInstance) => void;
		onOutputBoxClick: (video: VideoInstance) => void;
		duration?: number;
		delay?: number;
	}

	let { visible, video, onInputBoxClick, onOutputBoxClick, duration = 100, delay = 0 }: Props = $props();

	const inputColor = "rgb(34, 197, 94)";
	const outputColor = "rgb(59, 130, 246)";

	const tweenedScale = Tween.of(() => {
		return visible ? 1 : 0;
	}, { duration: duration, easing: cubicOut, delay: delay });
	const tweenedOpacity = Tween.of(() => {
		return visible ? 1 : 0;
	}, { duration: duration, easing: cubicOut, delay: delay });
</script>

<Container
	flexDirection="row"
	alignItems="center"
	gap={12}
	transformScaleX={tweenedScale.current}
	transformScaleY={tweenedScale.current}
	transformScaleZ={tweenedScale.current}
	opacity={tweenedOpacity.current}
>
	<!-- Input Video Box -->
	<InputVideoBoxUIKit {video} handleClick={() => onInputBoxClick(video)} />

	<!-- Arrow 1: Input to Video -->
	<StatusArrow color={inputColor} opacity={video.hasInput ? 1 : 0.5} />

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
