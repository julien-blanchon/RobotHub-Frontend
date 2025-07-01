<script lang="ts">
	import AddRobotButton from "@/components/interface/overlay/AddRobotButton.svelte";
	import AddSensorButton from "@/components/interface/overlay/AddSensorButton.svelte";
	import AddAIButton from "@/components/interface/overlay/AddAIButton.svelte";
	import SettingsButton from "@/components/interface/overlay/SettingsButton.svelte";
	import SettingsSheet from "@/components/interface/overlay/SettingsSheet.svelte";
	import WorkspaceIdButton from "@/components/interface/overlay/WorkspaceIdButton.svelte";

	interface Props {
		workspaceId: string;
		addRobotDropdownMenuOpen?: boolean;
		addSensorDropdownMenuOpen?: boolean;
		addAIDropdownMenuOpen?: boolean;
		settingsOpen?: boolean;
		workspaceIdMenuOpen?: boolean;
	}

	let {
		workspaceId,
		addRobotDropdownMenuOpen = $bindable(false),
		addSensorDropdownMenuOpen = $bindable(false),
		addAIDropdownMenuOpen = $bindable(false),
		settingsOpen = $bindable(false),
		workspaceIdMenuOpen = $bindable(false)
	}: Props = $props();
</script>

<div class="select-none">
	<!-- Responsive Button Bar Container -->
	<div class="fixed top-2 left-2 right-2 z-50 flex flex-wrap items-center justify-between gap-1 select-none md:top-4 md:left-4 md:right-4 md:gap-2">
		<!-- Left Group: Logo + Add Buttons -->
		<div class="flex items-center gap-1 flex-wrap md:gap-2">
			<!-- Logo/Favicon -->
			<div class="flex items-center justify-center">
				<img
					src="/favicon_1024.png"
					alt="Logo"
					draggable="false"
					class="h-8 w-8 invert-0 filter dark:invert md:h-10 md:w-10"
				/>
			</div>
			
			<!-- Add Robot Button Group -->
			<div class="flex items-center justify-center overflow-hidden rounded-lg">
				<AddRobotButton bind:open={addRobotDropdownMenuOpen} />
			</div>

			<!-- Add Sensor Button Group - Hidden on very small screens -->
			<div class="hidden min-[480px]:flex items-center justify-center overflow-hidden rounded-lg">
				<AddSensorButton bind:open={addSensorDropdownMenuOpen} />
			</div>

			<!-- Add AI Button Group - Hidden on small screens -->
			<div class="hidden min-[560px]:flex items-center justify-center overflow-hidden rounded-lg">
				<AddAIButton bind:open={addAIDropdownMenuOpen} workspaceId={workspaceId} />
			</div>
		</div>

		<!-- Right Group: Workspace ID + Settings -->
		<div class="flex items-center gap-1 md:gap-2">
			<!-- Workspace ID Button -->
			<WorkspaceIdButton {workspaceId} bind:open={workspaceIdMenuOpen} />

			<!-- Settings Button -->
			<SettingsButton bind:open={settingsOpen} />
		</div>
	</div>
</div>
<SettingsSheet bind:open={settingsOpen} />
