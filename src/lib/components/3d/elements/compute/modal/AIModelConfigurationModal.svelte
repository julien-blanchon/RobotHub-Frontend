<script lang="ts">
	import * as Dialog from "@/components/ui/dialog";
	import { Button } from "@/components/ui/button";
	import * as Card from "@/components/ui/card";
	import { Badge } from "@/components/ui/badge";
	import { Input } from "@/components/ui/input";
	import { Label } from "@/components/ui/label";
	import { Textarea } from "@/components/ui/textarea";
	import * as Select from "@/components/ui/select";
	import {
		remoteComputeManager,
		MODEL_TYPES,
		type ModelType,
		type AISessionConfig
	} from "$lib/elements/compute";
	import { settings } from "$lib/runes/settings.svelte";
	import { toast } from "svelte-sonner";
	import { generateName } from "$lib/utils/generateName";

	interface Props {
		workspaceId: string;
		open: boolean;
		initialModelType?: ModelType;
	}

	let { open = $bindable(), workspaceId, initialModelType = "act" }: Props = $props();

	let isCreating = $state(false);
	let selectedModelType = $state<ModelType>(initialModelType);

	// Update selectedModelType when initialModelType changes
	$effect(() => {
		selectedModelType = initialModelType;
	});
	let sessionId = $state("");
	let policyPath = $state("");
	let cameraNames = $state("");
	let languageInstruction = $state("");
	let computeName = $state("");

	// Get model config based on selected type
	const modelConfig = $derived(MODEL_TYPES[selectedModelType]);

	// Set defaults when modal opens with a specific model type
	$effect(() => {
		if (open && selectedModelType) {
			const config = MODEL_TYPES[selectedModelType];
			sessionId = `${selectedModelType}-session-${Date.now()}`;
			policyPath = config.defaultPolicyPath;
			cameraNames = config.defaultCameraNames.join(", ");
			computeName = `${config.label} ${generateName()}`;
			languageInstruction = ""; // Reset language instruction
		}
	});

	async function handleCreateModel() {
		if (!sessionId.trim() || !policyPath.trim() || !computeName.trim()) {
			toast.error("Please fill in all required fields");
			return;
		}

		const config = MODEL_TYPES[selectedModelType];
		if (config.requiresLanguageInstruction && !languageInstruction.trim()) {
			toast.error("Language instruction is required for this model type");
			return;
		}

		isCreating = true;
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
				modelType: selectedModelType,
				policyPath: policyPath.trim(),
				cameraNames: cameras,
				transportServerUrl: settings.transportServerUrl,
				workspaceId: workspaceId,
				languageInstruction: languageInstruction.trim() || undefined
			};

			const result = await remoteComputeManager.createComputeWithSession(
				sessionConfig,
				undefined, // auto-generate compute ID
				computeName.trim()
			);

			if (result.success) {
				toast.success(`${config.label} model created successfully!`, {
					description: `Session ${sessionId} is ready for inference`
				});
				open = false;
				// Reset form
				resetForm();
			} else {
				toast.error(`Failed to create ${config.label}`, {
					description: result.error
				});
			}
		} catch (error) {
			console.error("Model creation error:", error);
			toast.error("Failed to create AI model");
		} finally {
			isCreating = false;
		}
	}

	function resetForm() {
		sessionId = "";
		policyPath = "";
		cameraNames = "";
		languageInstruction = "";
		computeName = "";
	}

	// Reset form when modal closes
	$effect(() => {
		if (!open) {
			resetForm();
		}
	});
</script>

