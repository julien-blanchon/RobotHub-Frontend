<script lang="ts">
	import { T } from "@threlte/core";
	import { useGltf } from "@threlte/extras";
	import Model from "./GPUModel.svelte";
	import { Shape, Path, ExtrudeGeometry, BoxGeometry } from "three";
	import { onMount } from "svelte";

	// Props interface
	interface Props {
		// Transform props
		position?: [number, number, number];
		rotation?: [number, number, number];
		scale?: [number, number, number];
		rotating?: boolean;
	}

	// Props with defaults
	let {
		position = [0, 0, 0],
		rotation = [0, 0, 0],
		scale = [1, 1, 1],
		rotating = false
	}: Props = $props();

	// Create the TV frame geometry (outer rounded rectangle)
	function createTVFrame(
		tvWidth: number,
		tvHeight: number,
		tvDepth: number,
		tvFrameThickness: number,
		tvCornerRadius: number
	) {
		const shape = new Shape();
		const x = -tvWidth / 2;
		const y = -tvHeight / 2;
		const w = tvWidth;
		const h = tvHeight;
		const radius = tvCornerRadius;

		shape.moveTo(x, y + radius);
		shape.lineTo(x, y + h - radius);
		shape.quadraticCurveTo(x, y + h, x + radius, y + h);
		shape.lineTo(x + w - radius, y + h);
		shape.quadraticCurveTo(x + w, y + h, x + w, y + h - radius);
		shape.lineTo(x + w, y + radius);
		shape.quadraticCurveTo(x + w, y, x + w - radius, y);
		shape.lineTo(x + radius, y);
		shape.quadraticCurveTo(x, y, x, y + radius);

		// Create hole for screen (inner rectangle)
		const hole = new Path();
		const hx = x + tvFrameThickness;
		const hy = y + tvFrameThickness;
		const hwidth = w - tvFrameThickness * 2;
		const hheight = h - tvFrameThickness * 2;
		const hradius = tvCornerRadius * 0.5;

		hole.moveTo(hx, hy + hradius);
		hole.lineTo(hx, hy + hheight - hradius);
		hole.quadraticCurveTo(hx, hy + hheight, hx + hradius, hy + hheight);
		hole.lineTo(hx + hwidth - hradius, hy + hheight);
		hole.quadraticCurveTo(hx + hwidth, hy + hheight, hx + hwidth, hy + hheight - hradius);
		hole.lineTo(hx + hwidth, hy + hradius);
		hole.quadraticCurveTo(hx + hwidth, hy, hx + hwidth - hradius, hy);
		hole.lineTo(hx + hradius, hy);
		hole.quadraticCurveTo(hx, hy, hx, hy + hradius);

		shape.holes.push(hole);

		return new ExtrudeGeometry(shape, {
			depth: tvDepth,
			bevelEnabled: true,
			bevelThickness: 0.02,
			bevelSize: 0.02,
			bevelSegments: 8
		});
	}

	// Create the screen (video display area)
	function createScreen(tvWidth: number, tvHeight: number, tvFrameThickness: number) {
		const w = tvWidth - tvFrameThickness * 2;
		const h = tvHeight - tvFrameThickness * 2;

		// Create a very thin box for the screen area (only visible from front)
		return new BoxGeometry(w, h, 0.02);
	}

	const frameGeometry = createTVFrame(1, 1, 1, 0.2, 0.15);
	const screenGeometry = createScreen(1, 1, 0.2);

	const gltf = useGltf("/gpu/scene.gltf");

	let fan_rotation = $state(0);
	let rotationPerSeconds = $state(1); // 1 rotation per second by default

	onMount(() => {
		const interval = setInterval(() => {
			// Calculate angle increment per frame for desired rotations per second
			if (rotating) {
				const angleIncrement = (Math.PI * 2 * rotationPerSeconds) / 60;
				fan_rotation = fan_rotation + angleIncrement;
			}
		}, 1000 / 60); // Run at ~60fps

		return () => {
			clearInterval(interval);
		};
	});
</script>

<T.Group {position} {rotation} {scale}>
	<T.Group scale={[1, 1, 1]}>
		<Model {fan_rotation} />
	</T.Group>
</T.Group>
