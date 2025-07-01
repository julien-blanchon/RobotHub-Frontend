import type { Position3D } from "$lib/utils/positionUtils";

export interface Positionable {
	readonly id: string;
	position: Position3D;
	updatePosition(newPosition: Position3D): void;
}

export type { Position3D } from "$lib/utils/positionUtils";
