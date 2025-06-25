<script lang="ts">
	import type { Robot } from "$lib/elements/robot/Robot.svelte";
	import { ICON } from "$lib/utils/icon";
	import { BaseStatusBox, StatusHeader, StatusContent, StatusButton } from "$lib/components/3d/ui";

	interface Props {
		robot: Robot;
		onBoxClick: (robot: Robot) => void;
	}

	let { robot, onBoxClick }: Props = $props();

	let isDisabled = $derived(robot.hasConsumer);

	function handleClick() {
		if (!isDisabled) {
			onBoxClick(robot);
		}
	}

	const manualColor = "rgb(147, 51, 234)";
</script>

<BaseStatusBox
	color={manualColor}
	borderOpacity={isDisabled ? 0.3 : robot.isManualControlEnabled ? 0.8 : 0.5}
	backgroundOpacity={isDisabled ? 0.1 : robot.isManualControlEnabled ? 0.3 : 0.2}
	opacity={isDisabled ? 0.6 : 1}
	onclick={handleClick}
>
	{#if isDisabled}
		<!-- Disabled State -->
		<StatusHeader
			icon={ICON["icon-[material-symbols--lock]"].svg}
			text="DISABLED"
			color={manualColor}
			opacity={0.7}
		/>

		<StatusContent
			title="Control managed by"
			subtitle={robot.consumer?.name.slice(0, 20) ?? "No Input"}
			color="rgb(196, 181, 253)"
			variant="secondary"
		/>
	{:else if robot.isManualControlEnabled}
		<!-- Enabled State -->
		<StatusHeader
			icon={ICON["icon-[solar--volume-knob-bold]"].svg}
			text="ACTIVE"
			color={manualColor}
			opacity={0.9}
		/>

		<StatusContent
			title={`${robot.jointArray.length} Joints Active`}
			subtitle="Manual Control Enabled"
			color="rgb(233, 213, 255)"
			variant="primary"
		/>
	{:else}
		<!-- Default State (Manual Off) -->
		<StatusHeader
			icon={ICON["icon-[solar--volume-knob-bold]"].svg}
			text="MANUAL"
			color={manualColor}
			opacity={0.8}
		/>

		<StatusContent title="Click to Enable" color={manualColor} variant="secondary" />

		<StatusButton
			icon={ICON["icon-[mingcute--settings-2-fill]"].svg}
			text="Configure"
			color={manualColor}
			backgroundOpacity={0.1}
			textOpacity={0.7}
		/>
	{/if}
</BaseStatusBox>
