<!-- From https://github.com/brean/urdf-viewer -->

<script lang="ts">
	import { T, useLoader } from "@threlte/core";
	import { DoubleSide, Mesh, type Side } from "three";
	import { ColladaLoader } from "three/examples/jsm/loaders/ColladaLoader.js";

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

	const sceneUp: [x: number, y: number, z: number] = [Math.PI / 2, -Math.PI / 2, -Math.PI / 2];

	const { load } = useLoader(ColladaLoader);
</script>

{#await load(filename) then dae}
	{@html `<!-- include dae: ${filename} ${scale} -->`}
	<T.Group {scale} {position} {rotation}>
		<T.Group rotation={sceneUp}>
			<T.Group
				scale={dae.scene.scale.toArray()}
				position={dae.scene.position.toArray()}
				rotation={dae.scene.rotation ? dae.scene.rotation.toArray() : [0, 0, 0]}
			>
				{#each dae.scene.children as obj}
					{#if obj.type === "Mesh"}
						{@const mesh = obj as Mesh}
						<T.Mesh
							{castShadow}
							{receiveShadow}
							geometry={mesh.geometry}
							scale={mesh.scale ? mesh.scale.toArray() : [1, 1, 1]}
							position={mesh.position ? mesh.position.toArray() : [0, 0, 0]}
							material={mesh.material}
							{...restProps}
						>
							<T.MeshLambertMaterial {color} {opacity} transparent={opacity < 1.0} />
						</T.Mesh>
					{/if}
				{/each}
			</T.Group>
		</T.Group>
	</T.Group>
{/await}
