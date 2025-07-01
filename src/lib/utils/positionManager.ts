import type { Position3D } from "./positionUtils";

/**
 * Spiral-based position manager
 * Assigns positions in a spiral pattern starting from center to avoid overlapping objects
 *
 * Pattern: Center -> Right -> Up -> Left -> Down -> Right (outward spiral)
 * Example positions: (0,0) -> (1,0) -> (1,-1) -> (0,-1) -> (-1,-1) -> (-1,0) -> (-1,1) -> (0,1) -> (1,1) -> (2,1) ...
 */
export class PositionManager {
	private static instance: PositionManager;
	private gridSize = 5; // Distance between grid points
	private spiralGenerator: Generator<{ x: number; z: number }, never, unknown>;

	static getInstance(): PositionManager {
		if (!PositionManager.instance) {
			PositionManager.instance = new PositionManager();
		}
		return PositionManager.instance;
	}

	constructor() {
		this.spiralGenerator = this.generateSpiralPositions();
		// Skip the center position since there's already an object there
		this.spiralGenerator.next();
	}

	/**
	 * Get next available position in a spiral pattern
	 * Starts from center (0,0) and spirals outward
	 */
	getNextPosition(): Position3D {
		const { value: coord } = this.spiralGenerator.next();

		return {
			x: coord.x * this.gridSize,
			y: 0,
			z: coord.z * this.gridSize
		};
	}

	/**
	 * Generator function that yields spiral positions infinitely
	 * Uses a simple clockwise spiral starting from origin
	 */
	private *generateSpiralPositions(): Generator<{ x: number; z: number }, never, unknown> {
		let x = 0,
			z = 0;
		let dx = 1,
			dz = 0; // Start moving right
		let steps = 1;
		let stepCount = 0;
		let changeDirection = 0;

		// Yield center position first
		yield { x, z };

		// Generate spiral positions infinitely
		while (true) {
			x += dx;
			z += dz;
			yield { x, z };

			stepCount++;

			// Change direction when we've completed the required steps
			if (stepCount === steps) {
				stepCount = 0;
				changeDirection++;

				// Rotate 90 degrees clockwise: (dx, dz) -> (dz, -dx)
				const temp = dx;
				dx = dz;
				dz = -temp;

				// Increase step count after every two direction changes
				if (changeDirection % 2 === 0) {
					steps++;
				}
			}
		}
	}

	/**
	 * Reset position generator (useful for testing)
	 */
	reset(): void {
		this.spiralGenerator = this.generateSpiralPositions();
		// Skip the center position since there's already an object there
		this.spiralGenerator.next();
	}
}

// Global instance
export const positionManager = PositionManager.getInstance();
