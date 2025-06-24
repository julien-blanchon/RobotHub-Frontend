<script lang="ts">
	import { T } from "@threlte/core";
	import Video from "./Video.svelte";
	import VideoStatusBillboard from "./status/VideoStatusBillboard.svelte";
	import type { VideoInstance, VideoStatus } from "$lib/elements/video/VideoManager.svelte";
	import { interactivity, type IntersectionEvent, useCursor } from "@threlte/extras";

	interface Props {
		video: VideoInstance;
		workspaceId: string;
		onCameraMove: () => void;
		onInputBoxClick: (video: VideoInstance) => void;
		onOutputBoxClick: (video: VideoInstance) => void;
	}

	let {
		video,
		workspaceId,
		onCameraMove,
		onInputBoxClick,
		onOutputBoxClick
	}: Props = $props();

	const { onPointerEnter, onPointerLeave } = useCursor();
	interactivity();

	let isToggled = $state(false);
	let hovering = $state(false);

	function handleStatusToggle(event: IntersectionEvent<MouseEvent>) {
		event.stopPropagation();
		isToggled = !isToggled;
	}
</script>

<T.Group
	position.x={video.position.x}
	position.y={video.position.y+1}
	position.z={video.position.z}
	scale={[1, 1, 1]}
>
	<T.Group
		onpointerenter={(event: IntersectionEvent<PointerEvent>) => {
			event.stopPropagation();
			onPointerEnter();
			hovering = true;
		}}
		onpointerover={(event: IntersectionEvent<PointerEvent>) => {
			event.stopPropagation();
			onPointerEnter();
			hovering = true;
		}}
		onpointerout={(event: IntersectionEvent<PointerEvent>) => {
			event.stopPropagation();
			onPointerLeave();
			hovering = false;
		}}
		onpointerleave={(event: IntersectionEvent<PointerEvent>) => {
			event.stopPropagation();
			onPointerLeave();
			hovering = false;
		}}
		onclick={handleStatusToggle}
	>
		<Video videoInstance={video} {workspaceId} />
	</T.Group>
	<T.Group scale={[10, 10, 10]} rotation={[-Math.PI / 2, 0, 0]}>
		<VideoStatusBillboard
			{video}
			offset={0.2}
			{onInputBoxClick}
			{onOutputBoxClick}
			visible={isToggled}
		/>
	</T.Group>

	<!-- Status billboard positioned above the video -->
</T.Group>
