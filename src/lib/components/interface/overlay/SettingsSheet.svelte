<script lang="ts">
	import * as Sheet from "@/components/ui/sheet";
	import { Separator } from "@/components/ui/separator";
	import { setMode, mode } from "mode-watcher";
	import { Switch } from "@/components/ui/switch";
	import { Label } from "@/components/ui/label";
	import { Input } from "@/components/ui/input";
	import { Button } from "@/components/ui/button";
	import { settings } from "$lib/runes/settings.svelte";
	import { remoteComputeManager } from "$lib/elements/compute/RemoteComputeManager.svelte";
	import { toast } from "svelte-sonner";

	interface Props {
		open?: boolean;
	}

	let { open = $bindable(false) }: Props = $props();

	interface LocalSettings {
		showFPS: boolean;
		renderQuality: number;
		animationSpeed: number;
	}

	let localSettings = $state<LocalSettings>({
		showFPS: false,
		renderQuality: 75,
		animationSpeed: 1
	});

	let isCheckingInferenceConnection = $state(false);
	let inferenceConnectionStatus = $state<"unknown" | "connected" | "disconnected">("unknown");

	let isCheckingTransportConnection = $state(false);
	let transportConnectionStatus = $state<"unknown" | "connected" | "disconnected">("unknown");

	async function checkInferenceServerConnection() {
		isCheckingInferenceConnection = true;
		try {
			const result = await remoteComputeManager.checkServerHealth();
			if (result.success) {
				inferenceConnectionStatus = "connected";
				toast.success("Inference server is connected");
			} else {
				inferenceConnectionStatus = "disconnected";
				toast.error(`Connection failed: ${result.error}`);
			}
		} catch (error) {
			inferenceConnectionStatus = "disconnected";
			toast.error("Failed to connect to inference server");
		} finally {
			isCheckingInferenceConnection = false;
		}
	}

	async function checkTransportServerConnection() {
		isCheckingTransportConnection = true;
		try {
			// Test transport server health by making a simple HTTP request
			const response = await fetch(`${settings.transportServerUrl}/health`, {
				method: "GET",
				headers: {
					Accept: "application/json"
				}
			});

			if (response.ok) {
				transportConnectionStatus = "connected";
				toast.success("Transport server is connected");
			} else {
				transportConnectionStatus = "disconnected";
				toast.error(`Transport server returned status: ${response.status}`);
			}
		} catch (error) {
			transportConnectionStatus = "disconnected";
			toast.error("Failed to connect to transport server");
		} finally {
			isCheckingTransportConnection = false;
		}
	}

	$effect(() => {
		console.log("render_interface");
	});
</script>

