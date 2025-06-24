<!-- From https://github.com/brean/urdf-viewer -->

<script lang="ts">
	import { T, useLoader } from "@threlte/core";
	import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
	import { type Side, DoubleSide } from "three";

	type Props = {
		filename: string;
		color?: string;
		scale?: [number, number, number];
		position?: [number, number, number];
		rotation?: [number, number, number];
		castShadow?: boolean;
		receiveShadow?: boolean;
		opacity?: number;
		wireframe?: boolean;
		side?: Side;
	};

	let {
		filename,
		color = "#ffffff",
		scale = [1, 1, 1],
		position = [0, 0, 0],
		rotation = [0, 0, 0],
		opacity = 1.0,
		castShadow = true,
		receiveShadow = true,
		wireframe = false,
		side = DoubleSide,
		...restProps
	}: Props = $props();

	const { load } = useLoader(STLLoader);
</script>

{#await load(filename) then stl}
	{@html `<!-- include stl: ${filename} ${scale} -->`}
	<T.Mesh geometry={stl} {scale} {castShadow} {receiveShadow} {position} {rotation} {...restProps}>
		<T.MeshLambertMaterial {color} {opacity} transparent={opacity < 1.0} {wireframe} {side} />
	</T.Mesh>
{/await}
