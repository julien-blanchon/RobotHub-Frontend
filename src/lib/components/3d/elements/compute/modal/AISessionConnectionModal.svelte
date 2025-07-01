<script lang="ts">
	import * as Dialog from "@/components/ui/dialog";
	import { Button } from "@/components/ui/button";
	import * as Card from "@/components/ui/card";
	import { Badge } from "@/components/ui/badge";
	import { Input } from "@/components/ui/input";
	import { Label } from "@/components/ui/label";
	import { Textarea } from "@/components/ui/textarea";
	import { remoteComputeManager, MODEL_TYPES } from "$lib/elements/compute";
	import type { RemoteCompute } from "$lib/elements/compute//RemoteCompute.svelte";
	import type { AISessionConfig } from "$lib/elements/compute//RemoteComputeManager.svelte";
	import { settings } from "$lib/runes/settings.svelte";
	import { toast } from "svelte-sonner";

	interface Props {
		workspaceId: string;
		open: boolean;
		compute: RemoteCompute;
	}

	let { open = $bindable(), compute, workspaceId }: Props = $props();

	let isConnecting = $state(false);
	let sessionId = $state("");
	let policyPath = $state("");
	let cameraNames = $state("");
	let languageInstruction = $state("");

	// Use the compute's model type (can't be changed here)
	const modelConfig = $derived(MODEL_TYPES[compute.modelType]);

	// Auto-generate session ID when modal opens
	$effect(() => {
		if (open && compute && !sessionId) {
			sessionId = `${compute.id}-session-${Date.now()}`;
		}
	});

	// Set defaults when modal opens
	$effect(() => {
		if (open && modelConfig) {
			if (!policyPath) {
				policyPath = modelConfig.defaultPolicyPath;
			}
			if (!cameraNames) {
				cameraNames = modelConfig.defaultCameraNames.join(", ");
			}
		}
	});

	async function handleCreateSession() {
		if (!compute) return;

		if (!sessionId.trim() || !policyPath.trim()) {
			toast.error("Please fill in all required fields");
			return;
		}

		if (modelConfig.requiresLanguageInstruction && !languageInstruction.trim()) {
			toast.error("Language instruction is required for this model type");
			return;
		}

		isConnecting = true;
		try {
			const cameras = cameraNames
				.split(",")
				.map((name) => name.trim())
				.filter((name) => name);
			if (cameras.length === 0) {
				cameras.push("front");
			}

			const sessionConfig: AISessionConfig = {
				sessionId: sessionId.trim(),
				modelType: compute.modelType,
				policyPath: policyPath.trim(),
				cameraNames: cameras,
				transportServerUrl: settings.transportServerUrl,
				workspaceId: workspaceId,
				languageInstruction: languageInstruction.trim() || undefined
			};

			const result = await remoteComputeManager.createSession(compute.id, sessionConfig);
			if (result.success) {
				toast.success(`${modelConfig.label} session created: ${sessionId}`);
				open = false;
			} else {
				toast.error(`Failed to create session: ${result.error}`);
			}
		} catch (error) {
			console.error("Session creation error:", error);
			toast.error("Failed to create session");
		} finally {
			isConnecting = false;
		}
	}

	async function handleStartSession() {
		if (!compute) return;

		isConnecting = true;
		try {
			const result = await remoteComputeManager.startSession(compute.id);
			if (result.success) {
				toast.success("Inference Session started");
			} else {
				toast.error(`Failed to start session: ${result.error}`);
			}
		} catch (error) {
			console.error("Session start error:", error);
			toast.error("Failed to start session");
		} finally {
			isConnecting = false;
		}
	}

	async function handleStopSession() {
		if (!compute) return;

		isConnecting = true;
		try {
			const result = await remoteComputeManager.stopSession(compute.id);
			if (result.success) {
				toast.success("Inference Session stopped");
			} else {
				toast.error(`Failed to stop session: ${result.error}`);
			}
		} catch (error) {
			console.error("Session stop error:", error);
			toast.error("Failed to stop session");
		} finally {
			isConnecting = false;
		}
	}

	async function handleDeleteSession() {
		if (!compute) return;

		isConnecting = true;
		try {
			const result = await remoteComputeManager.deleteSession(compute.id);
			if (result.success) {
				toast.success("Inference Session deleted");
			} else {
				toast.error(`Failed to delete session: ${result.error}`);
			}
		} catch (error) {
			console.error("Session delete error:", error);
			toast.error("Failed to delete session");
		} finally {
			isConnecting = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="max-h-[80vh] max-w-2xl overflow-y-auto border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
	>
		<Dialog.Header class="pb-3">
			<Dialog.Title
				class="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100"
			>
				<span class="{modelConfig.icon} size-5 text-purple-500 dark:text-purple-400"></span>
				{modelConfig.label} Session - {compute.name || "No Compute Selected"}
			</Dialog.Title>
			<Dialog.Description class="text-sm text-slate-600 dark:text-slate-400">
				Configure and manage {modelConfig.label} inference sessions for robot control
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4">
			<!-- Current Session Status -->
			<div
				class="flex items-center justify-between rounded-lg border border-purple-300/30 bg-purple-100/20 p-3 dark:border-purple-500/30 dark:bg-purple-900/20"
			>
				<div class="flex items-center gap-2">
					<span class="{modelConfig.icon} size-4 text-purple-500 dark:text-purple-400"></span>
					<span class="text-sm font-medium text-purple-700 dark:text-purple-300"
						>Session Status</span
					>
				</div>
				{#if compute.hasSession}
					<Badge variant="default" class="bg-purple-500 text-xs dark:bg-purple-600">
						{compute.statusInfo.statusText}
					</Badge>
				{:else}
					<Badge variant="secondary" class="text-xs text-slate-600 dark:text-slate-400"
						>No Session</Badge
					>
				{/if}
			</div>

			<!-- Current Session Details -->
			{#if compute.hasSession && compute.sessionData}
				<Card.Root
					class="border-purple-300/30 bg-purple-100/5 dark:border-purple-500/30 dark:bg-purple-500/5"
				>
					<Card.Header>
						<Card.Title
							class="flex items-center gap-2 text-base text-purple-700 dark:text-purple-200"
						>
							<span class="icon-[mdi--cog] size-4"></span>
							Current Session
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-3">
							<div
								class="rounded-lg border border-purple-300/30 bg-purple-100/20 p-3 dark:border-purple-500/30 dark:bg-purple-900/20"
							>
								<div class="grid grid-cols-2 gap-2 text-xs">
									<div>
										<span class="font-medium text-purple-700 dark:text-purple-300">Session ID:</span
										>
										<span class="block text-purple-800 dark:text-purple-100"
											>{compute.sessionId}</span
										>
									</div>
									<div>
										<span class="font-medium text-purple-700 dark:text-purple-300">Status:</span>
										<span class="block text-purple-800 dark:text-purple-100"
											>{compute.statusInfo.emoji} {compute.statusInfo.statusText}</span
										>
									</div>
									<div>
										<span class="font-medium text-purple-700 dark:text-purple-300">Policy:</span>
										<span class="block text-purple-800 dark:text-purple-100"
											>{compute.sessionConfig?.policyPath}</span
										>
									</div>
									<div>
										<span class="font-medium text-purple-700 dark:text-purple-300">Cameras:</span>
										<span class="block text-purple-800 dark:text-purple-100"
											>{compute.sessionConfig?.cameraNames.join(", ")}</span
										>
									</div>
								</div>
							</div>

							<!-- Connection Details -->
							<div
								class="rounded-lg border border-green-300/30 bg-green-100/20 p-3 dark:border-green-500/30 dark:bg-green-900/20"
							>
								<div class="mb-2 text-sm font-medium text-green-700 dark:text-green-300">
									📡 Inference Server Connections
								</div>
								<div class="space-y-1 text-xs">
									<div>
										<span class="text-green-600 dark:text-green-400">Workspace:</span>
										<span class="ml-2 font-mono text-green-700 dark:text-green-200"
											>{compute.sessionData.workspace_id}</span
										>
									</div>
									{#each Object.entries(compute.sessionData.camera_room_ids) as [camera, roomId]}
										<div>
											<span class="text-green-600 dark:text-green-400">📹 {camera}:</span>
											<span class="ml-2 font-mono text-green-700 dark:text-green-200">{roomId}</span
											>
										</div>
									{/each}
									<div>
										<span class="text-green-600 dark:text-green-400">📥 Joint Input:</span>
										<span class="ml-2 font-mono text-green-700 dark:text-green-200"
											>{compute.sessionData.joint_input_room_id}</span
										>
									</div>
									<div>
										<span class="text-green-600 dark:text-green-400">📤 Joint Output:</span>
										<span class="ml-2 font-mono text-green-700 dark:text-green-200"
											>{compute.sessionData.joint_output_room_id}</span
										>
									</div>
								</div>
							</div>

							<!-- Session Controls -->
							<div class="flex gap-2">
								{#if compute.canStart}
									<Button
										variant="default"
										size="sm"
										onclick={handleStartSession}
										disabled={isConnecting}
										class="bg-green-500 text-xs hover:bg-green-600 disabled:opacity-50 dark:bg-green-600 dark:hover:bg-green-700"
									>
										{#if isConnecting}
											<span class="icon-[mdi--loading] mr-1 size-3 animate-spin"></span>
											Starting...
										{:else}
											<span class="icon-[mdi--play] mr-1 size-3"></span>
											Start Inference
										{/if}
									</Button>
								{/if}
								{#if compute.canStop}
									<Button
										variant="secondary"
										size="sm"
										onclick={handleStopSession}
										disabled={isConnecting}
										class="text-xs disabled:opacity-50"
									>
										{#if isConnecting}
											<span class="icon-[mdi--loading] mr-1 size-3 animate-spin"></span>
											Stopping...
										{:else}
											<span class="icon-[mdi--stop] mr-1 size-3"></span>
											Stop Inference
										{/if}
									</Button>
								{/if}
								<Button
									variant="destructive"
									size="sm"
									onclick={handleDeleteSession}
									disabled={isConnecting}
									class="text-xs disabled:opacity-50"
								>
									{#if isConnecting}
										<span class="icon-[mdi--loading] mr-1 size-3 animate-spin"></span>
										Deleting...
									{:else}
										<span class="icon-[mdi--delete] mr-1 size-3"></span>
										Delete Session
									{/if}
								</Button>
							</div>
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Create New Session -->
			{#if !compute.hasSession}
				<Card.Root
					class="border-purple-300/30 bg-purple-100/5 dark:border-purple-500/30 dark:bg-purple-500/5"
				>
					<Card.Header>
						<Card.Title
							class="flex items-center gap-2 text-base text-purple-700 dark:text-purple-200"
						>
							<span class="icon-[mdi--plus-circle] size-4"></span>
							Create Inference Session
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<div class="space-y-4">
							<div class="space-y-2">
								<Label for="sessionId" class="text-purple-700 dark:text-purple-300"
									>Session ID</Label
								>
								<Input
									id="sessionId"
									bind:value={sessionId}
									placeholder="my-session-01"
									class="border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
								/>
							</div>
							<div class="space-y-2">
								<Label for="policyPath" class="text-purple-700 dark:text-purple-300"
									>Policy Path</Label
								>
								<Input
									id="policyPath"
									bind:value={policyPath}
									placeholder={modelConfig.defaultPolicyPath}
									class="border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
								/>
							</div>

							<div class="space-y-2">
								<Label for="cameraNames" class="text-purple-700 dark:text-purple-300"
									>Camera Names</Label
								>
								<Input
									id="cameraNames"
									bind:value={cameraNames}
									placeholder="front, wrist, overhead"
									class="border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
								/>
															<p class="text-xs text-slate-600 dark:text-slate-400">
								Comma-separated camera names
							</p>
							</div>

							{#if modelConfig.requiresLanguageInstruction}
								<div class="space-y-2">
									<Label for="languageInstruction" class="text-purple-700 dark:text-purple-300">
										Language Instruction
									</Label>
									<Textarea
										id="languageInstruction"
										bind:value={languageInstruction}
										placeholder="Pick up the red cup and place it on the table"
										class="border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
										rows={3}
									/>
									<p class="text-xs text-slate-600 dark:text-slate-400">
										Natural language instruction for the task (required for {modelConfig.label})
									</p>
								</div>
							{/if}

							<div class="rounded-lg border border-green-300/30 bg-green-100/20 p-3 dark:border-green-500/30 dark:bg-green-900/20">
								<div class="flex items-center gap-2">
									<span class="icon-[mdi--folder] size-4 text-green-600 dark:text-green-400"></span>
									<span class="text-sm font-medium text-green-700 dark:text-green-300">
										Workspace: {workspaceId}
									</span>
								</div>
								<p class="mt-1 text-xs text-green-600 dark:text-green-400">
									Session will be created in the current workspace
								</p>
							</div>

							<div
								class="rounded-lg border border-slate-300 bg-slate-50 p-3 dark:border-slate-600 dark:bg-slate-800"
							>
								<div class="text-xs text-slate-600 dark:text-slate-400">
									<span class="icon-[mdi--lightbulb] size-3"></span>
									<strong>Tip:</strong> This will create a new {modelConfig.label} inference session with dedicated rooms for camera
									inputs, joint inputs, and joint outputs in the inference server communication
									system.
								</div>
							</div>

							<Button
								variant="default"
								onclick={handleCreateSession}
								disabled={isConnecting || !sessionId.trim() || !policyPath.trim()}
								class="w-full bg-purple-500 hover:bg-purple-600 disabled:opacity-50 dark:bg-purple-600 dark:hover:bg-purple-700"
							>
								{#if isConnecting}
									<span class="icon-[mdi--loading] mr-2 size-4 animate-spin"></span>
									Creating Session...
								{:else}
									<span class="icon-[mdi--rocket-launch] mr-2 size-4"></span>
									Create Inference Session
								{/if}
							</Button>
						</div>
					</Card.Content>
				</Card.Root>
			{/if}

			<!-- Quick Info -->
			<div
				class="rounded border border-slate-300 bg-slate-100/30 p-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-500"
			>
				<span class="icon-[mdi--information] mr-1 size-3"></span>
				Inference Sessions require a trained {modelConfig.label} and create dedicated communication rooms for video
				inputs, robot joint states, and control outputs in the inference server system.
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
