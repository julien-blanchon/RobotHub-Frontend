import { env } from '$env/dynamic/public';

interface Settings {
	inferenceServerUrl: string;
	transportServerUrl: string;
}

export const settings: Settings = $state({
	// inferenceServerUrl: 'http://localhost:8001',
	// transportServerUrl: 'http://localhost:8000'
	// inferenceServerUrl: 'https://blanchon-robothub-inferenceserver.hf.space/api',
	// transportServerUrl: 'https://blanchon-robothub-transport-server.hf.space/api'
	inferenceServerUrl: env.PUBLIC_INFERENCE_SERVER_URL ?? 'https://blanchon-robothub-inferenceserver.hf.space/api',
	transportServerUrl: env.PUBLIC_TRANSPORT_SERVER_URL ?? 'https://blanchon-robothub-transportserver.hf.space/api'
});
