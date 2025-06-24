<script lang="ts">
	import { Container, Text } from "threlte-uikit";

	interface Props {
		title?: string;
		subtitle?: string;
		description?: string;
		color?: string;
		variant?: 'primary' | 'secondary' | 'tertiary';
		size?: 'sm' | 'md' | 'lg';
		align?: 'left' | 'center' | 'right';
		children?: import('svelte').Snippet;
	}

	let {
		title,
		subtitle,
		description,
		color = "rgb(221, 214, 254)",
		variant = 'primary',
		size = 'md',
		align = 'center',
		children
	}: Props = $props();

	// Predefined opacity levels for consistency
	const opacityLevels = {
		primary: { title: 1.0, subtitle: 0.9, description: 0.8 },
		secondary: { title: 0.9, subtitle: 0.8, description: 0.7 },
		tertiary: { title: 0.8, subtitle: 0.7, description: 0.6 }
	};

	// Predefined size configurations
	const sizeConfigs = {
		sm: { title: 10, subtitle: 9, description: 8, gap: 1, padding: 6 },
		md: { title: 12, subtitle: 10, description: 9, gap: 2, padding: 8 },
		lg: { title: 14, subtitle: 12, description: 10, gap: 3, padding: 10 }
	};

	const config = sizeConfigs[size];
	const opacities = opacityLevels[variant];

	// Convert align to flexbox properties
	const flexAlign = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
</script>

<!--
@component
Simplified status content component with predefined styling levels.
Uses consistent opacity and sizing patterns across all components.
Fixed text centering by properly handling flexbox alignment.
-->

<Container
	padding={config.padding}
	marginBottom={4}
	width="100%"
>
	{#if children}
		{@render children()}
	{:else}
		<Container 
			flexDirection="column" 
			alignItems={flexAlign}
			justifyContent="center"
			gap={config.gap}
			width="100%"
		>
			{#if title}
				<Text
					text={title}
					fontSize={config.title}
					{color}
					opacity={opacities.title}
					textAlign={align}
					width="100%"
				/>
			{/if}
			
			{#if subtitle}
				<Text
					text={subtitle}
					fontSize={config.subtitle}
					fontWeight="normal"
					{color}
					opacity={opacities.subtitle}
					textAlign={align}
					width="100%"
				/>
			{/if}
			
			{#if description}
				<Text
					text={description}
					fontSize={config.description}
					fontWeight="light"
					{color}
					opacity={opacities.description}
					textAlign={align}
					width="100%"
				/>
			{/if}
		</Container>
	{/if}
</Container> 