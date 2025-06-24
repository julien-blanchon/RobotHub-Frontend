/**
 * Configuration utilities for environment-specific URLs
 */

// Check if we're running in browser
const isBrowser = typeof window !== "undefined";

/**
 * Get the SPACE_HOST from various sources
 */
function getSpaceHost(): string | undefined {
	if (!isBrowser) return undefined;

	// Check window.SPACE_HOST (injected by container)
	if ((window as unknown as { SPACE_HOST?: string }).SPACE_HOST) {
		return (window as unknown as { SPACE_HOST: string }).SPACE_HOST;
	}

	// Check if current hostname looks like HF Spaces
	const hostname = window.location.hostname;
	if (hostname.includes("hf.space") || hostname.includes("huggingface.co")) {
		return hostname;
	}

	return undefined;
}

/**
 * Get the base URL for API requests
 */
export function getApiBaseUrl(): string {
	if (!isBrowser) return "http://localhost:7860";

	// Check for Hugging Face Spaces
	const spaceHost = getSpaceHost();
	if (spaceHost) {
		return `https://${spaceHost}`;
	}

	// In browser, check current location
	const { protocol, hostname, port } = window.location;

	// If we're on the same host and port, use same origin (both frontend and backend on same server)
	if (hostname === "localhost" || hostname === "127.0.0.1") {
		// In development, frontend might be on 5173 and backend on 7860
		if (port === "5173" || port === "5174") {
			return "http://localhost:8000";
		}
		// If frontend is served from backend (port 7860), use same origin
		return `${protocol}//${hostname}:${port}`;
	}

	// For production, use same origin (both served from same FastAPI server)
	return `${protocol}//${hostname}${port ? `:${port}` : ""}`;
}

/**
 * Get the WebSocket URL for real-time connections
 */
export function getWebSocketBaseUrl(): string {
	if (!isBrowser) return "ws://localhost:7860";

	// Check for Hugging Face Spaces
	const spaceHost = getSpaceHost();
	if (spaceHost) {
		return `wss://${spaceHost}`;
	}

	const { protocol, hostname, port } = window.location;

	// If we're on localhost
	if (hostname === "localhost" || hostname === "127.0.0.1") {
		// In development, frontend might be on 5173 and backend on 7860
		if (port === "5173" || port === "5174") {
			return "ws://localhost:8000";
		}
		// If frontend is served from backend (port 7860), use same origin
		const wsProtocol = protocol === "https:" ? "wss:" : "ws:";
		return `${wsProtocol}//${hostname}:${port}`;
	}

	// For HTTPS sites, use WSS; for HTTP sites, use WS
	const wsProtocol = protocol === "https:" ? "wss:" : "ws:";

	// For production, use same origin (both served from same FastAPI server)
	return `${wsProtocol}//${hostname}${port ? `:${port}` : ""}`;
}

/**
 * Get environment info for debugging
 */
export function getEnvironmentInfo() {
	if (!isBrowser) return { env: "server", hostname: "unknown" };

	const { protocol, hostname, port } = window.location;
	const spaceHost = getSpaceHost();

	return {
		env: spaceHost ? "huggingface-spaces" : hostname === "localhost" ? "local" : "production",
		hostname,
		port,
		protocol,
		spaceHost,
		apiBaseUrl: getApiBaseUrl(),
	};
}
