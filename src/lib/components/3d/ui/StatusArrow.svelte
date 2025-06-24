<script lang="ts">
	import { Container, SVG } from "threlte-uikit";
	import { ICON } from "$lib/utils/icon";

	interface Props {
		color?: string;
		opacity?: number;
		size?: number;
		direction?: 'right' | 'down' | 'left' | 'up';
		minWidth?: number;
		minHeight?: number;
	}

	let {
		color = "rgb(139, 69, 219)",
		opacity = 1,
		size = 12,
		direction = 'right',
		minWidth = 20,
		minHeight = 12
	}: Props = $props();
</script>

<!--
@component
Reusable arrow component for showing connection flows.
Supports different directions and styling.
-->

<Container
	flexDirection="row"
	alignItems="center"
	justifyContent="center"
	gap={12}
	{minWidth}
	{minHeight}
>
	{#if direction === 'right'}
		<SVG
			width={size}
			height={size}
			{color}
			{opacity}
			src={ICON[`icon-[formkit--arrowright]`].svg}
		/>
	{:else if direction === 'down'}
		<SVG
			width={size}
			height={size}
			{color}
			{opacity}
			src={ICON[`icon-[formkit--arrowdown]`].svg}
		/>
		{:else if direction === 'left'}
		<SVG
			width={size}
			height={size}
			{color}
			{opacity}
			src={ICON[`icon-[formkit--arrowleft]`].svg}
		/>
	{:else if direction === 'up'}
		<SVG
			width={size}
			height={size}
			{color}
			{opacity}
			src={ICON[`icon-[formkit--arrowup]`].svg}
		/>
	{/if}
</Container> 