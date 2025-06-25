<script lang="ts">
	import * as Sheet from "@/components/ui/sheet";
	import { Button } from "@/components/ui/button";
	import * as Alert from "@/components/ui/alert";
	import { Badge } from "@/components/ui/badge";
	import { toast } from "svelte-sonner";
	import type { Robot } from "$lib/elements/robot/Robot.svelte.js";

	interface Props {
		workspaceId: string;
		open: boolean;
		robot: Robot;
	}

	let { open = $bindable(), robot, workspaceId }: Props = $props();
</script>

<Sheet.Root bind:open>
	<Sheet.Content
		trapFocus={false}
		side="right"
		class="w-80 gap-0 border-l border-slate-300 bg-gradient-to-b from-slate-100 to-slate-200 p-0 text-slate-900 sm:w-96 dark:border-slate-600 dark:bg-gradient-to-b dark:from-slate-700 dark:to-slate-800 dark:text-white"
	>
		<!-- Header -->
		<Sheet.Header
			class="border-b border-slate-300 bg-slate-200/80 p-6 backdrop-blur-sm dark:border-slate-600 dark:bg-slate-700/80"
		>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<span class="icon-[mdi--tune] size-6 text-purple-500 dark:text-purple-400"></span>
					<div>
						<Sheet.Title class="text-xl font-semibold text-slate-900 dark:text-slate-100"
							>Manual Control</Sheet.Title
						>
						<p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
							Direct robot joint manipulation
						</p>
					</div>
				</div>
			</div>
		</Sheet.Header>

		{#if robot}
			<!-- Content -->
			<div
				class="scrollbar-thin scrollbar-track-slate-300 scrollbar-thumb-slate-500 dark:scrollbar-track-slate-700 dark:scrollbar-thumb-slate-500 flex-1 overflow-y-auto px-4"
			>
				<div class="space-y-6 py-4">
					<!-- Manual Joint Controls -->
					{#if robot.isManualControlEnabled}
						<div class="space-y-4">
							<div class="mb-3 flex items-center gap-3">
								<span class="icon-[lucide--rotate-3d] size-5 text-purple-500 dark:text-purple-400"
								></span>
								<h3 class="text-lg font-medium text-slate-900 dark:text-slate-100">
									Joint Controls
								</h3>
								<Badge variant="default" class="ml-auto bg-purple-500 text-xs dark:bg-purple-600">
									{robot.jointArray.length}
								</Badge>
							</div>

							<p class="text-xs text-slate-600 dark:text-slate-400">
								Each joint can be moved independently using sliders. Values are normalized
								percentages.
							</p>

							{#if robot.jointArray.length === 0}
								<p class="py-4 text-center text-xs text-slate-600 italic dark:text-slate-500">
									No joints available
								</p>
							{:else}
								<div class="space-y-3">
									{#each robot.jointArray as joint (joint.name)}
										{@const isGripper =
											joint.name.toLowerCase() === "jaw" || joint.name.toLowerCase() === "gripper"}
										{@const minValue = isGripper ? 0 : -100}
										{@const maxValue = isGripper ? 100 : 100}

										<div
											class="space-y-2 rounded-lg border border-slate-300 bg-slate-100/50 p-3 dark:border-slate-600 dark:bg-slate-800/50"
										>
											<div class="flex items-center justify-between">
												<span class="text-sm font-medium text-slate-800 dark:text-slate-200"
													>{joint.name}</span
												>
												<div class="flex items-center gap-2 text-xs">
													<span class="font-mono text-purple-600 dark:text-purple-400">
														{joint.value.toFixed(1)}{isGripper ? "%" : "%"}
													</span>
													{#if joint.limits}
														<span class="font-mono text-[10px] text-slate-500 dark:text-slate-500">
															({joint.limits.lower.toFixed(1)}° to {joint.limits.upper.toFixed(1)}°)
														</span>
													{/if}
												</div>
											</div>
											<div class="space-y-1">
												<input
													type="range"
													min={minValue}
													max={maxValue}
													step="0.1"
													value={joint.value}
													oninput={(e) => {
														const val = parseFloat((e.target as HTMLInputElement).value);
														robot.updateJoint(joint.name, val);
													}}
													class="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-300 dark:bg-slate-600"
												/>
												<div
													class="flex justify-between text-xs text-slate-600 dark:text-slate-500"
												>
													<span>{minValue}{isGripper ? "% (closed)" : "%"}</span>
													<span>{maxValue}{isGripper ? "% (open)" : "%"}</span>
												</div>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{:else}
						<div class="space-y-4">
							<div class="mb-3 flex items-center gap-3">
								<h3 class="text-lg font-medium text-slate-900 dark:text-slate-100">
									Input Control Active
								</h3>
							</div>

							<Alert.Root
								class="border-purple-300/30 bg-purple-100/10 dark:border-purple-500/30 dark:bg-purple-500/10"
							>
								<Alert.Title class="text-sm text-purple-700 dark:text-purple-200"
									>Input Control Active</Alert.Title
								>
								<Alert.Description class="text-xs text-purple-700 dark:text-purple-300">
									Robot controlled by: <strong>{robot.consumer?.name || "External Input"}</strong
									><br />
									Disconnect input to enable manual control.
								</Alert.Description>
							</Alert.Root>
						</div>
					{/if}
				</div>
			</div>
		{/if}
	</Sheet.Content>
</Sheet.Root>

<style>
	/* Slider styling (classic <input type="range">) */
	.slider::-webkit-slider-thumb {
		appearance: none;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #a855f7;
		cursor: pointer;
		border: 2px solid #1e293b;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		transition: all 0.15s ease;
	}

	.slider::-webkit-slider-thumb:hover {
		background: #9333ea;
		transform: scale(1.1);
	}

	.slider::-moz-range-thumb {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: #a855f7;
		cursor: pointer;
		border: 2px solid #1e293b;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		transition: all 0.15s ease;
	}

	.slider::-moz-range-track {
		height: 6px;
		background: #374151;
		border-radius: 3px;
		border: none;
	}

	.slider:focus {
		box-shadow: 0 0 0 2px rgba(168, 85, 247, 0.5);
	}
</style>
