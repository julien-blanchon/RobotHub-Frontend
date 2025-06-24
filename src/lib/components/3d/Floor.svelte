<script lang="ts">
	import { T } from "@threlte/core";
	import { PlaneGeometry } from 'three';
	import { Grid } from '@threlte/extras'
	const floorGeometry = new PlaneGeometry(20, 20);
</script>

<T.Mesh 
	receiveShadow 
	position.y={0} 
	rotation.x={-Math.PI / 2}
	frustumCulled={false}
>
	<T is={floorGeometry} />
	<T.ShadowMaterial 
		opacity={0.3} 
		transparent={true}
		polygonOffset={true}
		polygonOffsetFactor={1}
		polygonOffsetUnits={1}
	/>
</T.Mesh>
<Grid/>

