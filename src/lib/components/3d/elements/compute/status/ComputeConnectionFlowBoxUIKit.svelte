<script lang="ts">
	import VideoInputBoxUIKit from "./VideoInputBoxUIKit.svelte";
	import RobotInputBoxUIKit from "./RobotInputBoxUIKit.svelte";
	import ComputeOutputBoxUIKit from "./ComputeOutputBoxUIKit.svelte";
	import ComputeBoxUIKit from "./ComputeBoxUIKit.svelte";
	import type { RemoteCompute } from "$lib/elements/compute//RemoteCompute.svelte";
	import { Container } from "threlte-uikit";
	import { StatusArrow } from "$lib/components/3d/ui";

	interface Props {
		compute: RemoteCompute;
		onVideoInputBoxClick: (compute: RemoteCompute) => void;
		onRobotInputBoxClick: (compute: RemoteCompute) => void;
		onRobotOutputBoxClick: (compute: RemoteCompute) => void;
	}

	let { compute, onVideoInputBoxClick, onRobotInputBoxClick, onRobotOutputBoxClick }: Props = $props();

	// Colors
	const inputColor = "rgb(34, 197, 94)";
	const outputColor = "rgb(59, 130, 246)";
</script>

<!--
@component
Elegant 2->1->1 connection flow layout for AI compute processing.
Clean vertical stacking of inputs that merge into compute, then flow to output.
-->

<Container flexDirection="row" alignItems="center" gap={12}>
	<!-- Left: Stacked Inputs -->
	<Container flexDirection="column" alignItems="center" gap={6}>
		<VideoInputBoxUIKit {compute} handleClick={() => onVideoInputBoxClick(compute)} />
		<RobotInputBoxUIKit {compute} handleClick={() => onRobotInputBoxClick(compute)} />
	</Container>

	<!-- Arrow: Inputs to Compute -->
	<StatusArrow
		direction="right"
		color={inputColor}
		opacity={compute.hasSession ? 1 : 0.5}
	/>

	<!-- Center: Compute -->
	<ComputeBoxUIKit {compute} />

	<!-- Arrow: Compute to Output -->
	<StatusArrow
		direction="right"
		color={outputColor}
		opacity={compute.hasSession && compute.isRunning ? 1 : compute.hasSession ? 0.7 : 0.5}
	/>

	<!-- Right: Output -->
	<ComputeOutputBoxUIKit {compute} handleClick={() => onRobotOutputBoxClick(compute)} />
</Container> 