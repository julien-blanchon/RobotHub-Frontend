<script lang="ts">
	import { T } from "@threlte/core";
	import { PlaneGeometry } from "three";
	import { Grid } from "@threlte/extras";
	import { mode } from "mode-watcher";

	const floorGeometry = new PlaneGeometry(20, 20);
</script>

<T.Mesh receiveShadow position.y={0} rotation.x={-Math.PI / 2} frustumCulled={false}>
	<T is={floorGeometry} />
	<T.ShadowMaterial
		opacity={0.3}
		transparent={true}
		polygonOffset={true}
		polygonOffsetFactor={1}
		polygonOffsetUnits={1}
	/>
</T.Mesh>
<Grid
	backgroundColor={mode.current === "dark" ? "#dadada" : "#e2e8f0"}
	cellColor={mode.current === "dark" ? "#000000" : "#94a3b8"}
	selectionColor={mode.current === "dark" ? "#0000ee" : "#3b82f6"}
/>
