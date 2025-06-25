<script lang="ts">
	import type { RemoteCompute } from "$lib/elements/compute//RemoteCompute.svelte";
	import { BaseStatusBox, StatusHeader, StatusContent, StatusIndicator, StatusButton } from "$lib/components/3d/ui";
	import { ICON } from "@/utils/icon";

	interface Props {
		compute: RemoteCompute;
		handleClick?: () => void;
	}

	let { compute, handleClick }: Props = $props();

	const inputColor = "rgb(34, 197, 94)";
</script>

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