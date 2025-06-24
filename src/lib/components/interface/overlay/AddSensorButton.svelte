<script lang="ts">
	import { Button } from "@/components/ui/button";
	import { Badge } from "@/components/ui/badge";
	import * as DropdownMenu from "@/components/ui/dropdown-menu";
	import { toast } from "svelte-sonner";
	import { cn } from "$lib/utils";
	import { generateName } from "@/utils/generateName";
	import { videoManager } from "$lib/elements/video//VideoManager.svelte";

	interface Props {
		open: boolean;
	}
	let { open = $bindable() }: Props = $props();

	interface SensorConfig {
		id: string;
		label: string;
		description: string;
		icon: string;
		enabled: boolean;
		isDefault?: boolean;
	}

	const sensorConfigs: SensorConfig[] = [
		{ 
			id: 'camera', 
			label: 'Camera', 
			description: 'Video Camera Sensor',
			icon: 'icon-[mdi--camera]', 
			enabled: true,
			isDefault: true
		},
		{ 
			id: 'lidar', 
			label: 'Lidar', 
			description: 'Distance Sensor',
			icon: 'icon-[mdi--radar]', 
			enabled: false 
		},
		{ 
			id: 'imu', 
			label: 'IMU', 
			description: 'Motion Sensor',
			icon: 'icon-[mdi--radar]', 
			enabled: false 
		}
	];

	async function addSensor(sensorType: string) {
		try {
			// Basic validation
			if (!sensorType) return;

			const sensorId = `${sensorType}_${Date.now()}`;
			
			if (sensorType === "camera") {
				// Create video camera
				const video = videoManager.createVideo(sensorId);
				toast.success("Video Camera Added", {
					description: `Video camera ${sensorId.slice(0, 12)}... created successfully.`
				});
			} else {
				// Placeholder for other sensor types
				const config = sensorConfigs.find(c => c.id === sensorType);
				toast.success("Sensor Added", {
					description: `${config?.label || sensorType} sensor ${sensorId.slice(0, 12)}... created successfully.`
				});
			}

			open = false; // Close dropdown on success
		} catch (error) {
			console.error("Sensor creation failed:", error);
			toast.error("Failed to Add Sensor", {
				description: `Could not create ${sensorType} sensor: ${error}`
			});
		}
	}

	async function quickAddCamera() {
		await addSensor("camera");
	}
</script>

<!-- Main Add Button (Camera) -->
<Button
	variant="default"
	size="sm"
	onclick={quickAddCamera}
	class="group rounded-r-none border-0 bg-blue-600 text-white transition-all duration-200 hover:bg-blue-500"
>
	<span
		class={[
			"mr-2 size-4 transition-transform duration-200",
			"icon-[mdi--plus] group-hover:rotate-90"
		]}
	></span>
	Add Sensor
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
					"rounded-l-none border-0 border-l border-blue-500/30 bg-blue-600 px-2 text-white transition-all duration-200 hover:bg-blue-500",
					open && "bg-blue-700 shadow-inner"
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
		class="w-56 border-blue-500/30 bg-blue-600 backdrop-blur-sm"
		align="center"
	>
		<DropdownMenu.Group>
			<DropdownMenu.GroupHeading
				class="text-xs font-semibold tracking-wider text-blue-200 uppercase"
			>
				Sensor Types
			</DropdownMenu.GroupHeading>

			{#each sensorConfigs as sensor}
				<DropdownMenu.Item
					class={[
						"group group cursor-pointer bg-blue-600 text-white transition-all duration-200",
						"data-highlighted:bg-blue-700"
					]}
					disabled={!sensor.enabled}
					onclick={async () => await addSensor(sensor.id)}
				>
					<span
						class={[
							sensor.icon,
							"mr-3 size-4 text-blue-200 transition-colors duration-200"
						]}
					></span>
					<div class="flex flex-1 flex-col">
						<span class="font-medium text-white transition-colors duration-200"
							>{sensor.label}</span
						>
						<span class="text-xs text-blue-200 transition-colors duration-200">
							{sensor.description}
						</span>
					</div>
					{#if sensor.isDefault}
						<Badge
							variant="secondary"
							class="ml-2 bg-blue-700 text-xs text-blue-100 group-data-highlighted:bg-blue-400 group-data-highlighted:text-blue-900"
						>
							Default
						</Badge>
					{/if}
				</DropdownMenu.Item>
			{/each}
		</DropdownMenu.Group>
	</DropdownMenu.Content>
</DropdownMenu.Root> 