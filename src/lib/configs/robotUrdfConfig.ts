import type { RobotUrdfConfig } from "$lib/types/urdf";

export const robotUrdfConfigMap: { [key: string]: RobotUrdfConfig } = {
	"so-arm100": {
		urdfUrl: "/robots/so-100/so_arm100.urdf",
		displayName: "SO ARM 100",
		description: "6-DOF Robotic Arm",
		icon: "icon-[ix--robotic-arm]",
		isDefault: true,
		jointNameIdMap: {
			Rotation: 1,
			Pitch: 2,
			Elbow: 3,
			Wrist_Pitch: 4,
			Wrist_Roll: 5,
			Jaw: 6,
			// camera_mount: 7
		},
		// Rest position - robot in neutral/calibration pose (all joints at 0 degrees)
		restPosition: {
			Rotation: 0,
			Pitch: 0,
			Elbow: 0,
			Wrist_Pitch: 0,
			Wrist_Roll: 0,
			Jaw: 0,
			// camera_mount: 0
		},
		compoundMovements: [
			{
				name: "Jaw down & up",
				primaryJoint: 2,
				primaryFormula: "primary < 100 ? 1 : -1",
				dependents: [
					{
						joint: 3,
						formula: "primary < 100 ? -1.9 * deltaPrimary : 0.4 * deltaPrimary"
						// formula: "- deltaPrimary * (0.13 * Math.sin(primary * (Math.PI / 180)) + 0.13 * Math.sin((primary-dependent) * (Math.PI / 180)))/(0.13 * Math.sin((primary - dependent) * (Math.PI / 180)))",
					},
					{
						joint: 4,
						formula:
							"primary < 100 ? (primary < 10 ? 0 : 0.51 * deltaPrimary) : -0.4 * deltaPrimary"
					}
				]
			},
			{
				name: "Jaw backward & forward",
				primaryJoint: 2,
				primaryFormula: "1",
				dependents: [
					{
						joint: 3,
						formula: "-0.9*deltaPrimary"
					}
				]
			}
		]
	}
};
