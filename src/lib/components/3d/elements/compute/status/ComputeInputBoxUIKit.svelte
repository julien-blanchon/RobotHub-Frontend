<script lang="ts">
	import type { RemoteCompute } from "$lib/elements/compute//RemoteCompute.svelte";
	import { ICON } from "$lib/utils/icon";
	import { 
		BaseStatusBox, 
		StatusHeader, 
		StatusContent, 
		StatusIndicator,
		StatusButton
	} from "$lib/components/3d/ui";
	import { Container, SVG, Text } from "threlte-uikit";

	interface Props {
		compute: RemoteCompute;
		handleClick?: () => void;
	}

	let { compute, handleClick }: Props = $props();

	// Input theme color (green)
	const inputColor = "rgb(34, 197, 94)";
</script>

<!--
@component
Compact input box showing the status of video and robot inputs for AI sessions.
Displays input connection information when session exists or connection prompt when disconnected.
-->

<BaseStatusBox
	minWidth={120}
	minHeight={80}
	color={inputColor}
	borderOpacity={compute.hasSession ? 0.8 : 0.4}
	backgroundOpacity={0.2}
	opacity={compute.hasSession ? 1 : 0.6}
	onclick={handleClick}
>
	{#if compute.hasSession && compute.inputConnections}
		<!-- Active Input State -->
		<StatusHeader
			icon={ICON["icon-[material-symbols--download]"].svg}
			text="INPUTS"
			color={inputColor}
			opacity={0.9}
			fontSize={12}
		/>

		<!-- Camera Inputs -->
		<StatusContent
			title={`${Object.keys(compute.inputConnections.cameras).length} Cameras`}
			subtitle="Joint States"
			color="rgb(187, 247, 208)"
			variant="primary"
		/>

		<!-- Active indicator -->
		<StatusIndicator color={inputColor} />
	{:else}
		<!-- No Session State -->
		<StatusHeader
			icon={ICON["icon-[material-symbols--download]"].svg}
			text="NO INPUTS"
			color={inputColor}
			opacity={0.7}
			iconSize={12}
			fontSize={12}
		/>

		<StatusContent
			title="Setup Required"
			color="rgb(134, 239, 172)"
			variant="secondary"
		/>

		<StatusButton
			text="Add Session"
			icon={ICON["icon-[mdi--plus]"].svg}
			color={inputColor}
			backgroundOpacity={0.1}
			textOpacity={0.7}
		/>
	{/if}
</BaseStatusBox> 