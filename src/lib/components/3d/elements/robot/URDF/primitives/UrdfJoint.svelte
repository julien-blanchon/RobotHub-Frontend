<!-- From https://github.com/brean/urdf-viewer -->

<script lang="ts">
	import type IUrdfJoint from "../interfaces/IUrdfJoint";
	import { T } from "@threlte/core";
	import UrdfLink from "./UrdfLink.svelte";
	import { Vector3 } from "three";
	import { Billboard, MeshLineGeometry, Text } from "@threlte/extras";

	import type IUrdfLink from "../interfaces/IUrdfLink";
	import type IUrdfRobot from "../interfaces/IUrdfRobot";
	import { radiansToDegrees } from "@/utils";

	type Props = {
		robot: IUrdfRobot;
		joint: IUrdfJoint;
		showName?: boolean;
		nameHeight?: number;
		jointColor?: string;
		jointIndicatorColor?: string;
		showLine?: boolean;
		opacity?: number;
		isInteractive?: boolean;
		showVisual?: boolean;
		showCollision?: boolean;
		visualOpacity?: number;
		collisionOpacity?: number;
		collisionColor?: string;
		jointNames?: boolean;
		joints?: boolean;
	};

	let {
		robot,
		joint,
		showLine = false,
		nameHeight = 0.02,
		jointColor = "#000000",
		jointIndicatorColor = "#000000",
		opacity = 0.7,
		showName = false,
		showVisual = true,
		showCollision = true,
		visualOpacity = 1,
		collisionOpacity = 1,
		collisionColor = "#000000",
		jointNames = true,
		...restProps
	}: Props = $props();

	// Helper function to get current joint rotation value in degrees
	function getJointRotationValue(joint: IUrdfJoint): number {
		const axis = joint.axis_xyz || [0, 0, 1];
		const rotation = joint.rotation || [0, 0, 0];

		// Find the primary axis and get the rotation value
		for (let i = 0; i < 3; i++) {
			if (Math.abs(axis[i]) > 0.001) {
				return radiansToDegrees(rotation[i] / axis[i]);
			}
		}
		return 0;
	}

	// const ANGLE_RANGES = {
	// 	Elbow: [-196.6593, 1.2308],
	// 	Jaw: [-2.1978, 134.6813],
	// 	Pitch: [-1.0549, 211.8681],
	// 	Wrist_Pitch: [-137.8462, 72.0879],
	// 	Wrist_Roll: [-173.6264, 185.9341],
	// 	Rotation: [-80.3516, 70.6813],
	// };
	// // Look with the so-arm100.urdf lower limit and upper limit
	// // I think 1 in safety_controller = 66 degrees

	// function normalizeAngle(value: number, name: keyof typeof ANGLE_RANGES): number {
	// 	if (!(name in ANGLE_RANGES)) {
	// 		throw new Error(`Unknown angle name: ${name}`);
	// 	}

	// 	const [min, max] = ANGLE_RANGES[name];
	// 	const norm = (value - min) / (max - min); // → [0,1]
	// 	return norm * 200 - 100; // → [-100, 100]
	// }

	

	// function denormalizeAngle(normValue: number, name: keyof typeof ANGLE_RANGES): number {
	// 	if (!(name in ANGLE_RANGES)) {
	// 		throw new Error(`Unknown angle name: ${name}`);
	// 	}

	// 	const [min, max] = ANGLE_RANGES[name];
	// 	const norm = (normValue + 100) / 200; // → [0,1]
	// 	return norm * (max - min) + min;
	// }

	// function normalizeAngle2(value: number): number {
	// 	const limit_lower = joint.limit?.lower || 0;
	// 	const limit_upper = joint.limit?.upper || 0;
	// 	const min = limit_lower*66;
	// 	const max = limit_upper*66;
	// 	const norm = (value - min) / (max - min); // → [0,1]
	// 	return norm * 200 - 100; // → [-100, 100]
	// }

	// function denormalizeAngle2(normValue: number): number {
	// 	const limit_lower = joint.limit?.lower || 0;
	// 	const limit_upper = joint.limit?.upper || 0;
	// 	const min = limit_lower*66;
	// 	const max = limit_upper*66;
	// 	const norm = (normValue + 100) / 200; // → [0,1]
	// 	return norm * (max - min) + min;
	// }
</script>

{@html `<!-- Joint ${joint.name} (${joint.type}) -->`}
<!-- draw line from parent-frame to joint origin -->
{#if showLine}
	<T.Line>
		<MeshLineGeometry
			points={[
				new Vector3(0, 0, 0),
				new Vector3(joint.origin_xyz[0], joint.origin_xyz[1], joint.origin_xyz[2])
			]}
		/>
		<T.LineBasicMaterial color={jointColor} />
	</T.Line>
{/if}
<T.Group position={joint.origin_xyz} rotation={joint.origin_rpy}>
	<T.Group rotation={joint.rotation}>
		{#if joint.child}
			<UrdfLink
				{robot}
				link={joint.child}
				textScale={0.2}
				{showName}
				{showVisual}
				{showCollision}
				{visualOpacity}
				{collisionOpacity}
				{collisionColor}
				jointNames={true}
				joints={true}
				{jointColor}
				{jointIndicatorColor}
				{nameHeight}
				{showLine}
				opacity={1}
				isInteractive={true}
			/>
		{/if}

		{#if showLine}
			<T.Line>
				<MeshLineGeometry points={[new Vector3(0, 0, 0), new Vector3(0, -0.02, 0)]} />
				<T.LineBasicMaterial color={jointIndicatorColor} />
			</T.Line>

			<T.Mesh rotation={[Math.PI / 2, 0, 0]} {...restProps}>
				<T.CylinderGeometry args={[0.004, 0.004, 0.03]} />
				<T.MeshBasicMaterial
					color={jointColor}
					{opacity}
					transparent={opacity < 1.0}
				/>
			</T.Mesh>
		{/if}
	</T.Group>
</T.Group>

{#if showName}
	<Billboard
		position.x={joint.origin_xyz[0] + 0.04}
		position.y={joint.origin_xyz[1] + 0.01}
		position.z={joint.origin_xyz[2] + 0.03}
		renderOrder={999}
		frustumCulled={false}
	>
	<!-- text={joint.name + " " + getJointRotationValue(joint).toFixed(0) + "°" + " (" + normalizeAngle2(getJointRotationValue(joint)).toFixed(0) + ")"} -->
		<Text
			scale={nameHeight}
			color={jointColor}
			text={joint.name + " " + getJointRotationValue(joint).toFixed(0) + "°"}
			characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890°"
			renderOrder={999}
		></Text>
	</Billboard>
{/if}
