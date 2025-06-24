import type { UrdfRobotState } from "$lib/types/robot";

interface Environment {
	robots: {
		[robotId: string]: UrdfRobotState;
	};
}

export const environment: Environment = $state({
	robots: {}
});
