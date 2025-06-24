import type { IUrdfVisual } from "./IUrdfVisual";

interface IUrdfInertia {
	ixx: number;
	ixy: number;
	ixz: number;
	iyy: number;
	iyz: number;
	izz: number;
}

export default interface IUrdfLink {
	name: string;
	inertial?: {
		origin_xyz?: [x: number, y: number, z: number];
		origin_rpy?: [roll: number, pitch: number, yaw: number];
		mass: number;
		inertia: IUrdfInertia;
	};
	visual: IUrdfVisual[];
	collision: IUrdfVisual[];
	elem: Element;
}
