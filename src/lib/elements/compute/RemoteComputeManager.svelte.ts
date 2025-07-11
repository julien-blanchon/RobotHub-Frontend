import { RemoteCompute } from "./RemoteCompute.svelte";
import type { Position3D } from "$lib/types/positionable.js";
import { generateName } from "$lib/utils/generateName.js";
import { positionManager } from "$lib/utils/positionManager.js";
import {
	rootGet,
	healthCheckHealthGet,
	listSessionsSessionsGet,
	createSessionSessionsPost,
	startInferenceSessionsSessionIdStartPost,
	stopInferenceSessionsSessionIdStopPost,
	deleteSessionSessionsSessionIdDelete
} from "@robothub/inference-server-client";
import { settings } from "$lib/runes/settings.svelte";
import type {
	CreateSessionRequest,
	CreateSessionResponse
} from "@robothub/inference-server-client";

export type ModelType = "act" | "diffusion" | "smolvla" | "pi0" | "groot" | "custom";

export interface ModelTypeConfig {
	id: ModelType;
	label: string;
	icon: string;
	description: string;
	defaultPolicyPath: string;
	defaultCameraNames: string[];
	requiresLanguageInstruction?: boolean;
	enabled: boolean;
}

export const MODEL_TYPES: Record<ModelType, ModelTypeConfig> = {
	act: {
		id: "act",
		label: "ACT Model",
		icon: "icon-[mdi--brain]",
		description: "Action Chunking with Transformers",
		defaultPolicyPath: "LaetusH/act_so101_beyond",
		defaultCameraNames: ["front"],
		enabled: true
	},
	diffusion: {
		id: "diffusion",
		label: "Diffusion Policy",
		icon: "icon-[mdi--creation]",
		description: "Diffusion-based robot control",
		defaultPolicyPath: "diffusion_policy/default",
		defaultCameraNames: ["front", "wrist"],
		enabled: true
	},
	smolvla: {
		id: "smolvla",
		label: "SmolVLA",
		icon: "icon-[mdi--eye-outline]",
		description: "Small Vision-Language-Action model",
		defaultPolicyPath: "smolvla/latest",
		defaultCameraNames: ["front"],
		requiresLanguageInstruction: true,
		enabled: true
	},
	pi0: {
		id: "pi0",
		label: "Pi0",
		icon: "icon-[mdi--pi]",
		description: "Lightweight robotics model",
		defaultPolicyPath: "pi0/base",
		defaultCameraNames: ["front"],
		enabled: true
	},
	groot: {
		id: "groot",
		label: "NVIDIA Groot",
		icon: "icon-[mdi--robot-outline]",
		description: "Humanoid robotics foundation model",
		defaultPolicyPath: "nvidia/groot",
		defaultCameraNames: ["front", "left", "right"],
		requiresLanguageInstruction: true,
		enabled: false // Not yet implemented
	},
	custom: {
		id: "custom",
		label: "Custom Model",
		icon: "icon-[mdi--cog]",
		description: "Custom model configuration",
		defaultPolicyPath: "",
		defaultCameraNames: ["front"],
		enabled: true
	}
};

export interface AISessionConfig {
	sessionId: string;
	modelType: ModelType;
	policyPath: string;
	cameraNames: string[];
	transportServerUrl: string;
	workspaceId?: string;
	languageInstruction?: string;
}

export interface AISessionResponse {
	workspace_id: string;
	camera_room_ids: Record<string, string>;
	joint_input_room_id: string;
	joint_output_room_id: string;
}

export interface AISessionStatus {
	session_id: string;
	status: "initializing" | "ready" | "running" | "stopped";
	policy_path: string;
	camera_names: string[];
	workspace_id: string;
	rooms: {
		workspace_id: string;
		camera_room_ids: Record<string, string>;
		joint_input_room_id: string;
		joint_output_room_id: string;
	};
	stats: {
		inference_count: number;
		commands_sent: number;
		joints_received: number;
		images_received: Record<string, number>;
		errors: number;
		actions_in_queue: number;
	};
	inference_stats?: {
		inference_count: number;
		total_inference_time: number;
		average_inference_time: number;
		average_fps: number;
		is_loaded: boolean;
		device: string;
	};
	error_message?: string;
}

export class RemoteComputeManager {
	private _computes = $state<RemoteCompute[]>([]);

	constructor() {
		// No client initialization needed anymore
	}

	// Reactive getters
	get computes(): RemoteCompute[] {
		return this._computes;
	}

	get computeCount(): number {
		return this._computes.length;
	}

