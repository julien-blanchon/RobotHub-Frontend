<script lang="ts">
	import { T } from "@threlte/core";
	import { Billboard, interactivity } from "@threlte/extras";
	import { Root, Container } from "threlte-uikit";
	import VideoConnectionFlowBoxUIKit from "./VideoConnectionFlowBoxUIKit.svelte";
	import type { VideoInstance } from "$lib/elements/video/VideoManager.svelte";

	interface Props {
		video: VideoInstance;
		offset?: number;
		visible?: boolean;
		onInputBoxClick: (video: VideoInstance) => void;
		onOutputBoxClick: (video: VideoInstance) => void;
	}

	let { video, offset = 10, visible = true, onInputBoxClick, onOutputBoxClick }: Props = $props();

	interactivity();
</script>

<!-- {#if visible} -->
	<T.Group
		onpointerdown={(e) => e.stopPropagation()}
		onpointerup={(e) => e.stopPropagation()}
		onpointermove={(e) => e.stopPropagation()}
		onclick={(e) => e.stopPropagation()}
		position.z={0.22}
		padding={10}
		rotation={[Math.PI / 2, 0, 0]}
		scale={[0.12, 0.12, 0.12]}
		pointerEvents="listener"
	>
		<Billboard>
			<Root name={`video-status-billboard-${video.id}`}>
				<Container
					width="100%"
					height="100%"
					alignItems="center"
					justifyContent="center"
					padding={20}
				>
					<VideoConnectionFlowBoxUIKit {visible} {video} {onInputBoxClick} {onOutputBoxClick} />
				</Container>
			</Root>
		</Billboard>

		<!-- <Billboard>
		<HTML
			transform
			autoRender={true}
			center={true}
			distanceFactor={3}
			pointerEvents="auto"
			style="
				pointer-events: auto !important;
				image-rendering: auto;
				image-rendering: smooth;
				text-rendering: optimizeLegibility;
				-webkit-font-smoothing: subpixel-antialiased;
				-moz-osx-font-smoothing: auto;
				backface-visibility: hidden;
				transform-style: preserve-3d;
				will-change: transform;
			"
		>
			<div
				class="pointer-events-auto select-none"
				style="pointer-events: auto !important;"
				in:scale={{ duration: 200, start: 0.5 }}
			>
                <VideoConnectionFlowBox {video} {videoStatus} {onBoxClick} />
			</div>
		</HTML>
	</Billboard> -->
	</T.Group>
<!-- {/if} -->
