import type IUrdfLink from "./IUrdfLink";

export interface IUrdfJointLimit {
	lower: number;
	upper: number;
	effort: number;
	velocity: number;
}

export interface IUrdfJointSafetyController {
	soft_lower_limit: number;
	soft_upper_limit: number;
}

export default interface IUrdfJoint {
	name?: string;
	type?: "revolute" | "continuous" | "prismatic" | "fixed" | "floating" | "planar";
	// rpy = roll, pitch, yaw (values between -pi and +pi)
	origin_rpy: [roll: number, pitch: number, yaw: number];
	origin_xyz: [x: number, y: number, z: number];
	// calculated rotation for non-fixed joints based on origin_rpy and axis_xyz
	rotation: [x: number, y: number, z: number];
	parent: IUrdfLink;
	child: IUrdfLink;
	// axis for revolute and continuous joints defaults to (1,0,0)
	axis_xyz?: [x: number, y: number, z: number];
	calibration?: {
		rising?: number; // Calibration rising value in radians
		falling?: number; // Calibration falling value in radians
	};
	dynamics?: {
		damping?: number;
		friction?: number;
	};
	// only for revolute joints
	limit?: IUrdfJointLimit;
	mimic?: {
		joint: string;
		multiplier?: number;
		offset?: number;
	};
	safety_controller?: IUrdfJointSafetyController;
	elem: Element;
}
