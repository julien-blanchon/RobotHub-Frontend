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

	// Output theme color (blue)
	const outputColor = "rgb(59, 130, 246)";
	
	// Icons
	// const exportIcon = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMTkgMTJsLTcgN3YtNEg1di02aDd2LTR6Ii8+PC9zdmc+";
	// const robotIcon = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMTIgMTJjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6TTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgMThDNy4zIDIwIDMuOCAxNi42IDMuOCAxMlM3LjMgNCA5IDRzNS4yIDMuNCA1LjIgOC02IDgtNSA4eiIvPjwvc3ZnPg==";
	// const plusIcon = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMTkgMTNoLTZ2NmgtMnYtNkg1di0yaDZWNWgydjZoNnoiLz48L3N2Zz4=";
</script>

<!--
@component
Compact output box showing the status of robot outputs for AI sessions.
Displays output connection information when session exists or connection prompt when disconnected.
-->

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
			color="rgb(191, 219, 254)"
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
			title={!compute.hasSession ? 'Need Session' : 'Configure'}
			color="rgb(147, 197, 253)"
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