	get runningComputes(): RemoteCompute[] {
		return this._computes.filter((compute) => compute.status === "running");
	}

	/**
	 * Get available model types
	 */
	get availableModelTypes(): ModelTypeConfig[] {
		return Object.values(MODEL_TYPES).filter((model) => model.enabled);
	}

	/**
	 * Get model type configuration
	 */
	getModelTypeConfig(modelType: ModelType): ModelTypeConfig | undefined {
		return MODEL_TYPES[modelType];
	}

	/**
	 * Create a new AI compute instance with full configuration
	 */
	async createComputeWithSession(
		config: AISessionConfig,
		computeId?: string,
		computeName?: string,
		position?: Position3D
	): Promise<{ success: boolean; error?: string; compute?: RemoteCompute }> {
		const finalComputeId = computeId || generateName();

		// Check if compute already exists
		if (this._computes.find((c) => c.id === finalComputeId)) {
			return { success: false, error: `Compute with ID ${finalComputeId} already exists` };
		}

		try {
			// Create compute instance
			const compute = new RemoteCompute(finalComputeId, computeName);
			compute.modelType = config.modelType;

			// Set position (from position manager if not provided)
			compute.position = position || positionManager.getNextPosition();

			// Add to reactive array
			this._computes.push(compute);

			// Create the session immediately
			const sessionResult = await this.createSession(compute.id, config);
			if (!sessionResult.success) {
				// Remove compute if session creation failed
				await this.removeCompute(compute.id);
				return { success: false, error: sessionResult.error };
			}

			console.log(
				`Created compute ${finalComputeId} with ${config.modelType} model at position (${compute.position.x.toFixed(1)}, ${compute.position.y.toFixed(1)}, ${compute.position.z.toFixed(1)}). Total computes: ${this._computes.length}`
			);

			return { success: true, compute };
		} catch (error) {
			console.error("Failed to create compute with session:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	/**
	 * Create a new AI compute instance (legacy method)
	 */
	createCompute(id?: string, name?: string, position?: Position3D): RemoteCompute {
		const computeId = id || generateName();

		// Check if compute already exists
		if (this._computes.find((c) => c.id === computeId)) {
			throw new Error(`Compute with ID ${computeId} already exists`);
		}

		// Create compute instance
		const compute = new RemoteCompute(computeId, name);

		// Set position (from position manager if not provided)
		compute.position = position || positionManager.getNextPosition();

		// Add to reactive array
		this._computes.push(compute);

		console.log(
			`Created compute ${computeId} at position (${compute.position.x.toFixed(1)}, ${compute.position.y.toFixed(1)}, ${compute.position.z.toFixed(1)}). Total computes: ${this._computes.length}`
		);

		return compute;
	}

	/**
	 * Get compute by ID
	 */
	getCompute(id: string): RemoteCompute | undefined {
		return this._computes.find((c) => c.id === id);
	}

	/**
	 * Remove a compute instance
	 */
	async removeCompute(id: string): Promise<void> {
		const computeIndex = this._computes.findIndex((c) => c.id === id);
		if (computeIndex === -1) return;

		const compute = this._computes[computeIndex];

		// Clean up compute resources
		await this.stopSession(id);
		await this.deleteSession(id);

		// Remove from reactive array
		this._computes.splice(computeIndex, 1);

		console.log(`Removed compute ${id}. Remaining computes: ${this._computes.length}`);
	}

	/**
	 * Create an Inference Session
	 */
	async createSession(
		computeId: string,
		config: AISessionConfig
	): Promise<{ success: boolean; error?: string; data?: AISessionResponse }> {
		const compute = this.getCompute(computeId);
		if (!compute) {
			return { success: false, error: `Compute ${computeId} not found` };
		}

		try {
			const request: CreateSessionRequest = {
				session_id: config.sessionId,
				policy_path: config.policyPath,
				camera_names: config.cameraNames,
				transport_server_url: config.transportServerUrl,
				workspace_id: config.workspaceId || undefined,
				policy_type: config.modelType, // Use model type as policy type
				language_instruction: config.languageInstruction || undefined
			};

			const response = await createSessionSessionsPost({
				body: request,
				baseUrl: settings.inferenceServerUrl
			});

			if (!response.data) {
				throw new Error("Failed to create session - no data returned");
			}

			const data: CreateSessionResponse = response.data;

			// Update compute with session info
			compute.sessionId = config.sessionId;
			compute.status = "ready";
			compute.sessionConfig = config;
			compute.sessionData = {
				workspace_id: data.workspace_id,
				camera_room_ids: data.camera_room_ids,
				joint_input_room_id: data.joint_input_room_id,
				joint_output_room_id: data.joint_output_room_id
			};

			return { success: true, data: compute.sessionData };
		} catch (error) {
			console.error(`Failed to create session for compute ${computeId}:`, error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	/**
	 * Start inference for a session
	 */
	async startSession(computeId: string): Promise<{ success: boolean; error?: string }> {
		const compute = this.getCompute(computeId);
		if (!compute || !compute.sessionId) {
			return { success: false, error: "No session to start" };
		}

		try {
			await startInferenceSessionsSessionIdStartPost({
				path: { session_id: compute.sessionId },
				baseUrl: settings.inferenceServerUrl
			});
			compute.status = "running";
			return { success: true };
		} catch (error) {
			console.error(`Failed to start session for compute ${computeId}:`, error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	/**
	 * Stop inference for a session
	 */
	async stopSession(computeId: string): Promise<{ success: boolean; error?: string }> {
		const compute = this.getCompute(computeId);
		if (!compute || !compute.sessionId) {
			return { success: false, error: "No session to stop" };
		}

		try {
			await stopInferenceSessionsSessionIdStopPost({
				path: { session_id: compute.sessionId },
				baseUrl: settings.inferenceServerUrl
			});
			compute.status = "stopped";
			return { success: true };
		} catch (error) {
			console.error(`Failed to stop session for compute ${computeId}:`, error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	/**
	 * Delete a session
	 */
	async deleteSession(computeId: string): Promise<{ success: boolean; error?: string }> {
		const compute = this.getCompute(computeId);
		if (!compute || !compute.sessionId) {
			return { success: true }; // Already deleted
		}

		try {
			await deleteSessionSessionsSessionIdDelete({
				path: { session_id: compute.sessionId },
				baseUrl: settings.inferenceServerUrl
			});

			// Reset compute session info
			compute.sessionId = null;
			compute.status = "disconnected";
			compute.sessionConfig = null;
			compute.sessionData = null;

			return { success: true };
		} catch (error) {
			console.error(`Failed to delete session for compute ${computeId}:`, error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	/**
	 * Get session status
	 */
	async getSessionStatus(
		computeId: string
	): Promise<{ success: boolean; data?: AISessionStatus; error?: string }> {
		const compute = this.getCompute(computeId);
		if (!compute || !compute.sessionId) {
			return { success: false, error: "No session found" };
		}

		try {
			// Get all sessions and find the one we want
			const response = await listSessionsSessionsGet({
				baseUrl: settings.inferenceServerUrl
			});

			if (!response.data) {
				throw new Error("Failed to get sessions list");
			}

			const session = response.data.find((s) => s.session_id === compute.sessionId);
			if (!session) {
				throw new Error(`Session ${compute.sessionId} not found`);
			}

			// Update compute status
			compute.status = session.status as "initializing" | "ready" | "running" | "stopped";

			// Convert to AISessionStatus format
			const sessionStatus: AISessionStatus = {
				session_id: session.session_id,
				status: session.status as "initializing" | "ready" | "running" | "stopped",
				policy_path: session.policy_path,
				camera_names: session.camera_names,
				workspace_id: session.workspace_id,
				rooms: session.rooms as any,
				stats: session.stats as any,
				inference_stats: session.inference_stats as any,
				error_message: session.error_message || undefined
			};

			return { success: true, data: sessionStatus };
		} catch (error) {
			console.error(`Failed to get session status for compute ${computeId}:`, error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	/**
	 * Check AI server health
	 */
	async checkServerHealth(): Promise<{ success: boolean; data?: any; error?: string }> {
		try {
			const healthResponse = await rootGet({
				baseUrl: settings.inferenceServerUrl
			});

			if (!healthResponse.data) {
				return { success: false, error: "Server is not healthy" };
			}

			// Get detailed health info
			const detailedHealthResponse = await healthCheckHealthGet({
				baseUrl: settings.inferenceServerUrl
			});

			return { success: true, data: detailedHealthResponse.data };
		} catch (error) {
			console.error("Failed to check AI server health:", error);
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error)
			};
		}
	}

	/**
	 * Clean up all computes
	 */
	async destroy(): Promise<void> {
		const cleanupPromises = this._computes.map(async (compute) => {
			await this.stopSession(compute.id);
			await this.deleteSession(compute.id);
		});
		await Promise.allSettled(cleanupPromises);
		this._computes.length = 0;
	}
}

// Global compute manager instance
export const remoteComputeManager = new RemoteComputeManager();
