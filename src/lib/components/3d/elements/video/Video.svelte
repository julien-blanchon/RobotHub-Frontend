<script lang="ts">
	import { T } from "@threlte/core";
	import { interactivity } from "@threlte/extras";
	import { VideoTexture, CanvasTexture, LinearFilter, RGBAFormat, Shape, Path, ExtrudeGeometry, BoxGeometry } from "three";
	import { onMount } from "svelte";
	import type { VideoInstance } from "$lib/elements/video/VideoManager.svelte";
	import { videoManager } from "$lib/elements/video/VideoManager.svelte";

	// Props interface
	interface Props {
		// Video instance (required)
		videoInstance: VideoInstance;
		
		// Workspace ID (required for API calls)
		workspaceId: string;

		// TV dimensions
		width?: number;
		height?: number;
		depth?: number;
		frameThickness?: number;
		cornerRadius?: number;

		// Video props - now optional since we use the connection system
		videoSrc?: string;
		loadingDelay?: number;

		// Style props
		frameColor?: string;
		frameActiveColor?: string;
		frameMetalness?: number;
		frameRoughness?: number;
		frameEnvMapIntensity?: number;
		fallbackColor?: string;

		// Loading props
		showLoading?: boolean;
		loadingText?: string;
		loadingEmoji?: string;

		// Stream management props
		lazyLoad?: boolean;
	}

	// Props with defaults
	let {
		videoInstance,
		workspaceId,

		width = 4,
		height = 2.25,
		depth = 0.1,
		frameThickness = 0.2,
		cornerRadius = 0.15,

		videoSrc = "/video.mp4", // Fallback if no stream
		loadingDelay = 1000, // Reduced delay for real streams

		frameColor = "#374151",
		frameActiveColor = "#FFD700",
		frameMetalness = 0.05,
		frameRoughness = 0.4,
		frameEnvMapIntensity = 0.3,
		fallbackColor = "#FFD700",

		showLoading = true,
		loadingText = "Hover to load video...",
		loadingEmoji = "📺",

		lazyLoad = true
	}: Props = $props();

	let isPlayingLocked = $state(false);
	let isHovered = $state(false);

	// Video setup
	let videoElement: HTMLVideoElement | null = $state(null);
	let videoTexture: VideoTexture | null = $state(null);
	let loadingTexture: CanvasTexture | null = $state(null);
	let videoLoaded = $state(false);
	let isLoading = $state(false);

	// Function to create loading texture with text
	const createLoadingTexture = (text: string, backgroundColor: string = fallbackColor) => {
		const canvas = document.createElement('canvas');
		const ctx = canvas.getContext('2d')!;
		
		// Set canvas size (should match video aspect ratio)
		canvas.width = 512;
		canvas.height = 288; // 16:9 aspect ratio
		
		// Fill background
		ctx.fillStyle = backgroundColor;
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		
		// Setup text styling
		ctx.fillStyle = '#FFFFFF';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.font = 'bold 32px Arial, sans-serif';
		
		// Add text shadow for better readability
		ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
		ctx.shadowBlur = 4;
		ctx.shadowOffsetX = 2;
		ctx.shadowOffsetY = 2;
		
		// Draw the loading text
		ctx.fillText(text, canvas.width / 2, canvas.height / 2);
		
		// Draw emoji if provided
		if (loadingEmoji) {
			ctx.font = 'bold 48px Arial, sans-serif';
			ctx.shadowColor = 'transparent';
			ctx.fillText(loadingEmoji, canvas.width / 2, canvas.height / 2 - 60);
		}
		
		// Create and return Three.js texture
		const texture = new CanvasTexture(canvas);
		texture.minFilter = LinearFilter;
		texture.magFilter = LinearFilter;
		texture.needsUpdate = true;
		
		return texture;
	};

	// Function to setup video element
	const setupVideo = (stream?: MediaStream) => {
		// Create video element
		videoElement = document.createElement("video");
		videoElement.loop = true;
		videoElement.muted = true; // Required for autoplay
		videoElement.playsInline = true;
		videoElement.crossOrigin = "anonymous";

		if (stream) {
			// Use live stream
			videoElement.srcObject = stream;
		} else {
			// Fallback to static video
			videoElement.src = videoSrc;
		}

		// Create video texture
		if (!videoTexture) {
			videoTexture = new VideoTexture(videoElement);
			videoTexture.minFilter = LinearFilter;
			videoTexture.magFilter = LinearFilter;
			videoTexture.format = RGBAFormat;
			videoTexture.flipY = true; // Fix the flipped video
			videoTexture.needsUpdate = true;

			videoElement.addEventListener("loadeddata", () => {
				videoLoaded = true;
				isLoading = false;
			});

			videoElement.addEventListener("canplay", () => {
				videoElement?.play().catch(console.error);
			});

			videoElement.addEventListener("error", (e) => {
				console.error("Video error:", e);
				isLoading = false;
			});

			if (stream) {
				// For streams, try to play immediately
				videoElement.play().catch(console.error);
				// Mark as loaded faster for live streams
				setTimeout(() => {
					if (!videoLoaded) {
						videoLoaded = true;
						isLoading = false;
					}
				}, 500);
			} else {
				videoElement.load();
			}
		}
	};

	// Function to cleanup video
	const cleanupVideo = () => {
		if (videoElement) {
			videoElement.pause();
			if (videoElement.srcObject) {
				videoElement.srcObject = null;
			}
			if (videoElement.src) {
				videoElement.removeAttribute("src");
				videoElement.load(); // This clears any pending loads
			}
			videoElement = null;
		}
		if (videoTexture) {
			videoTexture.dispose();
			videoTexture = null;
		}
		if (loadingTexture) {
			loadingTexture.dispose();
			loadingTexture = null;
		}
		videoLoaded = false;
		isLoading = false;
	};

	// Create loading texture on mount
	onMount(() => {
		loadingTexture = createLoadingTexture(loadingText);
	});

	let shouldPlay = $derived(isPlayingLocked || isHovered);

	// Watch for hover state changes
	$effect(() => {
		if (shouldPlay) {
			// Start loading video when hovered
			isLoading = true;

			// Create a loading texture for the loading state if not already created
			if (!loadingTexture) {
				loadingTexture = createLoadingTexture("Loading...");
			}

			// Cache status values to prevent reactive loops
			const canActivate = lazyLoad && (videoInstance.input.connectionState === 'prepared' || videoInstance.input.connectionState === 'paused');
			const hasPreparedRoom = videoInstance.input.preparedRoomId !== null;

			// Add a small delay to avoid loading on quick hovers
			const timeoutId = setTimeout(async () => {
				if (shouldPlay) {
					// Double check we're still hovered
					// Handle lazy loading: activate prepared/paused remote streams
					if (canActivate && hasPreparedRoom) {
						try {
							const result = await videoManager.activateRemoteStream(videoInstance.id, workspaceId);
							if (!result.success) {
								console.error("Failed to activate remote stream:", result.error);
								isLoading = false;
								return;
							}
						} catch (error) {
							console.error("Error activating remote stream:", error);
							isLoading = false;
							return;
						}
					}

					const stream = videoInstance.currentStream;
					setupVideo(stream || undefined);
				}
			}, loadingDelay);

			return () => {
				clearTimeout(timeoutId);
			};
		} else {
			// Handle cleanup when not hovered
			// Cleanup video rendering
			cleanupVideo();

			// Cache status values to prevent reactive loops
			const canPause = lazyLoad && videoInstance.input.connectionState === 'connected' && videoInstance.input.connectionPolicy === 'lazy';

			// Only pause remote streams with lazy policy (not persistent connections)
			if (canPause) {
				try {
					videoManager.pauseRemoteStream(videoInstance.id);
				} catch (error) {
					console.error("Error pausing remote stream:", error);
				}
			}
		}
	});

	// Watch for stream changes when video is active (hovered) - simplified to prevent loops
	let lastStreamRef: MediaStream | null = null;
	$effect(() => {
		if (!shouldPlay || !videoElement) {
			lastStreamRef = null;
			return;
		}

		const currentStream = videoInstance.currentStream;
		
		// Only update if the stream reference has actually changed
		if (currentStream !== lastStreamRef) {
			lastStreamRef = currentStream;
			
			// Gracefully stop current video
			try {
				videoElement.pause();

				// Clear sources
				if (videoElement.srcObject) {
					videoElement.srcObject = null;
				}
				if (videoElement.src) {
					videoElement.removeAttribute("src");
					videoElement.load(); // This clears any pending loads
				}
			} catch (error) {
				console.warn("Error stopping previous video:", error);
			}

			// Dispose current texture
			if (videoTexture) {
				videoTexture.dispose();
				videoTexture = null;
			}

			// Create/update loading texture for the loading state
			if (loadingTexture) {
				loadingTexture.dispose();
			}
			loadingTexture = createLoadingTexture("Loading...");

			// Reset state
			videoLoaded = false;
			isLoading = true;

			// Small delay to ensure cleanup is complete
			setTimeout(() => {
				if (shouldPlay && currentStream === lastStreamRef) {
					// Make sure we're still hovered and stream hasn't changed
					setupVideo(currentStream || undefined);
				}
			}, 50);
		}
	});

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

	const frameGeometry = createTVFrame(width, height, depth, frameThickness, cornerRadius);
	const screenGeometry = createScreen(width, height, frameThickness);

	interactivity();
