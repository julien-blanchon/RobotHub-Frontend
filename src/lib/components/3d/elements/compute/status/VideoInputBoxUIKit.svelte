<script lang="ts">
	import { Text } from "threlte-uikit";
	import { ICON } from "$lib/utils/icon";
	import type { RemoteCompute } from "$lib/elements/compute//RemoteCompute.svelte";
	import { BaseStatusBox, StatusHeader, StatusContent, StatusIndicator, StatusButton } from "$lib/components/3d/ui";

	interface Props {
		compute: RemoteCompute;
		handleClick?: () => void;
	}

	let { compute, handleClick }: Props = $props();

	// Input theme color (green)
	const inputColor = "rgb(34, 197, 94)";
	
	// Icons
	// const videoIcon = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMTcgMTAuNVY3YTEgMSAwIDAgMC0xLTFINGExIDEgMCAwIDAtMSAxdjEwYTEgMSAwIDAgMCAxIDFoMTJhMSAxIDAgMCAwIDEtMXYtMy41bDQgNHYtMTF6Ii8+PC9zdmc+";
	// const videoOffIcon = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMy4yNyAyTDIgMy4yN2wxLjY4IDEuNjhDMy4yNiA1LjMgMyA1LjY0IDMgNnYxMmMwIC41NS40NSAxIDEgMWg4Yy4zNiAwIC42OC0uMTUuOTItLjM5bDEuNzMgMS43M0wxNiAyMC43M0wxOC43MyAxOGwtLjg5LS44OUwyMCAxNXYtMWwtNC05VjVjMC0uNTUtLjQ1LTEtMS0xSDlsLTEuMTYtMS4xNkMxMS41NSAyIDEwIDQuMjcgMTAgNHYxTDMuMjcgMnoiLz48L3N2Zz4=";
	// const videoPlusIcon = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMTMgMTRoMXYzaDN2MWgtM3YzaC0xdi0zaC0zdi0xaDN2LTN6bTUgMGwtNS0zdjZsNS0zek0xMSAzSDNDMS45IDMgMSAzLjkgMSA1djEwYzAgMS4xLjkgMiAyIDJoOGMxLjEgMCAyLS45IDItMlY1YzAtMS4xLS45LTItMi0yeiIvPjwvc3ZnPg==";
	// const cameraMultipleIcon = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjMDAwIiBkPSJNNCAyaDZsMS41IDEuNUg2djJoOGwtLjUtLjVIMThsMS41IDEuNWgzYzEuMSAwIDIgLjkgMiAydjEwYzAgMS4xLS45IDItMiAySDZjLTEuMSAwLTItLjktMi0yVjRjMC0xLjEuOS0yIDItMnptNSA2Yy0xLjExIDAtMi4wOC45LTIuMDggMnMuOTcgMiAyLjA4IDIgMi4wOC0uOSAyLjA4LTItLjk3LTItMi4wOC0yeiIvPjwvc3ZnPg==";
</script>

<!--
@component
Compact video input box showing the status of camera video streams for AI sessions.
Displays video connection information when session exists or connection prompt when disconnected.
-->

<BaseStatusBox 
	minWidth={100}
	minHeight={65}
	color={inputColor}
	borderOpacity={0.6}
	backgroundOpacity={0.2}
	opacity={compute.hasSession ? 1 : 0.6}
	onclick={handleClick}
>
	{#if compute.hasSession && compute.inputConnections}
		<!-- Active Video Input State -->
		<StatusHeader 
			icon={ICON["icon-[mdi--video]"].svg} 
			text="VIDEO" 
			color={inputColor}
			opacity={0.9}
			fontSize={11}
		/>

		<!-- Camera Streams -->
		<StatusContent 
			title={`${Object.keys(compute.inputConnections.cameras).length} Cameras`}
			color="rgb(187, 247, 208)"
			variant="primary"
		/>

		<!-- Connected status -->
		<StatusIndicator color={inputColor} />
	{:else}
		<!-- No Session State -->
		<StatusHeader 
			icon={ICON["icon-[mdi--video-off]"].svg} 
			text="NO VIDEO" 
			color={inputColor}
			opacity={0.7}
			fontSize={11}
		/>

		<StatusContent 
			title="Setup Video" 
			color="rgb(134, 239, 172)" 
			variant="secondary"
		/>

		<StatusButton 
			icon={ICON["icon-[mdi--plus]"].svg}
			text="Add"
			color={inputColor}
			backgroundOpacity={0.1}
			textOpacity={0.7}
		/>
	{/if}
</BaseStatusBox> 