<script lang="ts">
	import { ICON } from "$lib/utils/icon";
	import type { RemoteCompute } from "$lib/elements/compute//RemoteCompute.svelte";
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

	const robotColor = "rgb(245, 158, 11)";
</script>

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

		<StatusContent title="Setup Robot" color="rgb(254, 215, 170)" variant="secondary" />

		<StatusButton
			icon={ICON["icon-[mdi--plus]"].svg}
			text="Add"
			color={robotColor}
			backgroundOpacity={0.1}
			textOpacity={0.7}
		/>
	{/if}
</BaseStatusBox>
