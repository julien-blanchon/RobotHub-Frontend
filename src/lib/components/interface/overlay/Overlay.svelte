<script lang="ts">
	import AddRobotButton from "@/components/interface/overlay/AddRobotButton.svelte";
	import AddSensorButton from "@/components/interface/overlay/AddSensorButton.svelte";
	import AddAIButton from "@/components/interface/overlay/AddAIButton.svelte";
	import SettingsButton from "@/components/interface/overlay/SettingsButton.svelte";
	import SettingsSheet from "@/components/interface/overlay/SettingsSheet.svelte";

	interface Props {
		addRobotDropdownMenuOpen?: boolean;
		addSensorDropdownMenuOpen?: boolean;
		addAIDropdownMenuOpen?: boolean;
		settingsOpen?: boolean;
	}

	let {
		addRobotDropdownMenuOpen = $bindable(false),
		addSensorDropdownMenuOpen = $bindable(false),
		addAIDropdownMenuOpen = $bindable(false),
		settingsOpen = $bindable(false)
	}: Props = $props();
</script>

<div class="select-none">
	<!-- Button Bar Container -->
	<div class="fixed top-4 left-4 z-50 flex gap-2 select-none">
		<!-- Add Robot Button Group -->
		<div class="flex items-center justify-center gap-2 overflow-hidden rounded-lg shadow-lg">
			<!-- Logo/Favicon -->
			<div class="flex items-center justify-center">
				<!-- From /favicon_1024.png -->
				<img src="/favicon_1024.png" alt="Logo" draggable="false" class="h-10 w-10 invert" />
			</div>
			<!-- Add robot button and dropdown menu (Top Left) -->
			<div class="flex items-center justify-center">
				<AddRobotButton bind:open={addRobotDropdownMenuOpen} />
			</div>
		</div>

		<!-- Add Sensor Button Group -->
		<div class="flex items-center justify-center overflow-hidden rounded-lg shadow-lg">
			<!-- Add sensor button and dropdown menu -->
			<div class="flex items-center justify-center">
				<AddSensorButton bind:open={addSensorDropdownMenuOpen} />
			</div>
		</div>

		<!-- Add AI Button Group -->
		<div class="flex items-center justify-center overflow-hidden rounded-lg shadow-lg">
			<!-- Add AI button and dropdown menu -->
			<div class="flex items-center justify-center">
				<AddAIButton bind:open={addAIDropdownMenuOpen} />
			</div>
		</div>
	</div>

	<div class="fixed top-4 right-4 z-50">
		<!-- Settings Button and Sheet (Top Right, Left Side) -->
		<SettingsButton bind:open={settingsOpen} />
	</div>
</div>
<SettingsSheet bind:open={settingsOpen} />
