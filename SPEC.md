# Robot USB Connection System - Summary

## Core Components

### USBProducer (Output)
**Purpose**: Sends software commands to control physical robot hardware
- Receives normalized joint commands from software
- Converts normalized values to raw servo positions
- Sends position commands to physical servos
- Locks servos for precise software control

### USBConsumer (Input) 
**Purpose**: Reads physical robot movements and translates to software commands
- Continuously monitors physical servo positions
- Converts raw servo values to normalized percentages
- Detects movement changes and broadcasts updates
- Keeps servos unlocked for manual manipulation

## Key Features

### Calibration System (`USBCalibrationPanel.svelte`)
- **Requirement**: All USB connections must be calibrated before use
- **Process**: Records min/max physical range for each servo by manual movement
- **Result**: Establishes mapping between raw servo values (0-4095) and normalized values

### Normalized Communication Protocol
- **Standard Joints**: -100% to +100% range (bipolar)
- **Gripper/Jaw**: 0% to +100% range (unipolar) 
- **Benefits**: Consistent software interface across different robots
- **Conversion**: Automatic normalization/denormalization based on calibration data

### Multi-Port Support
- **Capability**: Multiple independent USB connections simultaneously
- **Independence**: Each connection has its own calibration and configuration
- **Use Case**: Control multiple robots or multiple connections to same robot

### Batch Operations
- **Sync Read**: Read multiple servo positions simultaneously
- **Sync Write**: Send commands to multiple servos in batched operations
- **Performance**: Reduces USB communication overhead and latency

## Key Constraints

### Connection Exclusivity
- **Input**: Only one consumer (input source) active per robot at a time
- **Output**: Multiple producers (output destinations) can be active simultaneously
- **Rationale**: Prevents conflicting input commands while allowing broadcast to multiple destinations

### Servo Locking Strategy
- **Consumer Mode**: Servos unlocked → manual movement possible + position reading
- **Producer Mode**: Servos locked → software control only, no manual movement
- **Safety**: Prevents mechanical conflicts between manual and software control

### Calibration Dependency
- **Mandatory**: USB connections cannot establish without valid calibration
- **Per-Connection**: Each USB port requires independent calibration
- **Safety**: Prevents commanding impossible positions or damaging hardware

## Additional System Requirements (from SPEC.md analysis)

### Connection Management
- **Auto-Detection**: System should detect available USB ports automatically
- **Status Monitoring**: Real-time connection health and error reporting
- **Graceful Disconnection**: Safe servo unlocking on disconnect/error

### Error Handling & Recovery
- **Port Conflicts**: Queue management to prevent "Port is busy" errors
- **Retry Logic**: Automatic retry with backoff for failed servo commands
- **Connection Recovery**: Automatic reconnection attempts after USB disconnect

### User Interface Integration
- **Modal Management**: Unified connection setup through calibration panels
- **Status Display**: Visual indicators for connection state and calibration status
- **Manual Control**: Direct joint manipulation when no input consumer active

### Performance Optimizations
- **Polling Rates**: Configurable update frequencies for different use cases
- **Change Detection**: Only broadcast updates when values actually change
- **Queueing**: Serial command processing to prevent USB port conflicts

## System Architecture Concepts

### Bidirectional Data Flow
```
Physical Robot ←→ USB Hardware ←→ Calibration Layer ←→ Normalized Interface ←→ Software
```

### Connection Patterns
- **Teaching Mode**: USB Consumer only (read robot movements)
- **Control Mode**: USB Producer only (software controls robot)  
- **Bidirectional**: Both consumer and producer (full interaction)
- **Broadcasting**: Multiple producers (send to hardware + remote systems)

### Value Transformation Pipeline
```
Raw Servo (0-4095) ←→ Calibrated Range ←→ Normalized (-100/+100) ←→ Software Commands
```

This system provides a robust, safe, and flexible interface for robot hardware control while maintaining consistency across different robot configurations and use cases.