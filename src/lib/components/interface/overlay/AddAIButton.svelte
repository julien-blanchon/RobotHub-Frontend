<script lang="ts">
	import { Button } from "@/components/ui/button";
	import * as DropdownMenu from "@/components/ui/dropdown-menu";
	import { cn } from "$lib/utils";
	import { MODEL_TYPES, type ModelType } from "$lib/elements/compute";
	import AIModelConfigurationModal from "@/components/3d/elements/compute/modal/AIModelConfigurationModal.svelte";

	interface Props {
		workspaceId: string;
		open?: boolean;
	}

	let { open = $bindable(), workspaceId }: Props = $props();

	let isConfigModalOpen = $state(false);
	let selectedModelType = $state<ModelType>('act');

	// Get available model types
	const availableModels = Object.values(MODEL_TYPES).filter(model => model.enabled);

	function openConfigModal(modelType: ModelType) {
		selectedModelType = modelType;
		isConfigModalOpen = true;
		open = false; // Close the dropdown
	}

	function quickAddACT() {
		openConfigModal('act');
	}

	function formatModelType(modelType: string): string {
		const config = MODEL_TYPES[modelType as ModelType];
		return config ? config.label : modelType;
	}

	function getModelDescription(modelType: string): string {
		const config = MODEL_TYPES[modelType as ModelType];
		return config ? config.description : "AI model";
	}

	function getModelIcon(modelType: string): string {
		const config = MODEL_TYPES[modelType as ModelType];
		return config ? config.icon : "icon-[mdi--brain]";
	}
</script>

<!-- Main Add Button (ACT Model - Quick Add) -->
<Button
	variant="default"
	size="sm"
	onclick={quickAddACT}
	disabled={true}
	class="group rounded-r-none border-0 bg-purple-500 text-white transition-all duration-200 hover:bg-purple-400 dark:bg-purple-600 dark:hover:bg-purple-500"
>
	<span
		class={[
			"mr-2 size-4 transition-transform duration-200",
			"icon-[mdi--plus] group-hover:rotate-90"
		]}
	></span>
	Add Model
</Button>

<!-- Dropdown Menu Button -->
<DropdownMenu.Root bind:open>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				disabled={true}
				variant="default"
				size="sm"
				class={cn(
					"rounded-l-none border-0 border-l border-purple-400/30 bg-purple-500 px-2 text-white transition-all duration-200 hover:bg-purple-400",
					"dark:border-purple-500/30 dark:bg-purple-600 dark:hover:bg-purple-500",
					open && "bg-purple-600 shadow-inner dark:bg-purple-700"
				)}
			>
				<span
					class={cn(
						"size-4 transition-transform duration-200",
						"icon-[mdi--chevron-down]",
						open && "rotate-180"
					)}
				></span>
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>

	<DropdownMenu.Content class="w-64 bg-slate-100 border-slate-300 dark:bg-slate-900 dark:border-slate-600">
		{#each availableModels as model}
			<DropdownMenu.Item
				class="flex items-center gap-3 p-3 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30"
				onclick={() => openConfigModal(model.id)}
			>
				<span class="{model.icon} size-5 text-purple-500 dark:text-purple-400"></span>
				<div class="flex-1">
					<div class="font-medium text-slate-900 dark:text-slate-100">
						{model.label}
					</div>
					<div class="text-xs text-slate-600 dark:text-slate-400">
						{model.description}
					</div>
				</div>
			</DropdownMenu.Item>
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>

<!-- Configuration Modal -->
<AIModelConfigurationModal 
	bind:open={isConfigModalOpen} 
	{workspaceId}
	initialModelType={selectedModelType}
/>
