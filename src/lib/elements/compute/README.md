# AI Compute System

This module provides a comprehensive AI compute management system for the LeRobot Arena frontend, integrating with the AI server backend for ACT model inference sessions.

## Architecture

The system follows the same pattern as the video and robot managers:

- **RemoteComputeManager**: Global manager for all AI compute instances
- **RemoteCompute**: Individual AI compute instance with reactive state
- **UI Components**: Modal dialogs and status displays for managing compute sessions

## Core Components

### RemoteComputeManager

The main manager class that handles:
- Creating and managing AI compute instances
- Communicating with the AI server backend
- Session lifecycle management (create, start, stop, delete)
- Health monitoring and status updates

```typescript
import { remoteComputeManager } from '$lib/elements/compute/';

// Create a new compute instance
const compute = remoteComputeManager.createCompute('my-compute', 'ACT Model');

// Create an AI session
await remoteComputeManager.createSession(compute.id, {
  sessionId: 'my-session',
  policyPath: './checkpoints/act_so101_beyond',
  cameraNames: ['front', 'wrist'],
  transportServerUrl: 'http://localhost:8000'
});

// Start inference
await remoteComputeManager.startSession(compute.id);
```

### RemoteCompute

Individual compute instances with reactive state:

```typescript
// Access compute properties
compute.hasSession     // boolean - has an active session
compute.isRunning      // boolean - session is running inference
compute.canStart       // boolean - can start inference
compute.canStop        // boolean - can stop inference
compute.statusInfo     // status display information
```

## AI Server Integration

The system integrates with the AI server backend (`backend/ai-server/`) which provides:

- **ACT Model Inference**: Real-time robot control using Action Chunking Transformer models
- **Session Management**: Create, start, stop, and delete inference sessions
- **Transport Server Communication**: Dedicated rooms for camera inputs, joint inputs, and joint outputs
- **Multi-camera Support**: Support for multiple camera streams per session

### Session Workflow

1. **Create Session**: Establishes connection with AI server and creates transport server rooms
2. **Configure Inputs**: Sets up camera rooms and joint input rooms
3. **Start Inference**: Begins ACT model inference and joint command output
4. **Monitor Status**: Real-time status updates and performance metrics
5. **Stop/Delete**: Clean session teardown

## UI Components

### Modal Dialog

`AISessionConnectionModal.svelte` provides a comprehensive interface for:
- Creating new AI sessions with configurable parameters
- Managing existing sessions (start, stop, delete)
- Viewing session status and connection details
- Real-time session monitoring

### Status Display

The status system shows input/output connections:

- **Input Box**: Shows camera inputs and joint state inputs
- **Compute Box**: Shows AI model status and information  
- **Output Box**: Shows joint command outputs
- **Connection Flow**: Visual representation of data flow

### 3D Integration

- Uses existing GPU 3D models for visual representation
- Interactive hover states and status billboards
- Positioned in 3D space alongside robots and videos

## Usage Example

```typescript
// 1. Create a compute instance
const compute = remoteComputeManager.createCompute();

// 2. Configure and create AI session
await remoteComputeManager.createSession(compute.id, {
  sessionId: 'robot-control-01',
  policyPath: './checkpoints/act_so101_beyond',
  cameraNames: ['front', 'wrist', 'overhead'],
  transportServerUrl: 'http://localhost:8000',
  workspaceId: 'workspace-123'
});

// 3. Start inference
await remoteComputeManager.startSession(compute.id);

// 4. Monitor status
const status = await remoteComputeManager.getSessionStatus(compute.id);
console.log(status.stats.inference_count);
```

## Configuration

The system connects to:
- **Inference Server**: `http://localhost:8001` (configurable) - Runs AI models and inference sessions
- **Transport Server**: `http://localhost:8000` (configurable) - Manages communication rooms and data routing

## File Structure

```
compute/
├── RemoteComputeManager.svelte.ts  # Main manager class
├── RemoteCompute.svelte.ts         # Individual compute instance
├── modal/
│   └── AISessionConnectionModal.svelte  # Session management modal
├── status/
│   ├── ComputeInputBoxUIKit.svelte     # Input status display
│   ├── ComputeOutputBoxUIKit.svelte    # Output status display
│   ├── ComputeBoxUIKit.svelte          # Main compute display
│   ├── ComputeConnectionFlowBoxUIKit.svelte  # Connection flow
│   └── ComputeStatusBillboard.svelte   # 3D status billboard
└── index.ts                        # Module exports
```

## Integration Points

- **3D Scene**: `Computes.svelte` renders all compute instances
- **Add Button**: `AddAIButton.svelte` creates new compute instances
- **Main Page**: Integrated in the main workspace view
- **GPU Models**: Reuses existing GPU 3D models for visual consistency 