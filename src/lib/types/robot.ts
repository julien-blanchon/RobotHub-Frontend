import type IUrdfRobot from "@/components/3d/elements/robot/URDF/interfaces/IUrdfRobot";
import type { RobotUrdfConfig } from "./urdf";

export interface UrdfRobotState {
	urdfRobot: IUrdfRobot;
	urdfConfig: RobotUrdfConfig;
}
