<script lang="ts">
	import { T } from "@threlte/core";
	import GPU from "./GPU.svelte";
	import ComputeStatusBillboard from "./status/ComputeStatusBillboard.svelte";
	import type { RemoteCompute } from "$lib/elements/compute//RemoteCompute.svelte";
	import { interactivity, type IntersectionEvent, useCursor } from "@threlte/extras";

	interface Props {
		compute: RemoteCompute;
		onVideoInputBoxClick: (compute: RemoteCompute) => void;
		onRobotInputBoxClick: (compute: RemoteCompute) => void;
		onRobotOutputBoxClick: (compute: RemoteCompute) => void;
	}

	let { compute, onVideoInputBoxClick, onRobotInputBoxClick, onRobotOutputBoxClick }: Props =
		$props();

	const { onPointerEnter, onPointerLeave, hovering } = useCursor();

	let isToggled = $state(false);

	function handleClick(event: IntersectionEvent<MouseEvent>) {
		event.stopPropagation();
		isToggled = !isToggled;
	}
</script>

<T.Group
	position.x={compute.position.x}
	position.y={compute.position.y}
	position.z={compute.position.z}
	scale={[1, 1, 1]}
>
	<T.Group onpointerenter={onPointerEnter} onpointerleave={onPointerLeave} onclick={handleClick}>
		<GPU rotating={$hovering} />
	</T.Group>
	<T.Group scale={[8, 8, 8]} rotation={[-Math.PI / 2, 0, 0]}>
		<ComputeStatusBillboard
			{compute}
			{onVideoInputBoxClick}
			{onRobotInputBoxClick}
			{onRobotOutputBoxClick}
			visible={isToggled}
		/>
	</T.Group>
</T.Group>
