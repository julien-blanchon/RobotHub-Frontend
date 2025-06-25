<script lang="ts">
	import Robots from "@/components/3d/elements/robot/Robots.svelte";
	import Computes from "@/components/3d/elements/compute/Computes.svelte";
	import Videos from "@/components/3d/elements/video/Videos.svelte";
	import { PerfMonitor } from "@threlte/extras";
	import { T, Canvas } from "@threlte/core";
	import Floor from "@/components/3d/Floor.svelte";
	import { Gizmo, OrbitControls } from "@threlte/extras";
	import { dev } from "$app/environment";
	import { onMount } from "svelte";
	import Overlay from "@/components/interface/overlay/Overlay.svelte";

	let workspaceId = $state("");

	onMount(() => {
		// Get workspace ID from URL hash or generate new one
		const hash = window.location.hash.slice(1); // Remove the # symbol
		if (hash && hash.length > 0) {
			workspaceId = hash;
		} else {
			// Generate new workspace ID and update URL
			workspaceId = crypto.randomUUID();
			window.location.hash = workspaceId;
		}
	});
</script>

{#if workspaceId}
	<Overlay {workspaceId} />
	<Canvas>
		<T.Scene>
			<T.PerspectiveCamera position.x={-15} position.y={15} position.z={15} fov={20} makeDefault>
				<OrbitControls
					enableDamping
					dampingFactor={0.05}
					enableZoom
					minDistance={15}
					maxDistance={40}
					minPolarAngle={Math.PI / 6}
					maxPolarAngle={Math.PI / 2}
					target={[0, 1, 0]}
				>
					<Gizmo />
				</OrbitControls>
			</T.PerspectiveCamera>

			<!-- Lighting setup -->
			<T.AmbientLight intensity={0.4} />
			<T.DirectionalLight
				position={[2, 20, 5]}
				intensity={5}
				castShadow
				shadow.mapSize.width={1024}
				shadow.mapSize.height={1024}
			/>
			<!-- <T.DirectionalLight
			position={[-2, 20, -5]}
			intensity={1}
			castShadow
			shadow.mapSize.width={1024}
			shadow.mapSize.height={1024}
		/> -->

			<Floor />

			<!-- Robot component now gets robots from robotManager -->
			<Robots {workspaceId} />

			<Videos {workspaceId} />

			<Computes {workspaceId} />
		</T.Scene>
		{#if dev}
			<PerfMonitor anchorX="right" anchorY="bottom" logsPerSecond={30} />
		{/if}
	</Canvas>
{:else}
	<div class="flex h-screen items-center justify-center">
		<div class="text-slate-900 dark:text-white">
			Loading
		</div>
	</div>
{/if}
