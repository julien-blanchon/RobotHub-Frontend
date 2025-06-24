import type IUrdfJoint from "../interfaces/IUrdfJoint";
import type IUrdfLink from "../interfaces/IUrdfLink";
import type IUrdfRobot from "../interfaces/IUrdfRobot";

// Color constants for better maintainability
export const URDF_COLORS = {
	COLLISION: "#813d9c", // purple
	JOINT: "#62a0ea", // blue
	LINK: "#57e389", // green
	JOINT_INDICATOR: "#f66151", // red
	HIGHLIGHT: "#ffa348", // orange
	BACKGROUND: "#241f31" // dark purple
} as const;

// Transform tool types
export type TransformTool = "translate" | "rotate" | "scale";

// Joint state tracking
export interface JointStates {
	continuous: Record<string, number>;
	revolute: Record<string, number>;
}

// Visibility configuration
export interface VisibilityConfig {
	visual: boolean;
	collision: boolean;
	joints: boolean;
	jointNames: boolean;
	linkNames: boolean;
}

// Appearance settings
export interface AppearanceConfig {
	colors: {
		collision: string;
		joint: string;
		link: string;
		jointIndicator: string;
		background: string;
	};
	opacity: {
		visual: number;
		collision: number;
		link: number;
	};
}

// Editor configuration
export interface EditorConfig {
	isEditMode: boolean;
	currentTool: TransformTool;
	snap: {
		translation: number;
		scale: number;
		rotation: number;
	};
}

// View configuration
export interface ViewConfig {
	zoom: {
		current: number;
		initial: number;
	};
	nameHeight: number;
}

// Main URDF state interface
export interface UrdfState {
	robot?: IUrdfRobot;
	jointStates: JointStates;
	visibility: VisibilityConfig;
	appearance: AppearanceConfig;
	editor: EditorConfig;
	view: ViewConfig;
}

// Create the reactive state
export const urdfState = $state<UrdfState>({
	// Robot data
	robot: undefined,
	jointStates: {
		continuous: {},
		revolute: {}
	},

	// Visibility settings
	visibility: {
		visual: true,
		collision: false,
		joints: true,
		jointNames: true,
		linkNames: true
	},

	// Appearance settings
	appearance: {
		colors: {
			collision: URDF_COLORS.COLLISION,
			joint: URDF_COLORS.JOINT,
			link: URDF_COLORS.LINK,
			jointIndicator: URDF_COLORS.JOINT_INDICATOR,
			background: URDF_COLORS.BACKGROUND
		},
		opacity: {
			visual: 1.0,
			collision: 0.7,
			link: 1.0
		}
	},

	// Editor configuration
	editor: {
		isEditMode: false,
		currentTool: "translate",
		snap: {
			translation: 0.001,
			scale: 0.001,
			rotation: 1
		}
	},

	// View configuration
	view: {
		zoom: {
			current: 1.3,
			initial: 1.3
		},
		nameHeight: 0.05
	}
});
