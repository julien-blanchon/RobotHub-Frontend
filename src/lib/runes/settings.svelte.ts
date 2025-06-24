
interface Settings {
	inferenceServerUrl: string;
	transportServerUrl: string;
}

export const settings: Settings = $state({
	// inferenceServerUrl: 'http://localhost:8001',
	// transportServerUrl: 'http://localhost:8000'
	inferenceServerUrl: 'https://blanchon-robotinferenceserver.hf.space',
	transportServerUrl: 'https://blanchon-robottransportserver.hf.space/api'
});
