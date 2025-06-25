<script lang="ts">
	import { T } from "@threlte/core";
	import { Align, OrbitControls } from "@threlte/extras";
	import { BufferGeometry, Vector3, Color, BufferAttribute, Euler, Matrix4 } from "three";

	// Props for external data input
	interface Props {
		// External RGBD data input (optional)
		inputRGBData?: Uint8Array;
		inputDepthData?: Float32Array;
		inputWidth?: number;
		inputHeight?: number;
		inputCameraIntrinsics?: {
			fx: number;
			fy: number;
			cx: number;
			cy: number;
		};
		// Visual settings (optional)
		initialColorMode?: ColorMode;
		initialPointSize?: number;
		initialScale?: number;
		useMockData?: boolean;
		cameraPositionX?: number;
		cameraPositionY?: number;
		cameraPositionZ?: number;
		cameraRotationX?: number;
		cameraRotationY?: number;
		cameraRotationZ?: number;
	}

	let {
		inputRGBData,
		inputDepthData,
		inputWidth,
		inputHeight,
		inputCameraIntrinsics,
		initialColorMode = "mixed",
		initialPointSize = 0.1,
		initialScale = 2.0,
		useMockData = true,
		cameraPositionX = $bindable(0),
		cameraPositionY = $bindable(0),
		cameraPositionZ = $bindable(5),
		cameraRotationX = $bindable(0),
		cameraRotationY = $bindable(0),
		cameraRotationZ = $bindable(0)
	}: Props = $props();

	// Camera system with Svelte 5 runes
	let pointSize = $state(initialPointSize);
	let maxDepth = $state(3.0);
	let minDepth = $state(0.1);
	let pointCloudScale = $state(initialScale); // Scale factor to spread out the point cloud
	let colorMode = $state<ColorMode>(initialColorMode);
	let pointStyle = $state<PointStyle>("circle");
	let brightness = $state(1.0);
	let contrast = $state(1.0);

	// Color mode types
	type ColorMode = "depth" | "rgb" | "mixed" | "grayscale" | "height";
	type PointStyle = "square" | "circle" | "shader";

	// RGBD Data structure
	interface RGBDData {
		width: number;
		height: number;
		rgbData: Uint8Array; // RGB channels (width * height * 3)
		depthData: Float32Array; // Depth values in meters (width * height)
		cameraIntrinsics: {
			fx: number;
			fy: number; // Focal lengths
			cx: number;
			cy: number; // Principal point
		};
	}

	// Generate mock 64x64 RGBD data
	function generateMockRGBD(): RGBDData {
		const width = 64;
		const height = 64;
		const rgbData = new Uint8Array(width * height * 3);
		const depthData = new Float32Array(width * height);

		// Generate some interesting depth patterns and colors
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const idx = y * width + x;
				const rgbIdx = idx * 3;

				// Create a wave pattern for depth
				const centerX = width / 2;
				const centerY = height / 2;
				const distFromCenter = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
				const waveDepth = 1.5 + 0.8 * Math.sin(distFromCenter * 0.3) * Math.cos(x * 0.2);

				// Add some noise
				const noise = (Math.random() - 0.5) * 0.2;
				depthData[idx] = Math.max(0.1, waveDepth + noise);

				// Generate more interesting RGB patterns
				const r = Math.floor(128 + 127 * Math.sin(x * 0.1) * Math.cos(y * 0.1));
				const g = Math.floor(128 + 127 * Math.sin((x + y) * 0.05));
				const b = Math.floor(128 + 127 * Math.cos(distFromCenter * 0.1));

				rgbData[rgbIdx] = Math.max(0, Math.min(255, r)); // R
				rgbData[rgbIdx + 1] = Math.max(0, Math.min(255, g)); // G
				rgbData[rgbIdx + 2] = Math.max(0, Math.min(255, b)); // B
			}
		}

		return {
			width,
			height,
			rgbData,
			depthData,
			cameraIntrinsics: {
				fx: 50.0,
				fy: 50.0,
				cx: width / 2,
				cy: height / 2
			}
		};
	}

	// Create RGBD data from external input or mock data
	function createRGBDData(): RGBDData {
		// Use external data if provided
		if (!useMockData && inputRGBData && inputDepthData && inputWidth && inputHeight) {
			return {
				width: inputWidth,
				height: inputHeight,
				rgbData: inputRGBData,
				depthData: inputDepthData,
				cameraIntrinsics: inputCameraIntrinsics || {
					fx: 50.0,
					fy: 50.0,
					cx: inputWidth / 2,
					cy: inputHeight / 2
				}
			};
		}

		// Fallback to mock data
		return generateMockRGBD();
	}

	// Convert depth value to color (rainbow mapping)
	function depthToColor(depth: number, minDepth: number, maxDepth: number): Color {
		// Normalize depth to 0-1 range
		const normalizedDepth = Math.max(0, Math.min(1, (depth - minDepth) / (maxDepth - minDepth)));

		// Rainbow color mapping: Red (near) -> Green -> Blue (far)
		const hue = ((1 - normalizedDepth) * 240) / 360; // 240° = blue, 0° = red
		const saturation = 1.0;
		const lightness = 0.5;

		return new Color().setHSL(hue, saturation, lightness);
	}

	// Get color based on selected mode
	function getPointColor(
		x: number,
		y: number,
		depth: number,
		rgbData: Uint8Array,
		rgbdData: RGBDData
	): Color {
		const idx = y * rgbdData.width + x;
		const rgbIdx = idx * 3;

		switch (colorMode) {
			case "depth":
				return depthToColor(depth, minDepth, maxDepth);

			case "rgb":
				const r = rgbData[rgbIdx] / 255;
				const g = rgbData[rgbIdx + 1] / 255;
				const b = rgbData[rgbIdx + 2] / 255;
				return new Color(r * brightness, g * brightness, b * brightness);

			case "mixed":
				const rgbColor = new Color(
					rgbData[rgbIdx] / 255,
					rgbData[rgbIdx + 1] / 255,
					rgbData[rgbIdx + 2] / 255
				);
				const depthColor = depthToColor(depth, minDepth, maxDepth);
				// Mix RGB with depth-based intensity
				const depthIntensity = 1 - (depth - minDepth) / (maxDepth - minDepth);
				return rgbColor.multiplyScalar(depthIntensity * brightness + 0.3);

			case "grayscale":
				const normalizedDepth = (depth - minDepth) / (maxDepth - minDepth);
				const intensity = (1 - normalizedDepth) * brightness;
				return new Color(intensity, intensity, intensity);

			case "height":
				// Color based on Y position (height)
				const worldY = (-(y - rgbdData.cameraIntrinsics.cy) * depth) / rgbdData.cameraIntrinsics.fy;
				const normalizedHeight = (worldY + 2) / 4; // Assuming height range -2 to 2
				const heightHue = (normalizedHeight * 120) / 360; // Green to red
				return new Color().setHSL(heightHue, 0.8, 0.5);

			default:
				return depthToColor(depth, minDepth, maxDepth);
		}
	}

	// Convert pixel coordinates + depth to 3D world coordinates
	function pixelTo3D(
		x: number,
		y: number,
		depth: number,
		intrinsics: RGBDData["cameraIntrinsics"]
	): Vector3 {
		const worldX = ((x - intrinsics.cx) * depth) / intrinsics.fx;
		const worldY = (-(y - intrinsics.cy) * depth) / intrinsics.fy; // Flip Y for correct orientation
		const worldZ = -depth; // Negative Z for forward direction

		// Apply scaling factor to spread out the point cloud
		return new Vector3(worldX * pointCloudScale, worldY * pointCloudScale, worldZ);
	}

	// Generate point cloud geometry from RGBD data
	function generatePointCloudGeometry(rgbdData: RGBDData): BufferGeometry {
		const positions: number[] = [];
		const colors: number[] = [];

		for (let y = 0; y < rgbdData.height; y++) {
			for (let x = 0; x < rgbdData.width; x++) {
				const idx = y * rgbdData.width + x;
				const depth = rgbdData.depthData[idx];

				// Skip invalid depth values
				if (depth <= 0 || depth > maxDepth) continue;

				// Convert to 3D coordinates (in camera space)
				const point3D = pixelTo3D(x, y, depth, rgbdData.cameraIntrinsics);

				// Use the points directly in camera space - parent will handle transformations
				positions.push(point3D.x, point3D.y, point3D.z);

				// Get color based on selected mode
				const color = getPointColor(x, y, depth, rgbdData.rgbData, rgbdData);
				colors.push(color.r, color.g, color.b);
			}
		}

		const geometry = new BufferGeometry();
		geometry.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
		geometry.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));

		return geometry;
	}

	// Initialize RGBD data
	let rgbdData = $state(createRGBDData());
	let pointCloudGeometry = $state<BufferGeometry>();

	// Reactive geometry updates
	$effect(() => {
		// React to changes in rgbd data, depth range, scale, or visual settings
		rgbdData;
		maxDepth;
		minDepth;
		pointCloudScale;
		colorMode;
		brightness;
		contrast;

		pointCloudGeometry = generatePointCloudGeometry(rgbdData);
	});

	// Watch for external data changes
	$effect(() => {
		// React to external input changes
		inputRGBData;
		inputDepthData;
		inputWidth;
		inputHeight;
		inputCameraIntrinsics;
		useMockData;

		rgbdData = createRGBDData();
	});
