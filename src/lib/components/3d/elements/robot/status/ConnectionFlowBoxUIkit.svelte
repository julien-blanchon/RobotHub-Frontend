<script lang="ts">
	import type { Robot } from "$lib/elements/robot/Robot.svelte.js";
	import { Container } from "threlte-uikit";
	import { StatusArrow } from "$lib/components/3d/ui";
	import InputBoxUIKit from "./InputBoxUIKit.svelte";
	import RobotBoxUIKit from "./RobotBoxUIKit.svelte";
	import OutputBoxUIKit from "./OutputBoxUIKit.svelte";
	import { Tween } from "svelte/motion";
	import { cubicOut } from "svelte/easing";

	interface Props {
		visible: boolean;
		robot: Robot;
		onInputBoxClick: (robot: Robot) => void;
		onRobotBoxClick: (robot: Robot) => void;
		onOutputBoxClick: (robot: Robot) => void;
		duration?: number;
		delay?: number;
	}

	let { visible, robot, onInputBoxClick, onRobotBoxClick, onOutputBoxClick, duration = 100, delay = 0 }: Props = $props();

	const inputColor = "rgb(34, 197, 94)";
	const outputColor = "rgb(59, 130, 246)";

	const tweenedScale = Tween.of(() => {
		return visible ? 1 : 0;
	}, { duration: duration, easing: cubicOut, delay: delay });
	const tweenedOpacity = Tween.of(() => {
		return visible ? 1 : 0;
	}, { duration: duration, easing: cubicOut, delay: delay });
</script>

<Container
	flexDirection="row"
	alignItems="center"
	gap={12}
	transformScaleX={tweenedScale.current}
	transformScaleY={tweenedScale.current}
	transformScaleZ={tweenedScale.current}
	opacity={tweenedOpacity.current}
>
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
