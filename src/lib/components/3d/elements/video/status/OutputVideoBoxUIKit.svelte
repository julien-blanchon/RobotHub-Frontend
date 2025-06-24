<script lang="ts">
	import { ICON } from "$lib/utils/icon";
	import type { VideoInstance } from "$lib/elements/video//VideoManager.svelte";
	import { BaseStatusBox, StatusHeader, StatusContent, StatusIndicator, StatusButton } from "$lib/components/3d/ui";

	interface Props {
		video: VideoInstance;
		handleClick?: () => void;
	}

	let { video, handleClick }: Props = $props();

	// Output theme color (blue)
	const outputColor = "rgb(59, 130, 246)";
	
	// Icons
	// const broadcastIcon = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMTIgMTBjLTEuMSAwLTIgLjktMiAycy45IDIgMiAyczItLjkgMi0ycy0uOS0yLTItMm02IDJjMC0zLjMtMi43LTYtNi02cy02IDIuNy02IDZjMCAyLjIgMS4yIDQuMSAzIDUuMmwxLTEuN2MtMS4yLS43LTItMi0yLTMuNGMwLTIuMiAxLjgtNCA0LTRzNCAxLjggNCA0YzAgMS41LS44IDIuOC0yIDMuNGwxIDEuN2MxLjgtMSAzLTMgMy01LjJNMTIgMkM2LjUgMiAyIDYuNSAyIDEyYzAgMy43IDIgNi45IDUgOC42bDEtMS43Yy0yLjQtMS40LTQtNC00LTYuOWMwLTQuNCAzLjYtOCA4LThzOCAzLjYgOCA4YzAgMy0xLjYgNS41LTQgNi45bDEgMS43YzMtMS43IDUtNC45IDUtOC42YzAtNS41LTQuNS0xMC0xMC0xMCIvPjwvc3ZnPg==";
	// const hdmiPortIcon = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMjEgN0gzYy0xLjEgMC0yIC45LTIgMnY1YzAgMS4xLjkgMiAyIDJoMWwxLjQgMS40Yy40LjQuOS42IDEuNC42aDEwLjNjLjUgMCAxLS4yIDEuNC0uNkwyMCAxNmgxYzEuMSAwIDItLjkgMi0yVjljMC0xLjEtLjktMi0yLTJNMyAxNFY5aDE4djVoLTEuOGwtMiAySDYuOGwtMi0yem0xNi0zSDV2MmgxNHoiLz48L3N2Zz4=";
	// const plusIcon = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMTkgMTNoLTZ2NmgtMnYtNkg1di0yaDZWNWgydjZoNnoiLz48L3N2Zz4=";
</script>

<!--
@component
Output connection box showing the status of output connections.
Displays output information when connected or connection prompt when disconnected.
-->

<BaseStatusBox 
	color={outputColor}
	borderOpacity={0.6}
	backgroundOpacity={0.2}
	opacity={video.hasOutput ? 1 : !video.canOutput ? 0.4 : 0.6}
	onclick={handleClick}
>
	{#if video.hasOutput}
		<!-- Active Output State -->
		<StatusHeader 
			icon={ICON["icon-[material-symbols--upload]"].svg} 
			text="OUTPUT" 
			color={outputColor}
			opacity={0.9}
		/>

		<StatusContent 
			title="Broadcasting"
			subtitle={`Room: ${video.output.roomId}`}
			color={outputColor}
			variant="primary"
		/>

		<!-- Active pulse indicator -->
		<StatusIndicator color={outputColor} />
	{:else}
		<!-- No Output State -->
		<StatusHeader 
			icon={ICON["icon-[material-symbols--upload]"].svg} 
			text="NO OUTPUT" 
			color={outputColor}
			opacity={0.7}
		/>

		<StatusContent 
			title={video.canOutput ? 'Click to Start' : 'Need Camera'}
			color={outputColor}
			variant="secondary"
		/>

		<StatusButton 
			icon={ICON["icon-[mdi--plus]"].svg}
			text="Add Output"
			color={outputColor}
			textOpacity={0.7}
		/>
	{/if}
</BaseStatusBox> 