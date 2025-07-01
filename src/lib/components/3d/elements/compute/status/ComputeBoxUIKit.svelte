<script lang="ts">
	import type { RemoteCompute } from "$lib/elements/compute//RemoteCompute.svelte";
	import { ICON } from "$lib/utils/icon";
	import { BaseStatusBox, StatusHeader, StatusContent } from "$lib/components/3d/ui";

	interface Props {
		compute: RemoteCompute;
	}

	let { compute }: Props = $props();

	// Compute theme color
	const computeColor = "rgb(139, 69, 219)";
</script>

<BaseStatusBox
	minWidth={110}
	minHeight={135}
	color={computeColor}
	borderOpacity={0.6}
	backgroundOpacity={0.2}
	clickable={false}
>
	<!-- Header -->
	<StatusHeader
		icon={ICON["icon-[mdi--brain]"].svg}
		text="AI COMPUTE"
		color={computeColor}
		opacity={0.9}
		fontSize={12}
	/>

	<!-- Compute Info -->
	<StatusContent
		title={compute.name}
		subtitle={compute.statusInfo.statusText}
		color="rgb(107, 33, 168)"
		variant="primary"
	/>
</BaseStatusBox>
