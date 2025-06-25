<script lang="ts">
	import { ICON } from "$lib/utils/icon";
	import type { RemoteCompute } from "$lib/elements/compute//RemoteCompute.svelte";
	import { BaseStatusBox, StatusHeader, StatusContent, StatusIndicator, StatusButton } from "$lib/components/3d/ui";

	interface Props {
		compute: RemoteCompute;
		handleClick?: () => void;
	}

	let { compute, handleClick }: Props = $props();

	// Robot theme color (orange - consistent with robot system)
	const robotColor = "rgb(245, 158, 11)";
	
	// Icons
	// const robotIcon = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMTIgMTJjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6TTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgMThDNy4zIDIwIDMuOCAxNi42IDMuOCAxMlM3LjMgNCA5IDRzNS4yIDMuNCA1LjIgOC02IDgtNSA4eiIvPjwvc3ZnPg==";
	// const robotOffIcon = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMjAuNzMgMTgsNjYgMy4yN0wyIDQuNzNsMTQuMTQgMTQuMTRDMTcuOSAxNS42MiAxNiAxNy40OSAxNiAxOS44VjIxaDJWMTMuNWgzdjIuNWgydjE1LjJDMjIgMTkuNCAyMi44IDE5IDE0LjE4IDEwLjE4TDEwIDZIMTJWNEgxMlY1aDNjMC0yLjc2IDEuMjQtNSA0LTVzNCAxLjI0IDQgNS0yLjI0IDUtNSA1SDEzdjFIOFY3SDZ2Mm0xIDIuNzNMMjAgMjAuNzNsLS4wMSAwIi8+PC9zdmc+";
	// const robotOutlineIcon = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMTIgMmMtNS41NyAwLTEwIDQuNDMtMTAgMTBzNC40MyAxMCAxMCAxMCAxMC00LjQzIDEwLTEwUzE3LjU3IDIgMTIgMnptMCAxOGMtNC40MSAwLTgtMy41OS04LThzMy41OS04IDgtOCA4IDMuNTkgOCA4LTMuNTkgOC04IDh6bTAgLTEyYy0yLjIxIDAtNCAuNzktNCA0czEuNzkgNCA0IDQgNC0xLjc5IDQtNC0xLjc5LTQtNC00em0wIDZjLTEuMTEgMC0yLS44OS0yLTJzLjg5LTIgMi0yIDIgLjg5IDIgMi0uODkgMi0yIDJ6Ii8+PC9zdmc+";
	// const formatListNumberedIcon = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cGF0aCBmaWxsPSIjMDAwIiBkPSJNMiAxN2gybC0xLTFjLjU1IDAgMS0uNDUgMS0xcy0uNDUtMS0xLTEtMSAuNDUtMSAxaC0yYzAtMS4xLjktMiAyLTJzMiAuOSAyIDItLjkgMi0yIDJ6bS0yIDJoNHYySDJabTUtMTJoMTVoMlY5SDdabTAgNGgxNXYySHdtNS0xMEgyTDZ2MmgxdjJIN3ptMC00aDJsLTEtMXYtMmgxVjFINHYyaDJabTAtMUgxWiIvPjwvc3ZnPg==";
</script>

<!--
@component
Compact robot input box showing the status of robot joint states input for Inference Sessions.
Displays robot connection information when session exists or connection prompt when disconnected.
-->

<BaseStatusBox 
	minWidth={100}
	minHeight={65}
	color={robotColor}
	borderOpacity={0.6}
	backgroundOpacity={0.2}
	opacity={compute.hasSession ? 1 : 0.6}
	onclick={handleClick}
>
	{#if compute.hasSession && compute.inputConnections}
		<!-- Active Robot Input State -->
		<StatusHeader 
			icon={ICON["icon-[ix--robotic-arm]"].svg} 
			text="ROBOT" 
			color={robotColor}
			opacity={0.9}
			fontSize={11}
		/>

		<StatusContent 
			title="Joint States" 
			subtitle="6 DOF Robot"
			color="rgb(254, 215, 170)"
			variant="primary"
		/>

		<!-- Connected status -->
		<StatusIndicator color={robotColor} />
	{:else}
		<!-- No Session State -->
		<StatusHeader 
			icon={ICON["icon-[ix--robotic-arm]"].svg} 
			text="NO ROBOT" 
			color={robotColor}
			opacity={0.7}
			fontSize={11}
		/>

		<StatusContent 
			title="Setup Robot" 
			color="rgb(254, 215, 170)" 
			variant="secondary"
		/>

		<StatusButton 
			icon={ICON["icon-[mdi--plus]"].svg} 
			text="Add"
			color={robotColor}
			backgroundOpacity={0.1}
			textOpacity={0.7}
		/>
	{/if}
</BaseStatusBox> 