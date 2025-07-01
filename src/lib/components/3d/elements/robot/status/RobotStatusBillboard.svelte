<script lang="ts">
	import { Root, Container } from "threlte-uikit";
	import { T } from "@threlte/core";
	import { Billboard, interactivity } from "@threlte/extras";
	import ConnectionFlowBoxUIkit from "./ConnectionFlowBoxUIkit.svelte";
	import type { Robot } from "$lib/elements/robot/Robot.svelte.js";

	interface Props {
		robot: Robot;
		visible: boolean;
		onInputBoxClick: (robot: Robot) => void;
		onRobotBoxClick: (robot: Robot) => void;
		onOutputBoxClick: (robot: Robot) => void;
		offset?: number;
	}

	let {
		robot,
		visible = true,
		onInputBoxClick,
		onRobotBoxClick,
		onOutputBoxClick,
		offset = 0.26
	}: Props = $props();

	interactivity();
</script>

<!-- {#if visible} -->
	<T.Group
		position.z={0.35}
		rotation={[Math.PI / 2, 0, 0]}
		scale={[0.12, 0.12, 0.12]}
		padding={10}
		pointerEvents="listener"
	>
		<Billboard>
			<Root name={`robot-status-billboard-${robot.id}`}>
				<Container
					width="100%"
					height="100%"
					alignItems="center"
					justifyContent="center"
					padding={20}
				>
					<ConnectionFlowBoxUIkit
						{visible}
						{robot}
						{onInputBoxClick}
						{onRobotBoxClick}
						{onOutputBoxClick}
					/>
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
				{#if showManualControl}
					<ManualControlBox {robot} {robotStatus} {onBoxClick} />
				{:else}
					<ConnectionFlowBox {robot} {robotStatus} {onBoxClick} />
				{/if}
			</div>
		</HTML>
	</Billboard> -->
	</T.Group>
<!-- {/if} -->
