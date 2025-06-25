<script lang="ts">
	import type { Robot } from "$lib/elements/robot/Robot.svelte.js";
	import { Container } from "threlte-uikit";
	import { StatusArrow } from "$lib/components/3d/ui";
	import InputBoxUIKit from "./InputBoxUIKit.svelte";
	import RobotBoxUIKit from "./RobotBoxUIKit.svelte";
	import OutputBoxUIKit from "./OutputBoxUIKit.svelte";

	interface Props {
		robot: Robot;
		onInputBoxClick: (robot: Robot) => void;
		onRobotBoxClick: (robot: Robot) => void;
		onOutputBoxClick: (robot: Robot) => void;
	}

	let { robot, onInputBoxClick, onRobotBoxClick, onOutputBoxClick }: Props = $props();

	const inputColor = "rgb(34, 197, 94)";
	const outputColor = "rgb(59, 130, 246)";
</script>

<Container flexDirection="row" alignItems="center" gap={12}>
	<!-- Input Box -->
	<InputBoxUIKit {robot} {onInputBoxClick} />

	<!-- Arrow 1: Input to Robot -->
	<StatusArrow direction="right" color={inputColor} opacity={robot.hasConsumer ? 1 : 0.5} />

	<!-- Robot Box -->
	<RobotBoxUIKit {robot} {onRobotBoxClick} />

	<!-- Arrow 2: Robot to Outputs -->
	<StatusArrow
		direction="right"
		color={outputColor}
		opacity={robot.outputDriverCount > 0 ? 1 : 0.5}
	/>

	<!-- Outputs Box -->
	<OutputBoxUIKit {robot} {onOutputBoxClick} />
</Container>
