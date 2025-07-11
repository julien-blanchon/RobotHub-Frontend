<!-- USB Calibration Panel - Compact Modal Version -->
<script lang="ts">
	import { Button } from "@/components/ui/button/index.js";
	import { Badge } from "@/components/ui/badge/index.js";

	interface Props {
		calibrationManager: any; // USBServoDriver (Consumer or Producer)
		connectionType?: "consumer" | "producer";
		onCalibrationComplete?: () => void;
		onCancel?: () => void;
	}

	let {
		calibrationManager,
		connectionType = "consumer",
		onCalibrationComplete,
		onCancel
	}: Props = $props();

	// Joint names for reference
	const jointNames = ["Rotation", "Pitch", "Elbow", "Wrist_Pitch", "Wrist_Roll", "Jaw"];

	// Reactive getters from the calibration state
	const isCalibrating = $derived(calibrationManager.calibrationState.isCalibrating);
	const progress = $derived(calibrationManager.calibrationState.progress);
	const isCalibrated = $derived(calibrationManager.calibrationState.isCalibrated);
	const needsCalibration = $derived(calibrationManager.calibrationState.needsCalibration);

	// Connection type descriptions
	const connectionInfo = $derived(
		connectionType === "producer"
			? {
					lockStatus: "🔒 Servos will be LOCKED for control",
					lockDescription: "Robot controlled by software"
				}
			: {
					lockStatus: "🔓 Servos remain UNLOCKED for manual movement",
					lockDescription: "Robot can be moved manually"
				}
	);

	async function startCalibration() {
		await calibrationManager.startCalibration();
	}

	async function completeCalibration() {
		await calibrationManager.completeCalibration();
		if (onCalibrationComplete) {
			onCalibrationComplete();
		}
	}

	function skipCalibration() {
		calibrationManager.skipCalibration();
		if (onCalibrationComplete) {
			onCalibrationComplete();
		}
	}

	async function usePredefinedCalibration() {
		try {
			await calibrationManager.setPredefinedCalibration();
			if (onCalibrationComplete) {
				onCalibrationComplete();
			}
		} catch (error) {
			console.error("Failed to set predefined calibration:", error);
			// The error will be handled by the parent component's error handling
		}
	}

	function handleCancel() {
		if (isCalibrating) {
			calibrationManager.cancelCalibration();
		}
		if (onCancel) {
			onCancel();
		}
	}
</script>