<!-- Settings Sheet -->
<Sheet.Root bind:open>
	<Sheet.Content
		side="left"
		class="w-80 gap-0 border-r border-slate-300 bg-gradient-to-b from-slate-100 to-slate-200 p-0 text-slate-900 sm:w-96 dark:border-slate-600 dark:bg-gradient-to-b dark:from-slate-700 dark:to-slate-800 dark:text-white"
	>
		<!-- Header -->
		<Sheet.Header
			class="border-b border-slate-300 bg-slate-200/80 p-6 backdrop-blur-sm dark:border-slate-600 dark:bg-slate-700/80"
		>
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-3">
					<span class="icon-[mdi--cog] size-6 text-orange-500 dark:text-orange-400"></span>
					<div>
						<Sheet.Title class="text-xl font-semibold text-slate-900 dark:text-slate-100"
							>Robot Settings</Sheet.Title
						>
						<p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
							Configure application preferences
						</p>
					</div>
				</div>
			</div>
		</Sheet.Header>

		<!-- Content -->
		<div
			class="scrollbar-thin scrollbar-track-slate-300 scrollbar-thumb-slate-400 dark:scrollbar-track-slate-700 dark:scrollbar-thumb-slate-500 flex-1 overflow-y-auto px-4"
		>
			<div class="space-y-6 py-4">
				<!-- Server Configuration -->
				<div class="space-y-4">
					<div class="mb-3 flex items-center gap-3">
						<span class="icon-[mdi--server] size-5 text-blue-500 dark:text-blue-400"></span>
						<h3 class="text-lg font-medium text-slate-900 dark:text-slate-100">
							Server Configuration
						</h3>
					</div>

					<div class="space-y-4">
						<div class="space-y-3">
							<div class="space-y-1">
								<Label class="text-sm font-medium text-slate-800 dark:text-slate-200"
									>Inference Server URL</Label
								>
								<p class="text-xs text-slate-600 dark:text-slate-400">
									URL for the remote AI inference server to run policies using remote compute resources
								</p>
							</div>
							<div class="flex gap-2">
								<Input
									bind:value={settings.inferenceServerUrl}
									class="flex-1 border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
								/>
								<Button
									variant="outline"
									size="sm"
									onclick={checkInferenceServerConnection}
									disabled={isCheckingInferenceConnection}
									class="border-slate-300 text-slate-700 hover:bg-slate-200 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
								>
									{#if isCheckingInferenceConnection}
										<span class="icon-[mdi--loading] mr-1 size-4 animate-spin"></span>
										Testing...
									{:else}
										<span class="icon-[mdi--connection] mr-1 size-4"></span>
										Test
									{/if}
								</Button>
							</div>
							<div class="flex items-center gap-2">
								{#if inferenceConnectionStatus === "connected"}
									<span class="icon-[mdi--check-circle] size-4 text-green-500 dark:text-green-400"
									></span>
									<span class="text-xs text-green-600 dark:text-green-400"
										>Connected to inference server</span
									>
								{:else if inferenceConnectionStatus === "disconnected"}
									<span class="icon-[mdi--close-circle] size-4 text-red-500 dark:text-red-400"
									></span>
									<span class="text-xs text-red-600 dark:text-red-400"
										>Cannot connect to inference server</span
									>
								{:else}
									<span class="icon-[mdi--help-circle] size-4 text-slate-500 dark:text-slate-400"
									></span>
									<span class="text-xs text-slate-600 dark:text-slate-400"
										>Connection status unknown</span
									>
								{/if}
							</div>
						</div>

						<div class="space-y-3">
							<div class="space-y-1">
								<Label class="text-sm font-medium text-slate-800 dark:text-slate-200"
									>Transport Server URL</Label
								>
								<p class="text-xs text-slate-600 dark:text-slate-400">
									URL for the transport server that manages communication rooms and routes video
									streams and robot data using consumer/producer system
								</p>
							</div>
							<div class="flex gap-2">
								<Input
									bind:value={settings.transportServerUrl}
									class="flex-1 border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
								/>
								<Button
									variant="outline"
									size="sm"
									onclick={checkTransportServerConnection}
									disabled={isCheckingTransportConnection}
									class="border-slate-300 text-slate-700 hover:bg-slate-200 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700"
								>
									{#if isCheckingTransportConnection}
										<span class="icon-[mdi--loading] mr-1 size-4 animate-spin"></span>
										Testing...
									{:else}
										<span class="icon-[mdi--connection] mr-1 size-4"></span>
										Test
									{/if}
								</Button>
							</div>
							<div class="flex items-center gap-2">
								{#if transportConnectionStatus === "connected"}
									<span class="icon-[mdi--check-circle] size-4 text-green-500 dark:text-green-400"
									></span>
									<span class="text-xs text-green-600 dark:text-green-400"
										>Connected to transport server</span
									>
								{:else if transportConnectionStatus === "disconnected"}
									<span class="icon-[mdi--close-circle] size-4 text-red-500 dark:text-red-400"
									></span>
									<span class="text-xs text-red-600 dark:text-red-400"
										>Cannot connect to transport server</span
									>
								{:else}
									<span class="icon-[mdi--help-circle] size-4 text-slate-500 dark:text-slate-400"
									></span>
									<span class="text-xs text-slate-600 dark:text-slate-400"
										>Connection status unknown</span
									>
								{/if}
							</div>
						</div>
					</div>
				</div>

				<Separator class="bg-slate-300 dark:bg-slate-600" />

				<!-- Application Settings -->
				<div class="space-y-4">
					<div class="mb-3 flex items-center gap-3">
						<span class="icon-[mdi--tune] size-5 text-orange-500 dark:text-orange-400"></span>
						<h3 class="text-lg font-medium text-slate-900 dark:text-slate-100">
							Application Settings
						</h3>
					</div>

					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<div class="space-y-1">
								<Label class="text-sm font-medium text-slate-800 dark:text-slate-200"
									>Dark Mode</Label
								>
								<p class="text-xs text-slate-600 dark:text-slate-400">
									Use dark theme for the interface
								</p>
							</div>
							<Switch
								checked={mode.current === "dark"}
								onCheckedChange={(checked) => setMode(checked ? "dark" : "light")}
							/>
						</div>

						<!-- <div class="flex items-center justify-between">
							<div class="space-y-1">
								<Label class="text-sm font-medium text-slate-800 dark:text-slate-200">Show FPS</Label>
								<p class="text-xs text-slate-600 dark:text-slate-400">Display frame rate counter</p>
							</div>
							<Switch bind:checked={localSettings.showFPS} />
						</div>

						<div class="space-y-3">
							<div class="space-y-1">
								<Label class="text-sm font-medium text-slate-800 dark:text-slate-200">Render Quality</Label>
								<p class="text-xs text-slate-600 dark:text-slate-400">
									Adjust 3D rendering quality ({localSettings.renderQuality}%)
								</p>
							</div>
							<input
								type="range"
								min="25"
								max="100"
								step="5"
								bind:value={localSettings.renderQuality}
								class="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-300 dark:bg-slate-600"
							/>
							<div class="flex justify-between text-xs text-slate-500">
								<span>25%</span>
								<span>100%</span>
							</div>
						</div>

						<div class="space-y-3">
							<div class="space-y-1">
								<Label class="text-sm font-medium text-slate-800 dark:text-slate-200">Animation Speed</Label>
								<p class="text-xs text-slate-600 dark:text-slate-400">
									Robot movement animation speed ({localSettings.animationSpeed}x)
								</p>
							</div>
							<input
								type="range"
								min="0.1"
								max="3"
								step="0.1"
								bind:value={localSettings.animationSpeed}
								class="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-300 dark:bg-slate-600"
							/>
							<div class="flex justify-between text-xs text-slate-500">
								<span>0.1x</span>
								<span>3x</span>
							</div>
						</div> -->
					</div>
				</div>

				<Separator class="bg-slate-300 dark:bg-slate-600" />

				<!-- About Section -->
				<div class="space-y-4">
					<div class="mb-3 flex items-center gap-3">
						<span class="icon-[mdi--information-outline] size-5 text-blue-500 dark:text-blue-400"
						></span>
						<h3 class="text-lg font-medium text-slate-900 dark:text-slate-100">About</h3>
					</div>

					<div class="space-y-4">
						<div class="space-y-2">
							<h4 class="text-sm font-medium text-slate-800 dark:text-slate-200">
								Acknowledgements
							</h4>
							<p class="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
								This application is built with amazing open-source technologies and communities.
							</p>
						</div>

						<div class="space-y-3">
							<!-- Hugging Face LeRobot -->
							<a
								href="https://github.com/huggingface/lerobot"
								target="_blank"
								rel="noopener noreferrer"
								class="flex items-center gap-3 rounded-lg border border-slate-300 bg-slate-100/50 p-3 transition-colors duration-200 hover:bg-slate-200/50 dark:border-slate-600 dark:bg-slate-800/50 dark:hover:bg-slate-700/50"
							>
								<span class="icon-[mdi--robot] size-5 text-yellow-500 dark:text-yellow-400"></span>
								<div class="flex-1">
									<div class="text-sm font-medium text-slate-800 dark:text-slate-200">
										Hugging Face LeRobot
									</div>
									<p class="text-xs text-slate-600 dark:text-slate-400">
										Robotics AI framework and models
									</p>
								</div>
							</a>

							<!-- Threlte -->
							<a
								href="https://threlte.xyz"
								target="_blank"
								rel="noopener noreferrer"
								class="flex items-center gap-3 rounded-lg border border-slate-300 bg-slate-100/50 p-3 transition-colors duration-200 hover:bg-slate-200/50 dark:border-slate-600 dark:bg-slate-800/50 dark:hover:bg-slate-700/50"
							>
								<span class="icon-[mdi--cube-outline] size-5 text-orange-500 dark:text-orange-400"
								></span>
								<div class="flex-1">
									<div class="text-sm font-medium text-slate-800 dark:text-slate-200">Threlte</div>
									<p class="text-xs text-slate-600 dark:text-slate-400">
										3D graphics library for Svelte
									</p>
								</div>
							</a>

							<!-- feetech.js -->
							<a
								href="https://bambot.org"
								target="_blank"
								rel="noopener noreferrer"
								class="flex items-center gap-3 rounded-lg border border-slate-300 bg-slate-100/50 p-3 transition-colors duration-200 hover:bg-slate-200/50 dark:border-slate-600 dark:bg-slate-800/50 dark:hover:bg-slate-700/50"
							>
								<span class="icon-[mdi--memory] size-5 text-green-500 dark:text-green-400"></span>
								<div class="flex-1">
									<div class="text-sm font-medium text-slate-800 dark:text-slate-200">
										bambot.org feetech.js
									</div>
									<p class="text-xs text-slate-600 dark:text-slate-400">
										Amazing project by Tim Qian (https://x.com/tim_qian). Most of the USB control
										part (feetech.js) comes from this project. Thanks to Tim for sharing his work!
									</p>
								</div>
							</a>

							<!-- URDF Viewer -->
							<a
								href="https://github.com/brean/urdf-viewer"
								target="_blank"
								rel="noopener noreferrer"
								class="flex items-center gap-3 rounded-lg border border-slate-300 bg-slate-100/50 p-3 transition-colors duration-200 hover:bg-slate-200/50 dark:border-slate-600 dark:bg-slate-800/50 dark:hover:bg-slate-700/50"
							>
								<span class="icon-[mdi--cube-outline] size-5 text-orange-500 dark:text-orange-400"
								></span>
								<div class="flex-1">
									<div class="text-sm font-medium text-slate-800 dark:text-slate-200">
										URDF Viewer
									</div>
									<p class="text-xs text-slate-600 dark:text-slate-400">
										Nice component for viewing URDF models with Threlte
									</p>
								</div>
							</a>
						</div>
					</div>
				</div>
			</div>
		</div>
	</Sheet.Content>
</Sheet.Root>

<style>
	:global(.slider::-webkit-slider-thumb) {
		appearance: none;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #f97316; /* orange-500 */
		cursor: pointer;
		border: 2px solid #1e293b;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		transition: all 0.15s ease;
	}

	:global(.slider::-webkit-slider-thumb:hover) {
		background: #ea580c; /* orange-600 */
		transform: scale(1.1);
	}

	:global(.slider::-moz-range-thumb) {
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: #f97316; /* orange-500 */
		cursor: pointer;
		border: 2px solid #1e293b;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
		transition: all 0.15s ease;
	}

	:global(.slider::-moz-range-track) {
		height: 6px;
		background: #374151;
		border-radius: 3px;
		border: none;
	}

	:global(.slider:focus) {
		box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.5);
	}
</style>
