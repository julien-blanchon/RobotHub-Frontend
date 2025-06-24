<script lang="ts">
	import type { Robot } from "$lib/elements/robot/Robot.svelte";
	import { ICON } from "$lib/utils/icon";
	import { 
		BaseStatusBox, 
		StatusHeader, 
		StatusContent, 
		StatusButton
	} from "$lib/components/3d/ui";

	interface Props {
		robot: Robot;
		onRobotBoxClick: (robot: Robot) => void;
	}

	let { robot, onRobotBoxClick }: Props = $props();

	// Robot theme color (orange)
	const robotColor = "rgb(245, 158, 11)";
</script>


<BaseStatusBox
	color={robotColor}
	borderOpacity={0.6}
	backgroundOpacity={0.2}
	onclick={() => onRobotBoxClick(robot)}
>
		<!-- Robot Header -->
		<StatusHeader
			icon={ICON["icon-[ix--robotic-arm]"].svg}
			text="ROBOT"
			color={robotColor}
			opacity={0.9}
		/>

		<!-- Robot Info -->
		<StatusContent
			title={robot.id}
			subtitle="Active"
			color={robotColor}
			variant="primary"
		/>

		<!-- Status Button -->
		<StatusButton
			text="Active"
			icon={ICON["icon-[iconamoon--lightning-1-duotone]"].svg}
			color={robotColor}
			textOpacity={0.8}
		/>
</BaseStatusBox>