</script>

{#if pointCloudGeometry}
	<T.Group
		position={[cameraPositionX, cameraPositionY, cameraPositionZ]}
		rotation={[cameraRotationX, cameraRotationY, cameraRotationZ]}
		onpointerenter={(e) => e.stopPropagation()}
		onpointerleave={(e) => e.stopPropagation()}
		onpointerdown={(e) => e.stopPropagation()}
		onpointerup={(e) => e.stopPropagation()}
		onpointermove={(e) => e.stopPropagation()}
		onclick={(e) => e.stopPropagation()}
	>
		<!-- Debug visualization: small cube at camera position -->
		<!-- <T.Mesh position={[0, 0, 0]}>
			<T.BoxGeometry args={[0.1, 0.1, 0.1]} />
			<T.MeshBasicMaterial color="red" />
		</T.Mesh> -->

		<!-- Debug visualization: cone pointing in camera direction -->
		<!-- <T.Mesh position={[0, 0, -0.2]} rotation={[Math.PI / 2, 0, 0]}>
			<T.ConeGeometry args={[0.05, 0.2, 8]} />
			<T.MeshBasicMaterial color="blue" />
		</T.Mesh> -->

		<!-- The actual pointcloud -->
		<T.Points
			geometry={pointCloudGeometry}
			onpointerenter={(e) => e.stopPropagation()}
			onpointerleave={(e) => e.stopPropagation()}
			onpointerdown={(e) => e.stopPropagation()}
			onpointerup={(e) => e.stopPropagation()}
			onpointermove={(e) => e.stopPropagation()}
			onclick={(e) => e.stopPropagation()}
		>
			<T.PointsMaterial
				size={pointSize}
				vertexColors={true}
				sizeAttenuation={true}
				transparent={true}
				opacity={0.9}
				alphaTest={0.1}
				map={pointStyle === "circle" ? undefined : undefined}
			/>
		</T.Points>
	</T.Group>
{/if}
