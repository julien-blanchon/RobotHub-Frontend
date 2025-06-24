import type { UrdfRobotState } from "$lib/types/robot";
import type { RobotUrdfConfig } from "$lib/types/urdf";
import { UrdfParser } from "@/components/3d/elements/robot/URDF/utils/UrdfParser";

export async function createUrdfRobot(urdfConfig: RobotUrdfConfig): Promise<UrdfRobotState> {
	const customParser = new UrdfParser(urdfConfig.urdfUrl, "/robots/so-100/");
	const urdfData = await customParser.load();
	const robot = $state(customParser.fromString(urdfData));
	
	const UrdfRobotState: UrdfRobotState = {
		urdfRobot: robot,
		urdfConfig: urdfConfig,
	};

	return UrdfRobotState;
}