<Dialog.Root bind:open>
	<Dialog.Content
		class="max-h-[80vh] max-w-3xl overflow-y-auto border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
	>
		<Dialog.Header class="pb-3">
			<Dialog.Title
				class="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-slate-100"
			>
				<span class="{modelConfig.icon} size-5 text-purple-500 dark:text-purple-400"></span>
				Create AI Model - {modelConfig.label}
			</Dialog.Title>
			<Dialog.Description class="text-sm text-slate-600 dark:text-slate-400">
				Configure and deploy an AI model for robot control and inference
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-6">
			<!-- Model Type Display (Read-only) -->
			<div
				class="rounded-lg border border-purple-300/30 bg-purple-100/20 p-3 dark:border-purple-500/30 dark:bg-purple-900/20"
			>
				<div class="flex items-center gap-3">
					<span class="{modelConfig.icon} size-6 text-purple-500 dark:text-purple-400"></span>
					<div>
						<h3 class="font-medium text-purple-700 dark:text-purple-200">
							{modelConfig.label}
						</h3>
						<p class="text-sm text-purple-600 dark:text-purple-300">
							{modelConfig.description}
						</p>
					</div>
				</div>
			</div>

			<!-- Basic Configuration -->
			<Card.Root
				class="border-green-300/30 bg-green-100/5 dark:border-green-500/30 dark:bg-green-500/5"
			>
				<Card.Header>
					<Card.Title class="flex items-center gap-2 text-base text-green-700 dark:text-green-200">
						<span class="icon-[mdi--cog] size-4"></span>
						Basic Configuration
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="space-y-4">
						<div class="grid grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label for="computeName" class="text-green-700 dark:text-green-300">
									Compute Name
								</Label>
								<Input
									id="computeName"
									bind:value={computeName}
									placeholder="My AI Model"
									class="border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
								/>
							</div>
							<div class="space-y-2">
								<Label for="sessionId" class="text-green-700 dark:text-green-300">Session ID</Label>
								<Input
									id="sessionId"
									bind:value={sessionId}
									placeholder="my-session-01"
									class="border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
								/>
							</div>
						</div>

						<div class="space-y-2">
							<Label for="policyPath" class="text-green-700 dark:text-green-300">Policy Path</Label>
							<Input
								id="policyPath"
								bind:value={policyPath}
								placeholder={modelConfig.defaultPolicyPath}
								class="border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
							/>
							<p class="text-xs text-slate-600 dark:text-slate-400">
								HuggingFace model path or local model identifier
							</p>
						</div>

						<div class="space-y-2">
							<Label for="cameraNames" class="text-green-700 dark:text-green-300">
								Camera Names
							</Label>
							<Input
								id="cameraNames"
								bind:value={cameraNames}
								placeholder="front, wrist, overhead"
								class="border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
							/>
							<p class="text-xs text-slate-600 dark:text-slate-400">Comma-separated camera names</p>
						</div>

						{#if modelConfig.requiresLanguageInstruction}
							<div class="space-y-2">
								<Label for="languageInstruction" class="text-green-700 dark:text-green-300">
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
					</div>
				</Card.Content>
			</Card.Root>

			<!-- Workspace Info -->
			<div
				class="rounded-lg border border-blue-300/30 bg-blue-100/20 p-3 dark:border-blue-500/30 dark:bg-blue-900/20"
			>
				<div class="flex items-center gap-2">
					<span class="icon-[mdi--folder] size-4 text-blue-600 dark:text-blue-400"></span>
					<span class="text-sm font-medium text-blue-700 dark:text-blue-300">
						Workspace: {workspaceId}
					</span>
				</div>
				<p class="mt-1 text-xs text-blue-600 dark:text-blue-400">
					The model will be deployed in the current workspace with dedicated communication rooms
				</p>
			</div>

			<!-- Action Buttons -->
			<div class="flex gap-3">
				<Button
					variant="outline"
					onclick={() => (open = false)}
					class="flex-1"
					disabled={isCreating}
				>
					Cancel
				</Button>
				<Button
					variant="default"
					onclick={handleCreateModel}
					disabled={isCreating || !sessionId.trim() || !policyPath.trim() || !computeName.trim()}
					class="flex-1 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 dark:bg-purple-600 dark:hover:bg-purple-700"
				>
					{#if isCreating}
						<span class="icon-[mdi--loading] mr-2 size-4 animate-spin"></span>
						Creating {modelConfig.label}...
					{:else}
						<span class="icon-[mdi--rocket-launch] mr-2 size-4"></span>
						Create {modelConfig.label}
					{/if}
				</Button>
			</div>

			<!-- Quick Info -->
			<div
				class="rounded border border-slate-300 bg-slate-100/30 p-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-800/30 dark:text-slate-500"
			>
				<span class="icon-[mdi--information] mr-1 size-3"></span>
				This will create a complete AI model setup with inference session, communication rooms, and a
				3D representation ready for connections.
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>
