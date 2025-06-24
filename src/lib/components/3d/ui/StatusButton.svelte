<script lang="ts">
	import { Container, SVG, Text } from "threlte-uikit";

	interface Props {
		text: string;
		icon?: string;
		color?: string;
		backgroundOpacity?: number;
		textOpacity?: number;
		textSize?: number;
		iconSize?: number;
		paddingX?: number;
		paddingY?: number;
		borderRadius?: number;
		marginBottom?: number;
		onclick?: () => void;
	}

	let {
		text,
		icon,
		color = "rgb(139, 69, 219)",
		backgroundOpacity = 0.1,
		textOpacity = 0.7,
		textSize = 10,
		iconSize = 8,
		paddingX = 12,
		paddingY = 4,
		borderRadius = 20,
		marginBottom = 6,
		onclick
	}: Props = $props();
</script>

<!--
@component
Status button component for action buttons with optional icons.
Uses single color with opacity variations for consistent styling.
-->

<Container
	backgroundColor={color}
	{backgroundOpacity}
	{borderRadius}
	{paddingX}
	{paddingY}
	{marginBottom}
	flexDirection="row"
	alignItems="center"
	gap={6}
	pointerEvents={onclick ? "auto" : "none"}
	cursor={onclick ? "pointer" : "default"}
	{onclick}
>
	{#if icon}
		<SVG
			width={iconSize}
			height={iconSize}
			{color}
			opacity={textOpacity}
			src={icon}
		/>
	{/if}
	
	<Text
		{text}
		fontSize={textSize}
		fontWeight="light"
		{color}
		opacity={textOpacity}
		textAlign="center"
	/>
</Container> 