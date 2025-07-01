export interface UrdfCompoundMovement {
	name: string;
	primaryJoint: number; // the joint controlled by the key
	// Optional formula for calculating deltaPrimary, can use primary, dependent, etc.
	primaryFormula?: string;
	dependents: {
		joint: number;
		// The formula is used to calculate the delta for the dependent joint (deltaDependent)
		// It can use variables: primary, dependent, deltaPrimary
		// deltaPrimary itself can depend on primary and dependent angles
		// Example: "deltaPrimary * 0.8 + primary * 0.1 - dependent * 0.05"
		formula: string;
	}[];
}

export type RobotUrdfConfig = {
	urdfUrl: string;
	jointNameIdMap?: {
		[key: string]: number;
	};
	compoundMovements?: UrdfCompoundMovement[];
	// Rest/calibration position - joint values in degrees when robot is in "rest mode"
	restPosition?: {
		[jointName: string]: number;
	};
	// Display metadata for UI
	displayName?: string;
	description?: string;
	icon?: string;
	isDefault?: boolean;
};
