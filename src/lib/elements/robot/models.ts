// Core models with clean typing
export interface JointState {
	name: string;
	value: number; // Normalized value (-100 to +100 for regular joints, 0-100 for grippers)
	limits?: { lower: number; upper: number }; // URDF limits in radians
	servoId?: number; // For hardware mapping
}

export interface JointCalibration {
	isCalibrated: boolean;
	minServoValue?: number;
	maxServoValue?: number;
}

export interface RobotCommand {
	joints: { name: string; value: number }[];
	timestamp?: number;
}

export interface ConnectionStatus {
	isConnected: boolean;
	error?: string;
	lastConnected?: Date;
}

export interface Position3D {
	x: number;
	y: number;
	z: number;
}

// Driver configurations
export interface USBDriverConfig {
	type: "usb";
	baudRate?: number;
}

export interface RemoteDriverConfig {
	type: "remote";
	url: string;
	robotId: string;
	workspaceId?: string; // Optional workspace ID for remote connections
}

// Driver base interface
export interface Driver {
	readonly id: string;
	readonly name: string;
	readonly status: ConnectionStatus;

	connect(): Promise<void>;
	disconnect(): Promise<void>;
	onStatusChange(callback: (status: ConnectionStatus) => void): () => void;
}

// Consumer interface (receives commands) - Robot can only have ONE
export interface Consumer extends Driver {
	onCommand(callback: (command: RobotCommand) => void): () => void;
	startListening?(): Promise<void>;
	stopListening?(): Promise<void>;
}

// Producer interface (sends commands) - Robot can have MULTIPLE
export interface Producer extends Driver {
	sendCommand(command: RobotCommand): Promise<void>;
}

// Calibration state for UI components
export interface CalibrationState {
	isCalibrating: boolean;
	progress: number;
}
