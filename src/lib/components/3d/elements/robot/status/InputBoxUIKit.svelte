<script lang="ts">
	import type { Robot } from "$lib/elements/robot/Robot.svelte.js";
	import { ICON } from "$lib/utils/icon";
	import {
		BaseStatusBox,
		StatusHeader,
		StatusContent,
		StatusIndicator,
		StatusButton
	} from "$lib/components/3d/ui";
	import { Text } from "threlte-uikit";

	interface Props {
		robot: Robot;
		onInputBoxClick: (robot: Robot) => void;
	}

	let { robot, onInputBoxClick }: Props = $props();

	function handleClick() {
		onInputBoxClick(robot);
	}

	const inputColor = "rgb(34, 197, 94)";
</script>

<BaseStatusBox
	color={inputColor}
	borderOpacity={robot.hasConsumer ? 0.8 : 0.4}
	backgroundOpacity={0.2}
	opacity={robot.hasConsumer ? 1 : 0.7}
	onclick={handleClick}
>
	{#if robot.hasConsumer}
		<!-- Active Input State -->
		<StatusHeader
			icon={ICON["icon-[material-symbols--download]"].svg}
			text="INPUT"
			color={inputColor}
			opacity={0.9}
		/>

		<StatusContent title={robot.consumer?.name.slice(0, 30) ?? "No Input"} color={inputColor} />

		{#if robot.consumer?.constructor.name}
			<Text
				text={robot.consumer.constructor.name.replace("Driver", "").slice(0, 30)}
				fontSize={11}
				fontWeight="normal"
				color="rgb(134, 239, 172)"
				opacity={0.9}
				textAlign="center"
				marginBottom={4}
			/>
		{:else}
			<Text
				text="Driver Type Unknown"
				fontSize={11}
				fontWeight="light"
				color="rgb(252, 165, 165)"
				opacity={0.8}
				textAlign="center"
				marginBottom={4}
			/>
		{/if}

		<!-- Active pulse indicator -->
		<StatusIndicator color={inputColor} type="pulse" />
	{:else}
		<!-- No Input State  -->
		<StatusHeader
			icon={ICON["icon-[material-symbols--download]"].svg}
			text="NO INPUT"
			color={inputColor}
			opacity={0.7}
			iconSize={12}
			fontSize={13}
		/>

		<StatusContent title="Click to Connect" color={inputColor} variant="secondary" />

		<StatusButton
			text="Add Input"
			icon={ICON["icon-[mdi--plus]"].svg}
			color={inputColor}
			backgroundOpacity={0.1}
			textOpacity={0.7}
		/>
	{/if}
</BaseStatusBox>
