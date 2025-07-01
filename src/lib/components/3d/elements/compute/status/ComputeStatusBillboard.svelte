<script lang="ts">
	import { T } from "@threlte/core";
	import { Billboard, interactivity } from "@threlte/extras";
	import { Root, Container } from "threlte-uikit";
	import ComputeConnectionFlowBoxUIKit from "./ComputeConnectionFlowBoxUIKit.svelte";
	import type { RemoteCompute } from "$lib/elements/compute//RemoteCompute.svelte";
	import { Tween } from "svelte/motion";
	import { cubicOut } from "svelte/easing";

	interface Props {
		compute: RemoteCompute;
		visible?: boolean;
		onVideoInputBoxClick: (compute: RemoteCompute) => void;
		onRobotInputBoxClick: (compute: RemoteCompute) => void;
		onRobotOutputBoxClick: (compute: RemoteCompute) => void;
		duration?: number;
		delay?: number;
	}

	let {
		compute,
		visible = true,
		onVideoInputBoxClick,
		onRobotInputBoxClick,
		onRobotOutputBoxClick,
		duration = 100,
		delay = 0
	}: Props = $props();

	interactivity();

	const tweenedScale = Tween.of(
		() => {
			return visible ? 1 : 0;
		},
		{ duration: duration, easing: cubicOut, delay: delay }
	);
	const tweenedOpacity = Tween.of(
		() => {
			return visible ? 1 : 0;
		},
		{ duration: duration, easing: cubicOut, delay: delay }
	);
</script>

<T.Group
	onclick={(e) => e.stopPropagation()}
	position.z={0.4}
	padding={10}
	rotation={[-Math.PI / 2, 0, 0]}
	scale={[0.1, 0.1, 0.1]}
	pointerEvents="listener"
>
	<Billboard>
		<Root name={`compute-status-billboard-${compute.id}`}>
			<Container
				width="100%"
				height="100%"
				alignItems="center"
				justifyContent="center"
				padding={20}
				transformScaleX={tweenedScale.current}
				transformScaleY={tweenedScale.current}
				transformScaleZ={tweenedScale.current}
				opacity={tweenedOpacity.current}
			>
				<ComputeConnectionFlowBoxUIKit
					{compute}
					{onVideoInputBoxClick}
					{onRobotInputBoxClick}
					{onRobotOutputBoxClick}
				/>
			</Container>
		</Root>
	</Billboard>
</T.Group>
