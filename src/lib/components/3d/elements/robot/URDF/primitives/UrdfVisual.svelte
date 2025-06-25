<script lang="ts">
	import type { IUrdfVisual } from "../interfaces/IUrdfVisual";
	import { numberArrayToColor } from "../utils/helper";
	import DAE from "../mesh/DAE.svelte";
	import OBJ from "../mesh/OBJ.svelte";
	import STL from "../mesh/STL.svelte";
	import { T } from "@threlte/core";
	import { DoubleSide, type Side } from "three";

	type Props = {
		visual: IUrdfVisual;
		defaultColor?: string;
		position?: [number, number, number];
		rotation?: [number, number, number];
		castShadow?: boolean;
		receiveShadow?: boolean;
		opacity?: number;
		wireframe?: boolean;
		side?: Side;
	};

	let {
		visual,
		opacity = 1.0,
		defaultColor = "#000000",
		position = [0, 0, 0],
		rotation = [0, 0, 0],
		castShadow = true,
		receiveShadow = true,
		wireframe = false,
		side = DoubleSide,
		...restProps
	}: Props = $props();

	// Use context color only when hovering, otherwise use original logic
	const baseColor = visual?.color_rgba
		? numberArrayToColor(visual.color_rgba.slice(0, 3) as [number, number, number])
		: defaultColor;
</script>

{#if visual.type === "mesh"}
	{#if visual.geometry.type === "stl"}
		<STL
			color={baseColor}
			{opacity}
			filename={visual.geometry.filename}
			scale={visual.geometry.scale}
			{position}
			{rotation}
			{castShadow}
			{receiveShadow}
			{wireframe}
			{side}
			{...restProps}
		/>
	{:else if visual.geometry.type === "obj"}
		<OBJ
			color={baseColor}
			{opacity}
			scale={visual.geometry.scale}
			filename={visual.geometry.filename}
			{position}
			{rotation}
			{castShadow}
			{receiveShadow}
			{wireframe}
			{side}
			{...restProps}
		/>
	{:else if visual.geometry.type === "dae"}
		<DAE
			filename={visual.geometry.filename}
			color={baseColor}
			{opacity}
			scale={visual.geometry.scale}
			{position}
			{rotation}
			{castShadow}
			{receiveShadow}
			{wireframe}
			{side}
			{...restProps}
		/>
	{/if}
{:else if visual.type === "cylinder"}
	<T.Mesh castShadow receiveShadow rotation={[Math.PI / 2, 0, 0]}>
		<T.CylinderGeometry
			args={[visual.geometry.radius, visual.geometry.radius, visual.geometry.length]}
		/>
		<T.MeshBasicMaterial color={baseColor} {opacity} transparent={opacity < 1.0} />
	</T.Mesh>
{:else if visual.type === "box"}
	<T.Mesh castShadow receiveShadow scale={visual.geometry.size}>
		<T.BoxGeometry />
		<T.MeshBasicMaterial color={baseColor} {opacity} transparent={opacity < 1.0} />
	</T.Mesh>
{/if}
