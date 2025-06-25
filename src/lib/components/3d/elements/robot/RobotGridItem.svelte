<script lang="ts">
	import { T } from "@threlte/core";
	import { Group } from "three";
	import { getRootLinks } from "@/components/3d/elements/robot/URDF/utils/UrdfParser";
	import UrdfLink from "@/components/3d/elements/robot/URDF/primitives/UrdfLink.svelte";
	import RobotStatusBillboard from "@/components/3d/elements/robot/status/RobotStatusBillboard.svelte";
	import type { Robot } from "$lib/elements/robot/Robot.svelte.js";
	import { createUrdfRobot } from "$lib/elements/robot/createRobot.svelte";
	import { interactivity, type IntersectionEvent, useCursor } from "@threlte/extras";
	import type { RobotUrdfConfig } from "$lib/types/urdf";
	import { onMount } from "svelte";
	import type IUrdfRobot from "@/components/3d/elements/robot/URDF/interfaces/IUrdfRobot.js";
	import { ROBOT_CONFIG } from "$lib/elements/robot/config.js";

	interface Props {
		robot: Robot;
		onCameraMove: (ref: any) => void;
		onInputBoxClick: (robot: Robot) => void;
		onRobotBoxClick: (robot: Robot) => void;
		onOutputBoxClick: (robot: Robot) => void;
	}

	let ref = $state<Group | undefined>(undefined);

	let {
		robot = $bindable(),
		onCameraMove,
		onInputBoxClick,
		onRobotBoxClick,
		onOutputBoxClick
	}: Props = $props();

	let urdfRobotState = $state<IUrdfRobot | null>(null);
	let lastJointValues = $state<Record<string, number>>({});

	onMount(async () => {
		const urdfConfig: RobotUrdfConfig = {
			urdfUrl: "/robots/so-100/so_arm100.urdf"
		};

		try {
			const UrdfRobotState = await createUrdfRobot(urdfConfig);
			urdfRobotState = UrdfRobotState.urdfRobot;
		} catch (error) {
			console.error("Failed to load URDF robot:", error);
		}
	});

	// Sync joint values from Robot to URDF joints with optimized updates
	$effect(() => {
		if (!urdfRobotState) return;
		if (robot.jointArray.length === 0) return;

		// Check if this is the initial sync (no previous values recorded)
		const isInitialSync = Object.keys(lastJointValues).length === 0;

		// Check if any joint values have actually changed (using config threshold)
		const threshold = isInitialSync ? 0 : ROBOT_CONFIG.performance.uiUpdateThreshold;
		const hasSignificantChanges =
			isInitialSync ||
			robot.jointArray.some(
				(joint) => Math.abs((lastJointValues[joint.name] || 0) - joint.value) > threshold
			);
		if (!hasSignificantChanges) return;

		// Batch update all joints that have changed (or all joints on initial sync)
		let updatedCount = 0;
		robot.jointArray.forEach((joint) => {
			if (isInitialSync || Math.abs((lastJointValues[joint.name] || 0) - joint.value) > threshold) {
				lastJointValues[joint.name] = joint.value;
				const urdfJoint = findUrdfJoint(urdfRobotState, joint.name);
				if (urdfJoint) {
					// Initialize rotation array if it doesn't exist
					if (!urdfJoint.rotation) {
						urdfJoint.rotation = [0, 0, 0];
					}

					// Use the Robot's conversion method for proper coordinate mapping
					const radians = robot.convertNormalizedToUrdfRadians(joint.name, joint.value);
					const axis = urdfJoint.axis_xyz || [0, 0, 1];

					// Reset rotation and apply to the appropriate axis
					urdfJoint.rotation = [0, 0, 0];
					for (let i = 0; i < 3; i++) {
						if (Math.abs(axis[i]) > 0.001) {
							urdfJoint.rotation[i] = radians * axis[i];
						}
					}
					updatedCount++;
				}
			}
		});
	});

	function findUrdfJoint(robot: Robot, jointName: string): any {
		// Search through the robot's joints array
		if (robot.joints && Array.isArray(robot.joints)) {
			for (const joint of robot.joints) {
				if (joint.name === jointName) {
					return joint;
				}
			}
		}
		return null;
	}

	const { onPointerEnter, onPointerLeave, hovering } = useCursor();
	interactivity();

	let isToggled = $state(false);

	function handleClick(event: IntersectionEvent<MouseEvent>) {
		event.stopPropagation();
		isToggled = !isToggled;
	}
</script>

<T.Group
	bind:ref
	position.x={robot.position.x}
	position.y={robot.position.y}
	position.z={robot.position.z}
	scale={[10, 10, 10]}
	rotation={[-Math.PI / 2, 0, 0]}
>
	<T.Group onpointerenter={onPointerEnter} onpointerleave={onPointerLeave} onclick={handleClick}>
		{#if urdfRobotState}
			{#each getRootLinks(urdfRobotState) as link}
				<UrdfLink
					robot={urdfRobotState}
					{link}
					textScale={0.2}
					showName={$hovering || isToggled}
					showVisual={true}
					showCollision={false}
					visualColor={robot.connectionStatus.isConnected ? "#10b981" : "#6b7280"}
					visualOpacity={$hovering || isToggled ? 0.4 : 1.0}
					collisionOpacity={1.0}
					collisionColor="#813d9c"
					jointNames={$hovering}
					joints={$hovering}
					jointColor="#62a0ea"
					jointIndicatorColor="#f66151"
					nameHeight={0.1}
					showLine={$hovering || isToggled}
					opacity={1}
					isInteractive={false}
				/>
			{/each}
		{:else}
			<!-- Fallback simple representation while URDF loads -->
			<T.Mesh>
				<T.BoxGeometry args={[0.1, 0.1, 0.1]} />
				<T.MeshStandardMaterial
					color={robot.connectionStatus.isConnected ? "#10b981" : "#6b7280"}
					opacity={$hovering ? 0.8 : 1.0}
					transparent
				/>
			</T.Mesh>
		{/if}
	</T.Group>

	<RobotStatusBillboard
		{robot}
		{onInputBoxClick}
		{onRobotBoxClick}
		{onOutputBoxClick}
		visible={isToggled}
	/>
</T.Group>
