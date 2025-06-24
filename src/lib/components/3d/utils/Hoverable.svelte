<script lang="ts">
	import { T } from "@threlte/core";
	import type { IntersectionEvent } from "@threlte/extras";
	import { interactivity } from "@threlte/extras";
	import type { Snippet } from "svelte";
	import { Spring, Tween } from "svelte/motion";
	import { useCursor } from "@threlte/extras";
	import { onMount, onDestroy } from "svelte";
	import { Group } from "three";
	import type { Robot } from "$lib/elements/robot/Robot.svelte";

	interface Props {
		content: Snippet<[{ isHovered: boolean; isSelected: boolean; debouncedIsHovered: boolean }]>; // renderable
		onClickObject?: () => void;
		rescale?: boolean;
		debouncedTimeout?: number;
	}

	let { content, onClickObject, rescale = true, debouncedTimeout = 100 }: Props = $props();

	const scale = new Spring(1);

	// Height calculation state
	let groupRef = $state<Group | undefined>(undefined);

	// Hover state
	let isHovered = $state(false);
	let isSelected = $state(false);
	let isHighlighted = $derived(isHovered || isSelected);

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


	const handleKeyDown = (event: KeyboardEvent) => {
		if (event.key === "Escape" && isSelected) {
			isSelected = false;
		}
	};

	onMount(() => {
		document.addEventListener("keydown", handleKeyDown);
	});

	onDestroy(() => {
		document.removeEventListener("keydown", handleKeyDown);
	});

	const { onPointerEnter, onPointerLeave } = useCursor();
	interactivity();

	let debouncedIsHovered = $state(false);
	let hoverTimeout: ReturnType<typeof setTimeout>;

	function turningHoverOn() {
		clearTimeout(hoverTimeout);
		debouncedIsHovered = true;
	}

	function turningHoverOff() {
		// Debounce the hover state when turning off to prevent flickering
		clearTimeout(hoverTimeout);
		hoverTimeout = setTimeout(() => {
			debouncedIsHovered = false;
		}, debouncedTimeout); // wait 100ms (debouncedTimeout) before turning off
	}

	$effect(() => {
		if (isHovered) {
			turningHoverOn();
		} else {
			turningHoverOff();
		}
	});
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
		{@render content({ isHovered, isSelected, debouncedIsHovered })}
	{/snippet}
</T.Group>
