<!-- From https://github.com/brean/urdf-viewer -->

<script lang="ts">
	// Three.js visualization of an URDF.
	import { T } from "@threlte/core";
	import { getRootLinks } from "../utils/UrdfParser";
	import UrdfLink from "./UrdfLink.svelte";
	import type IUrdfRobot from "../interfaces/IUrdfRobot";

	interface Props {
		robot: IUrdfRobot;
		position?: [x: number, y: number, z: number];
		quaternion?: [x: number, y: number, z: number, w: number];
		showName?: boolean;
		showVisual?: boolean;
		showCollision?: boolean;
		visualOpacity?: number;
		collisionOpacity?: number;
		collisionColor?: string;
		jointNames?: boolean;
		joints?: boolean;
		jointColor?: string;
		jointIndicatorColor?: string;
		nameHeight?: number;
		textScale?: number;
	}
	let {
		robot,
		position = [0, 0, 0],
		quaternion = [0, 0, 0, 1],
		showName = true,
		showVisual = true,
		showCollision = true,
		visualOpacity = 1,
		collisionOpacity = 1,
		collisionColor = "#000000",
		jointNames = true,
		joints = true,
		jointColor = "#000000",
		jointIndicatorColor = "#000000",
		nameHeight = 0.1,
		textScale = 1
	}: Props = $props();
</script>

<T.Group {position} {quaternion} scale={[10, 10, 10]} rotation={[-Math.PI / 2, 0, 0]}>
	{#each getRootLinks(robot) as link}
		<UrdfLink
			{robot}
			{link}
			{textScale}
			{showName}
			{showVisual}
			{showCollision}
			{visualOpacity}
			{collisionOpacity}
			{collisionColor}
			{jointNames}
			{joints}
			{jointColor}
			{jointIndicatorColor}
			{nameHeight}
			showLine={false}
			opacity={1}
			isInteractive={false}
		/>
	{/each}
</T.Group>
