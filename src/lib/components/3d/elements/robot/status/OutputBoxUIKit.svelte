<script lang="ts">
	import type { Robot } from "$lib/elements/robot/Robot.svelte.js";
	import { ICON } from "$lib/utils/icon";
	import { BaseStatusBox, StatusHeader, StatusContent, StatusButton } from "$lib/components/3d/ui";

	interface Props {
		robot: Robot;
		onOutputBoxClick: (robot: Robot) => void;
	}

	let { robot, onOutputBoxClick }: Props = $props();

	function handleClick() {
		onOutputBoxClick(robot);
	}

	// Output theme color (blue)
	const outputColor = "rgb(59, 130, 246)";
	

</script>

<!-- 
	Event info here
	https://github.com/threlte/threlte-uikit/blob/13b34172656cd49b9e2f38d7a9c41305e435daa1/src/lib/Events.ts#L30 
-->
<BaseStatusBox 
	color={outputColor}
	borderOpacity={robot.outputDriverCount > 0 ? 0.8 : 0.4}
	backgroundOpacity={robot.outputDriverCount > 0 ? 0.3 : 0.15}
	opacity={robot.outputDriverCount > 0 ? 1 : 0.7}
	onclick={handleClick}
>
	{#if robot.outputDriverCount > 0}
		<!-- Connected Outputs State -->
		<StatusHeader 
			icon={ICON["icon-[material-symbols--upload]"].svg} 
			text="OUTPUT" 
			color={outputColor}
			opacity={0.9}
		/>

		<!-- Outputs Count -->
		<StatusContent 
			title={`${robot.outputDriverCount} Outputs Active`}
			color="rgb(191, 219, 254)"
			variant="primary"
		/>

		{#if robot.producers.length > 0}
			<!-- Outputs List -->
			<StatusContent
				color={outputColor}
				variant="secondary"
			>
				{#snippet children()}
					{#each robot.producers.slice(0, 2) as producer}
						<StatusContent 
							title={producer.name.slice(0, 20)}
							subtitle={producer.constructor.name.replace("Producer", "").slice(0, 15)}
							color={outputColor}
							variant="tertiary"
							size="sm"
						/>
					{/each}

					{#if robot.producers.length > 2}
						<StatusContent 
							title={`+${robot.producers.length - 2} more`}
							color={outputColor}
							variant="tertiary"
							size="sm"
						/>
					{/if}
				{/snippet}
			</StatusContent>
		{/if}
	{:else}
		<!-- No Outputs State -->
		<StatusHeader 
			icon={ICON["icon-[material-symbols--upload]"].svg} 
			text="NO OUTPUT" 
			color={outputColor}
			opacity={0.7}
		/>

		<StatusContent 
			title="Click to Connect"
			color={outputColor}
			variant="secondary"
		/>

		<StatusButton 
			icon={ICON["icon-[mdi--plus]"].svg}
			text="Add Outputs"
			color={outputColor}
			textOpacity={0.7}
		/>
	{/if}
</BaseStatusBox> 