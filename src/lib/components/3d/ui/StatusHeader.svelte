<script lang="ts">
	import { Container, SVG, Text } from "threlte-uikit";

	interface Props {
		icon: string;
		text: string;
		color?: string;
		opacity?: number;
		iconSize?: number;
		fontSize?: number;
		letterSpacing?: number;
		marginBottom?: number;
	}

	let {
		icon,
		text,
		color = "rgb(139, 69, 219)",
		opacity = 1,
		iconSize = 8,
		fontSize = 14,
		letterSpacing = 0.8,
		marginBottom = 6
	}: Props = $props();
</script>

<Container flexDirection="row" alignItems="center" gap={6} {marginBottom}>
	<SVG width={iconSize} height={iconSize} {color} {opacity} src={icon} />
	<Text
		{text}
		{fontSize}
		fontWeight="bold"
		{color}
		{opacity}
		textTransform="uppercase"
		{letterSpacing}
	/>
</Container>
