<!-- From https://github.com/brean/urdf-viewer -->

<script lang="ts">
	import { T, useLoader } from "@threlte/core";
	import { DoubleSide, type Side } from "three";
	import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

	type Props = {
		filename: string;
		color?: string;
		scale?: [number, number, number];
		position?: [number, number, number];
		rotation?: [number, number, number];
		castShadow?: boolean;
		receiveShadow?: boolean;
		opacity?: number;
		isInteractive?: boolean;
		wireframe?: boolean;
		side?: Side;
	};
	let {
		filename,
		color = "#ffffff",
		scale = [1, 1, 1],
		rotation = [0, 0, 0],
		position = [0, 0, 0],
		opacity = 1.0,
		castShadow = true,
		receiveShadow = true,
		wireframe = false,
		side = DoubleSide,
		...restProps
	}: Props = $props();

	const { load } = useLoader(OBJLoader);
</script>

{#await load(filename) then obj}
	{@html `<!-- include obj: ${filename} ${scale} -->`}
	<T is={obj} {position} {rotation} {scale} {castShadow} {receiveShadow} {side} {...restProps}>
		<T.MeshLambertMaterial {color} {opacity} transparent={opacity < 1.0} {wireframe} {side} />
	</T>
{/await}
