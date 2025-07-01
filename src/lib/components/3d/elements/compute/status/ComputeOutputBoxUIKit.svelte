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

	interface Props {
		compute: RemoteCompute;
		handleClick?: () => void;
	}

	let { compute, handleClick }: Props = $props();

	// Output theme color (blue)
	const outputColor = "rgb(59, 130, 246)";
</script>

<BaseStatusBox
	minWidth={110}
	minHeight={135}
	color={outputColor}
	borderOpacity={compute.hasSession && compute.isRunning ? 0.8 : 0.4}
	backgroundOpacity={0.2}
	opacity={compute.hasSession && compute.isRunning ? 1 : !compute.hasSession ? 0.4 : 0.6}
	onclick={handleClick}
>
	{#if compute.hasSession && compute.outputConnections}
		<!-- Active Output State -->
		<StatusHeader
			icon={ICON["icon-[material-symbols--upload]"].svg}
			text="OUTPUT"
			color={outputColor}
			opacity={0.9}
			fontSize={12}
		/>

		<StatusContent
			title={compute.isRunning ? "Active" : "Ready"}
			subtitle="Commands"
			color="rgb(37, 99, 235)"
			variant="primary"
		/>

		<!-- Status indicator based on running state -->
		<StatusIndicator
			color={compute.isRunning ? outputColor : "rgb(245, 158, 11)"}
			type={compute.isRunning ? "pulse" : "dot"}
		/>
	{:else}
		<!-- No Session State -->
		<StatusHeader
			icon={ICON["icon-[material-symbols--upload]"].svg}
			text="NO OUTPUT"
			color={outputColor}
			opacity={0.7}
			iconSize={12}
			fontSize={12}
		/>

		<StatusContent
			title={!compute.hasSession ? "Need Session" : "Configure"}
			color="rgb(59, 130, 246)"
			variant="secondary"
		/>

		<StatusButton
			text="Setup"
			icon={ICON["icon-[mdi--plus]"].svg}
			color={outputColor}
			backgroundOpacity={0.1}
			textOpacity={0.7}
		/>
	{/if}
</BaseStatusBox>
