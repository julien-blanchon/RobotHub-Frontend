export interface Position3D {
	x: number;
	y: number;
	z: number;
}

/**
 * Generate a random position within the given ranges
 */
export function generateRandomPosition(
	xRange: [number, number],
	yRange: [number, number],
	zRange: [number, number]
): Position3D {
	return {
		x: Math.random() * (xRange[1] - xRange[0]) + xRange[0],
		y: Math.random() * (yRange[1] - yRange[0]) + yRange[0],
		z: Math.random() * (zRange[1] - zRange[0]) + zRange[0]
	};
}

/**
 * Clamp a position within bounds
 */
export function clampPosition(
	position: Position3D,
	bounds: {
		x: [number, number];
		y: [number, number];
		z: [number, number];
	}
): Position3D {
	return {
		x: Math.max(bounds.x[0], Math.min(bounds.x[1], position.x)),
		y: Math.max(bounds.y[0], Math.min(bounds.y[1], position.y)),
		z: Math.max(bounds.z[0], Math.min(bounds.z[1], position.z))
	};
}

/**
 * Calculate distance between two positions
 */
export function getDistance(pos1: Position3D, pos2: Position3D): number {
	const dx = pos2.x - pos1.x;
	const dy = pos2.y - pos1.y;
	const dz = pos2.z - pos1.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