<div class="space-y-4">
	{#if isCalibrating}
		<!-- Calibrating State -->
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-2">
					<div class="h-2 w-2 animate-pulse rounded-full bg-green-500"></div>
					<span class="text-sm font-medium text-green-300">Recording movements...</span>
					<Badge variant="secondary" class="text-xs">{Math.round(progress)}%</Badge>
				</div>
				<div class="flex gap-2">
					<Button variant="default" size="sm" onclick={completeCalibration}>Complete</Button>
					<Button variant="outline" size="sm" onclick={handleCancel}>Cancel</Button>
				</div>
			</div>

			<!-- Compact progress bar -->
			<div class="h-1.5 w-full rounded-full bg-slate-700">
				<div
					class="h-1.5 rounded-full bg-green-500 transition-all duration-100"
					style="width: {progress}%"
				></div>
			</div>

			<!-- Compact joint grid with scrollable area -->
			<div class="max-h-48 overflow-y-auto">
				<div class="grid grid-cols-2 gap-2">
					{#each jointNames as jointName}
						{@const currentValue = calibrationManager.calibrationState.getCurrentValue(jointName)}
						{@const calibration =
							calibrationManager.calibrationState.getJointCalibration(jointName)}

						<div class="space-y-1 rounded bg-slate-700/50 p-2">
							<div class="flex items-center justify-between">
								<span class="text-xs font-medium text-slate-300">{jointName}</span>
								<span class="font-mono text-xs text-green-400"
									>{calibrationManager.calibrationState.formatServoValue(currentValue)}</span
								>
							</div>

							<div class="flex justify-between text-xs text-slate-500">
								<span
									>Min: {calibrationManager.calibrationState.formatServoValue(
										calibration?.minServoValue
									)}</span
								>
								<span
									>Max: {calibrationManager.calibrationState.formatServoValue(
										calibration?.maxServoValue
									)}</span
								>
							</div>

							{#if calibration?.minServoValue !== undefined && calibration?.maxServoValue !== undefined && currentValue !== undefined}
								<div class="relative h-1 overflow-hidden rounded-full bg-slate-600">
									<div
										class="absolute top-0 left-0 h-full bg-green-500 transition-all duration-50"
										style="width: {Math.max(
											0,
											Math.min(
												100,
												((currentValue - calibration.minServoValue) /
													(calibration.maxServoValue - calibration.minServoValue)) *
													100
											)
										)}%"
									></div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>

			<div class="text-xs text-slate-500">Move each joint through its full range of motion</div>
		</div>
	{:else if isCalibrated}
		<!-- Calibrated State -->
		<div class="space-y-3">
			<div class="flex items-center gap-2">
				<Badge variant="default" class="bg-green-600">✓ Calibrated</Badge>
				<span class="text-sm text-green-300">Ready to connect</span>
			</div>

			<!-- Servo lock status -->
			<div class="rounded-lg border border-slate-600 bg-slate-700/30 p-3">
				<div class="mb-1 flex items-center gap-2">
					<span class="text-sm font-medium text-slate-300">{connectionInfo.lockStatus}</span>
				</div>
				<div class="text-xs text-slate-500">{connectionInfo.lockDescription}</div>
			</div>

			<!-- Compact calibration summary -->
			<div class="max-h-32 overflow-y-auto">
				<div class="grid grid-cols-2 gap-1">
					{#each jointNames as jointName}
						{@const calibration =
							calibrationManager.calibrationState.getJointCalibration(jointName)}
						{@const range = calibrationManager.calibrationState.getJointRange(jointName)}

						<div class="flex items-center justify-between rounded bg-slate-700/30 p-2 text-xs">
							<span class="font-medium text-slate-300">{jointName}</span>
							<span class="font-mono text-slate-400">{range}</span>
						</div>
					{/each}
				</div>
			</div>

			<div class="flex gap-2">
				<Button onclick={() => onCalibrationComplete?.()} class="flex-1" size="sm">
					Connect {connectionType === "producer" ? "Producer" : "Consumer"}
				</Button>
				<Button variant="outline" size="sm" onclick={startCalibration}>Redo</Button>
			</div>
		</div>
	{:else}
		<!-- Initial State - Need Calibration -->
		<div class="space-y-3">
			<div class="flex items-center gap-2">
				<Badge variant="destructive">Needs Calibration</Badge>
				<span class="text-sm text-slate-300">Required for USB connection</span>
			</div>

			<!-- Compact instructions -->
			<div class="rounded-lg border border-yellow-500/30 bg-yellow-900/20 p-3">
				<div class="mb-2 text-sm text-yellow-300">Quick Setup Options:</div>
				<ol class="space-y-1 text-xs text-yellow-200">
					<li>1. Position robot in neutral pose</li>
					<li>2. Start calibration and move each joint fully</li>
					<li>3. Complete when all joints show good ranges</li>
				</ol>
			</div>

			<!-- Connection type info -->
			<div class="rounded-lg border border-slate-600 bg-slate-700/30 p-3">
				<div class="mb-1 text-sm font-medium text-slate-300">After calibration:</div>
				<div class="text-xs text-slate-500">{connectionInfo.lockStatus}</div>
			</div>

			<div class="flex gap-2">
				<Button onclick={startCalibration} class="flex-1" size="sm">Start Calibration</Button>
				<Button variant="secondary" size="sm" onclick={usePredefinedCalibration}>Use Preset</Button>
				<Button variant="outline" size="sm" onclick={skipCalibration}>Skip</Button>
			</div>
		</div>
	{/if}
</div>
