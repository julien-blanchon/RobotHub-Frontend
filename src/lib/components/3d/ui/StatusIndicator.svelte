<script lang="ts">
	import { Container } from "threlte-uikit";

	interface Props {
		color?: string;
		size?: number;
		type?: "dot" | "pulse";
		visible?: boolean;
	}

	let { color = "rgb(139, 69, 219)", size = 8, type = "dot", visible = true }: Props = $props();
</script>

{#if visible}
	<Container width={size} height={size} borderRadius="50%" backgroundColor={color} />
{/if}
