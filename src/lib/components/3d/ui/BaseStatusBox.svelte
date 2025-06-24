<script lang="ts">
	import { Container } from "threlte-uikit";

	interface Props {
		minWidth?: number;
		minHeight?: number;
		color?: string;
		opacity?: number;
		borderOpacity?: number;
		backgroundOpacity?: number;
		disabled?: boolean;
		clickable?: boolean;
		children: import('svelte').Snippet;
		onclick?: () => void;
	}

	let {
		minWidth = 120,
		minHeight = 100,
		color = "rgb(139, 69, 219)",
		opacity = 1,
		borderOpacity = 0.6,
		backgroundOpacity = 0.2,
		disabled = false,
		clickable = true,
		onclick,
		children
	}: Props = $props();

	let isHovered = $state(false);
	let hoverTimeout: ReturnType<typeof setTimeout>;

	function handlePointerEnter() {
		if (disabled) return;
		clearTimeout(hoverTimeout);
		hoverTimeout = setTimeout(() => {
			isHovered = true;
		}, 20);
	}

	function handlePointerLeave() {
		clearTimeout(hoverTimeout);
		hoverTimeout = setTimeout(() => {
			isHovered = false;
		}, 20);
	}

	function handleClick() {
		if (disabled || !clickable) return;
		onclick?.();
	}

	let currentBorderOpacity = $derived(isHovered ? Math.min(borderOpacity * 1.5, 1) : borderOpacity);
	let currentBackgroundOpacity = $derived(isHovered ? Math.min(backgroundOpacity * 2, 0.5) : backgroundOpacity);
</script>

<!--
@component
Base status box component with hover effects and common styling.
Uses a single color with opacity variations for simplicity.
-->

<Container
	{minWidth}
	{minHeight}
	borderRadius={12}
	borderWidth={2}
	borderColor={color}
	borderOpacity={currentBorderOpacity}
	backgroundColor={color}
	backgroundOpacity={currentBackgroundOpacity}
	padding={16}
	pointerEvents="auto"
	cursor={clickable && !disabled ? "pointer" : "default"}
	{opacity}
	onclick={handleClick}
	onmousedown={handleClick}
	onpointerenter={handlePointerEnter}
	onpointerleave={handlePointerLeave}
>
	<Container
		flexDirection="column"
		alignItems="center"
		justifyContent="center"
		gap={8}
		width="100%"
		height="100%"
	>
		{@render children()}
	</Container>
</Container> 