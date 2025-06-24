<script lang="ts">
	import { Button } from "@/components/ui/button";
	import { Badge } from "@/components/ui/badge";
	import * as DropdownMenu from "@/components/ui/dropdown-menu";
	import { toast } from "svelte-sonner";
	import { cn } from "$lib/utils";
	import { generateName } from "@/utils/generateName";
	import { remoteComputeManager } from "$lib/elements/compute//RemoteComputeManager.svelte";

	interface Props {
		open?: boolean;
	}

	let { open = $bindable() }: Props = $props();

	const aiOptions = [
		{ id: 'act', label: 'ACT Model', icon: 'icon-[mdi--brain]', enabled: true },
		{ id: 'pi0', label: 'Pi0', icon: 'icon-[mdi--brain]', enabled: false },
		{ id: 'nano-vla', label: 'Nano VLA', icon: 'icon-[mdi--brain]', enabled: false },
		{ id: 'nvidia-groot', label: 'Nvidia Groot', icon: 'icon-[mdi--robot-outline]', enabled: false }
	];

	async function addAI(aiType: string) {
		try {
			// Basic validation
			if (!aiType) return;

			const computeId = generateName();
			const computeName = `${formatAIType(aiType)} ${computeId}`;
			
			// Create a new compute instance
			const compute = remoteComputeManager.createCompute(computeId, computeName);
			
			toast.success(`Created ${formatAIType(aiType)} compute: ${computeName}`);
			
			// Close the dropdown
			open = false;
		} catch (error) {
			console.error("AI creation failed:", error);
			toast.error("Failed to create AI compute");
		}
	}

	async function quickAddAI() {
		await addAI("act");
	}

	function formatAIType(aiType: string): string {
		switch (aiType) {
			case 'pi0':
				return 'Pi0';
			case 'nano-vla':
				return 'Nano VLA';
			case 'nvidia-groot':
				return 'Nvidia Groot';
			default:
				return aiType;
		}
	}

	function getAIDescription(aiType: string): string {
		switch (aiType) {
			case 'pi0':
				return 'Lightweight AI model';
			case 'nano-vla':
				return 'Vision-language-action model';
			case 'nvidia-groot':
				return 'Humanoid robotics model';
			default:
				return 'AI model';
		}
	}
</script>

<!-- Main Add Button (Neural Network) -->
<Button
	variant="default"
	size="sm"
	onclick={quickAddAI}
	class="group rounded-r-none border-0 bg-purple-600 text-white transition-all duration-200 hover:bg-purple-500"
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
	<DropdownMenu.Trigger >
		{#snippet child({ props })}
			<Button
				{...props}
				variant="default"
				size="sm"
				class={cn(
					"rounded-l-none border-0 border-l border-purple-500/30 bg-purple-600 px-2 text-white transition-all duration-200 hover:bg-purple-500",
					open && "bg-purple-700 shadow-inner"
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

	<DropdownMenu.Content
		class="w-56 border-purple-500/30 bg-purple-600 backdrop-blur-sm"
		align="center"
	>
		<DropdownMenu.Group>
			<DropdownMenu.GroupHeading
				class="text-xs font-semibold tracking-wider text-purple-200 uppercase"
			>
				AI Types
			</DropdownMenu.GroupHeading>

			{#each aiOptions as ai}
				<DropdownMenu.Item
					class={[
						"group group cursor-pointer bg-purple-600 text-white transition-all duration-200",
						"data-highlighted:bg-purple-700"
					]}
					onclick={async () => await addAI(ai.id)}
					disabled={!ai.enabled}
				>
					<span
						class={[
							ai.icon,
							"mr-3 size-4 text-purple-200 transition-colors duration-200"
						]}
					></span>
					<div class="flex flex-1 flex-col">
						<span class="font-medium text-white transition-colors duration-200"
							>{formatAIType(ai.id)}</span
						>
						<span class="text-xs text-purple-200 transition-colors duration-200">
							{getAIDescription(ai.id)}
						</span>
					</div>
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Group>
	</DropdownMenu.Content>
</DropdownMenu.Root> 