</script>

<T.Group
	onclick={() => (isPlayingLocked = !isPlayingLocked)}
	onpointerenter={() => (isHovered = true)}
	onpointerleave={() => (isHovered = false)}
>
	<!-- TV Frame -->
	<T.Mesh geometry={frameGeometry}>
		<T.MeshStandardMaterial
			color={shouldPlay ? frameActiveColor : frameColor}
			metalness={frameMetalness}
			roughness={frameRoughness}
			envMapIntensity={frameEnvMapIntensity}
		/>
	</T.Mesh>

	<T.Mesh geometry={screenGeometry} position.z={depth / 2 - 0.01}>
		{#if videoLoaded && videoTexture}
			<T.MeshBasicMaterial map={videoTexture} />
		{:else if loadingTexture}
			<T.MeshBasicMaterial map={loadingTexture} />
		{:else}
			<T.MeshBasicMaterial color={fallbackColor} />
		{/if}
	</T.Mesh>

	<!-- Loading/Hover State Overlay -->
	{#if showLoading && (!isHovered || isLoading)}
		<T.MeshBasicMaterial color={fallbackColor} />
	{/if}

	<!-- Video Screen -->
	<!-- <T.Mesh position.z={depth / 2 - 0.01} scale={[2, 2, 2]} position.y={0.5}>

		{#if videoLoaded && videoTexture}
			{#if videoSrc}
				<T.MeshBasicMaterial map={videoTexture} />
				<Root>
					<Container >
						<Video bind:element={videoElement} autoplay muted width={100} height={100} />
						<Text text={videoElement?.src} />
					</Container>
				</Root>
			{:else}
				<T.MeshBasicMaterial color={fallbackColor} />
			{/if}
		{:else}
			<T.MeshBasicMaterial color={fallbackColor} />
		{/if}
	</T.Mesh> -->
</T.Group>
