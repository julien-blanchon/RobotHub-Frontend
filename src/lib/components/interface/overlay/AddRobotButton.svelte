<script lang="ts">
	import { Button } from "@/components/ui/button";
	import { Badge } from "@/components/ui/badge";
	import * as DropdownMenu from "@/components/ui/dropdown-menu";
	import { toast } from "svelte-sonner";
	import { cn } from "$lib/utils";
	import { robotManager } from "$lib/elements/robot/RobotManager.svelte";
	import { robotUrdfConfigMap } from "$lib/configs/robotUrdfConfig";
	import { generateName } from "@/utils/generateName";

	interface Props {
		open: boolean;
	}
	let { open = $bindable() }: Props = $props();

	const robotTypes = Object.keys(robotUrdfConfigMap);

	async function addRobot(robotType: string) {
		console.log(`Creating ${robotType} robot...`);

		try {
			const urdfConfig = robotUrdfConfigMap[robotType];

			if (!urdfConfig) {
				throw new Error(`Unknown robot type: ${robotType}`);
			}

			const robotId = generateName();
			console.log("Creating robot with ID:", robotId, "and config:", urdfConfig);

			const robot = await robotManager.createRobotFromUrdf(robotId, urdfConfig);
			console.log("Robot created successfully:", robot);

			toast.success("Robot Added", {
				description: `${robotType} robot ${robotId.slice(0, 12)}... created successfully.`
			});

			open = false; // Close dropdown on success
		} catch (error) {
			console.error("Robot creation failed:", error);
			toast.error("Failed to Add Robot", {
				description: `Could not create ${robotType} robot: ${error}`
			});
		}
	}

	async function quickAddDefault() {
		const defaultRobotType = robotTypes.find((type) => robotUrdfConfigMap[type].isDefault);
		if (defaultRobotType) {
			await addRobot(defaultRobotType);
		} else {
			// Fallback to first robot type if no default is set
			await addRobot(robotTypes[0]);
		}
	}
</script>

<!-- Main Add Button (Default Robot) -->
<Button
	variant="default"
	size="sm"
	onclick={quickAddDefault}
	class="group rounded-r-none border-0 bg-emerald-500 text-white transition-all duration-200 hover:bg-emerald-400 dark:bg-emerald-600 dark:hover:bg-emerald-500"
>
	<span
		class={[
			"mr-2 size-4 transition-transform duration-200",
			"icon-[mdi--plus] group-hover:rotate-90"
		]}
	></span>
	Add Robot
</Button>

<!-- Dropdown Menu Button -->
<DropdownMenu.Root bind:open>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="default"
				size="sm"
				class={cn(
					"rounded-l-none border-0 border-l border-emerald-400/30 bg-emerald-500 px-2 text-white transition-all duration-200 hover:bg-emerald-400",
					"dark:border-emerald-500/30 dark:bg-emerald-600 dark:hover:bg-emerald-500",
					open && "bg-emerald-600 shadow-inner dark:bg-emerald-700"
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
		class="w-56 border-emerald-400/30 bg-emerald-500 backdrop-blur-sm dark:border-emerald-500/30 dark:bg-emerald-600"
		align="center"
	>
		<DropdownMenu.Group>
			<DropdownMenu.GroupHeading
				class="text-xs font-semibold tracking-wider text-emerald-100 uppercase dark:text-emerald-200"
			>
				Robot Types
			</DropdownMenu.GroupHeading>

			{#each robotTypes as robotType}
				{@const urdfConfig = robotUrdfConfigMap[robotType]}
				<DropdownMenu.Item
					class={[
						"group group cursor-pointer bg-emerald-500 text-white transition-all duration-200",
						"data-highlighted:bg-emerald-600 dark:bg-emerald-600 dark:data-highlighted:bg-emerald-700"
					]}
					onclick={async () => await addRobot(robotType)}
				>
					<span
						class={[
							urdfConfig.icon || "icon-[mdi--robot-industrial]",
							"mr-3 size-4 text-emerald-100 transition-colors duration-200 dark:text-emerald-200"
						]}
					></span>
					<div class="flex flex-1 flex-col">
						<span class="font-medium text-white transition-colors duration-200"
							>{urdfConfig.displayName || robotType.replace(/-/g, " ").toUpperCase()}</span
						>
						<span
							class="text-xs text-emerald-100 transition-colors duration-200 dark:text-emerald-200"
						>
							{urdfConfig.description || "Robot"}
						</span>
					</div>
					{#if urdfConfig.isDefault}
						<Badge
							variant="secondary"
							class="ml-2 bg-emerald-600 text-xs text-emerald-100 group-data-highlighted:bg-emerald-300 group-data-highlighted:text-emerald-900 dark:bg-emerald-700 dark:text-emerald-100 dark:group-data-highlighted:bg-emerald-400 dark:group-data-highlighted:text-emerald-900"
						>
							Default
						</Badge>
					{/if}
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Group>
	</DropdownMenu.Content>
</DropdownMenu.Root>
