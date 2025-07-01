<!-- From https://github.com/brean/urdf-viewer -->

<script lang="ts">
	// The link element describes a rigid body with an inertia, visual features, and collision properties.
	import type IUrdfLink from "../interfaces/IUrdfLink";
	import UrdfVisual from "./UrdfVisual.svelte";
	import { getChildJoints } from "../utils/UrdfParser";
	import UrdfJoint from "./UrdfJoint.svelte";
	import type IUrdfRobot from "../interfaces/IUrdfRobot";
	import { T } from "@threlte/core";
	import Pointcloud from "@/components/3d/misc/Pointcloud.svelte";

	interface Props {
		robot: IUrdfRobot;
		link: IUrdfLink;
		textScale?: number;
		showName?: boolean;
		showVisual?: boolean;
		showCollision?: boolean;
		visualColor?: string;
		visualOpacity?: number;
		collisionOpacity?: number;
		collisionColor?: string;
		jointNames?: boolean;
		joints?: boolean;
		jointColor?: string;
		jointIndicatorColor?: string;
		nameHeight?: number;
		showLine?: boolean;
		opacity?: number;
	}

	let {
		robot,
		link,
		textScale = 1,
		showName = true,
		showVisual = true,
		showCollision = true,
		visualColor = "#000000",
		visualOpacity = 1,
		collisionOpacity = 1,
		collisionColor = "#000000",
		jointNames = true,
		joints = true,
		jointColor = "#000000",
		jointIndicatorColor = "#000000",
		nameHeight = 0.1,
		showLine = true,
		opacity = 0.7
	}: Props = $props();

	let showPointCloud = false;
</script>

{@html `<!-- Link ${link.name} -->`}
<!-- {#if showName}
	<Billboard position.x={0} position.y={0} position.z={0}>
		<Text anchorY={-0.2} scale={textScale} text={link.name} characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ"
		></Text>
	</Billboard>
{/if} -->

{#if showVisual}
	{#each link.visual as visual}
		<UrdfVisual opacity={visualOpacity} {visual} defaultColor={visualColor} />
	{/each}
{/if}

{#if showCollision}
	{#each link.collision as visual}
		<UrdfVisual opacity={collisionOpacity} {visual} defaultColor={collisionColor} />
	{/each}
{/if}

{#each getChildJoints(robot, link) as joint (joint.name)}
	<UrdfJoint
		{robot}
		{joint}
		{showName}
		{nameHeight}
		{jointColor}
		{jointIndicatorColor}
		{showLine}
		{opacity}
		{showVisual}
		{showCollision}
		{visualOpacity}
		{collisionOpacity}
		{collisionColor}
		{jointNames}
		{joints}
	/>
	{#if joint.type === "fixed" && showPointCloud}
		<T.Group
			position={[joint.origin_xyz[0], joint.origin_xyz[1], joint.origin_xyz[2]]}
			rotation={joint.origin_rpy}
		>
			<T.Group scale={[0.1, 0.1, 0.1]}>
				<T.Mesh scale={[0.1, 0.1, 0.1]}>
					<T.BoxGeometry />
					<T.MeshBasicMaterial color="red" />
				</T.Mesh>
				<Pointcloud
					cameraPositionX={joint.origin_xyz[0]}
					cameraPositionY={joint.origin_xyz[1]}
					cameraPositionZ={joint.origin_xyz[2]}
					cameraRotationX={joint.origin_rpy[0]}
					cameraRotationY={joint.origin_rpy[1]}
					cameraRotationZ={joint.origin_rpy[2]}
				/>
			</T.Group>
		</T.Group>
	{/if}
{/each}
