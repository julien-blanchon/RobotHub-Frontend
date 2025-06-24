<script lang="ts">
	import { T } from "@threlte/core";
	import { Billboard, interactivity } from "@threlte/extras";
	import { Root, Container } from "threlte-uikit";
	import ComputeConnectionFlowBoxUIKit from "./ComputeConnectionFlowBoxUIKit.svelte";
	import type { RemoteCompute } from "$lib/elements/compute//RemoteCompute.svelte";

	interface Props {
		compute: RemoteCompute;
		offset?: number;
		visible?: boolean;
		onVideoInputBoxClick: (compute: RemoteCompute) => void;
		onRobotInputBoxClick: (compute: RemoteCompute) => void;
		onRobotOutputBoxClick: (compute: RemoteCompute) => void;
	}

	let {
		compute,
		offset = 10,
		visible = true,
		onVideoInputBoxClick,
		onRobotInputBoxClick,
		onRobotOutputBoxClick
	}: Props = $props();

	interactivity();
</script>

<T.Group
	onclick={(e) => e.stopPropagation()}
	position.z={0.4}
	padding={10}
	rotation={[-Math.PI / 2, 0, 0]}
	scale={[0.1, 0.1, 0.1]}
	pointerEvents="listener"
	{visible}
>
	<Billboard>
		<Root name={`compute-status-billboard-${compute.id}`}>
			<Container
				width="100%"
				height="100%"
				alignItems="center"
				justifyContent="center"
				padding={20}
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