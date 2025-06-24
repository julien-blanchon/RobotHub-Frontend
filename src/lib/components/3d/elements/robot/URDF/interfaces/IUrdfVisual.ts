import type IUrdfBox from "./IUrdfBox";
import type IUrdfCylinder from "./IUrdfCylinder";
import type IUrdfMesh from "./IUrdfMesh";

// 1) Box‐type visual
interface IUrdfVisualBox {
	name: string;
	origin_xyz: [x: number, y: number, z: number];
	origin_rpy: [roll: number, pitch: number, yaw: number];
	geometry: IUrdfBox;
	material?: {
		name: string;
		color?: string;
		texture?: string;
	};
	type: "box";
	// optional RGBA color override
	color_rgba?: [r: number, g: number, b: number, a: number];
	// XML Element reference
	elem: Element;
}

// 2) Cylinder‐type visual
interface IUrdfVisualCylinder {
	name: string;
	origin_xyz: [x: number, y: number, z: number];
	origin_rpy: [roll: number, pitch: number, yaw: number];
	geometry: IUrdfCylinder;
	material?: {
		name: string;
		color?: string;
		texture?: string;
	};
	type: "cylinder";
	color_rgba?: [r: number, g: number, b: number, a: number];
	elem: Element;
}

// 3) Mesh‐type visual
interface IUrdfVisualMesh {
	name: string;
	origin_xyz: [x: number, y: number, z: number];
	origin_rpy: [roll: number, pitch: number, yaw: number];
	geometry: IUrdfMesh;
	material?: {
		name: string;
		color?: string;
		texture?: string;
	};
	type: "mesh";
	color_rgba?: [r: number, g: number, b: number, a: number];
	elem: Element;
}

// Now make a union of the three:
export type IUrdfVisual = IUrdfVisualBox | IUrdfVisualCylinder | IUrdfVisualMesh;
