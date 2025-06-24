<script lang="ts">
	import { T } from "@threlte/core";
	import type { IntersectionEvent } from "@threlte/extras";
	import { interactivity } from "@threlte/extras";
	import type { Snippet } from "svelte";
	import { Spring, Tween } from "svelte/motion";
	import { useCursor } from "@threlte/extras";
	import { onMount, onDestroy } from "svelte";
	import { Group, Box3, Vector3 } from "three";
	import type { Robot } from "$lib/elements/robot/Robot.svelte";

	interface Props {
		content: Snippet<[{ isHovered: boolean; isSelected: boolean; offset: number }]>; // renderable
		onClickObject?: () => void;
		robot?: Robot; // Optional robot for height calculation
		rescale?: boolean;
	}

	let { content, onClickObject, robot, rescale = true }: Props = $props();

	const scale = new Spring(1);

	// Height calculation state
	let groupRef = $state<Group | undefined>(undefined);
	let updateInterval: number;
	let lastJointSnapshot: string = "";
	let lastCalculatedHeight: number = 0;
	const CONSTANT_OFFSET = 0.03;
	const HEIGHT_THRESHOLD = 0.015; // Only update if height changes by more than 1.5cm
	const HEIGHT_QUANTIZATION = 0.01; // Quantize to 1cm steps

	// Hover state
	let isHovered = $state(false);
	let isSelected = $state(false);
	let isHighlighted = $derived(isHovered || isSelected);
	let offsetTween = new Tween(0.26, {
		duration: 500,
		easing: (t) => t * (2 - t)
	});

	$effect(() => {
		if (isHighlighted) {
			if (rescale) {
				scale.target = 1.05;
			}
		} else {
			if (rescale) {
				scale.target = 1;
			}
		}
	});

	function getJointSnapshot(): string {
		if (!robot?.urdfRobotState.urdfRobot.joints) return "";
		return robot.urdfRobotState.urdfRobot.robot.joints
			.filter((joint) => joint.type === "revolute" || joint.type === "continuous")
			.map((joint) => {
				const rotation = joint.rotation || [0, 0, 0];
				return `${joint.name}:${rotation.map((r) => Math.round(r * 100) / 100).join(",")}`;
			})
			.join("|");
	}

	function quantizeHeight(height: number): number {
		return Math.round(height / HEIGHT_QUANTIZATION) * HEIGHT_QUANTIZATION;
	}

	function calculateRobotHeight() {
		if (!groupRef || !robot) return;

		const currentJointSnapshot = getJointSnapshot();
		if (currentJointSnapshot === lastJointSnapshot) {
			return; // No significant joint changes
		}

		try {
			groupRef.updateMatrixWorld(true);
			const box = new Box3().setFromObject(groupRef);
			const size = new Vector3();
			box.getSize(size);
			const height = size.y;
			const actualHeight = height / (10 * scale.current);
			const quantizedHeight = quantizeHeight(actualHeight);
			const heightDiff = Math.abs(quantizedHeight - lastCalculatedHeight);
			if (heightDiff < HEIGHT_THRESHOLD) {
				return; // Change too small, ignore
			}

			const newTarget = Math.max(quantizedHeight + CONSTANT_OFFSET, 0.08);
			offsetTween.target = newTarget;
			lastCalculatedHeight = quantizedHeight;
			lastJointSnapshot = currentJointSnapshot;
		} catch (error) {
			console.warn("Error calculating robot height:", error);
			offsetTween.target = 0.28;
		}
	}

	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key === "Escape" && isSelected) {
			isSelected = false;
		}
	};

	onMount(() => {
		if (!robot) return;
		// Only run the height‐update check every 200 ms
		// updateInterval = setInterval(calculateRobotHeight, 500);
		// setTimeout(calculateRobotHeight, 100);

		document.addEventListener("keydown", handleKeyDown);
	});

	onDestroy(() => {
		// if (updateInterval) {
		// 	clearInterval(updateInterval);
		// }

		document.removeEventListener("keydown", handleKeyDown);
	});

	const { onPointerEnter, onPointerLeave } = useCursor();
	interactivity();
</script>

<T.Group
	bind:ref={groupRef}
	onpointerdown={(event: IntersectionEvent<MouseEvent>) => {
		event.stopPropagation();
		isSelected = true;
		onClickObject?.();
	}}
	onpointerenter={(event: IntersectionEvent<PointerEvent>) => {
		event.stopPropagation();
		onPointerEnter();
		isHovered = true;
	}}
	onpointerleave={(event: IntersectionEvent<PointerEvent>) => {
		event.stopPropagation();
		onPointerLeave();
		isHovered = false;
	}}
	scale={scale.current}
>
	{#snippet children({ ref })}
		{@render content({ isHovered, isSelected, offset: offsetTween.current })}
	{/snippet}
</T.Group>
