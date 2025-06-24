<script lang="ts">
  import { T } from "@threlte/core";
  import { Billboard } from "@threlte/extras";
  import type { Robot } from '../Robot.svelte.js';
  import { interactivity, type IntersectionEvent, useCursor } from "@threlte/extras";
  import { getRootLinks } from "@/components/3d/elements/robot/URDF/utils/UrdfParser";
  import UrdfLink from "@/components/3d/elements/robot/URDF/primitives/UrdfLink.svelte";
  import { ROBOT_CONFIG } from '../config.js';

  interface Props {
    robot: Robot;
    onInteract: (robot: Robot, type: 'consumer' | 'producer' | 'manual') => void;
  }

  let { robot, onInteract }: Props = $props();

  // Reactive values
  const position = $derived(robot.position);
  const hasConsumer = $derived(robot.hasConsumer);
  const outputDriverCount = $derived(robot.outputDriverCount);
  const isManualControl = $derived(robot.isManualControlEnabled);
  const connectionStatus = $derived(robot.connectionStatus);
  const jointArray = $derived(robot.jointArray);
  
  // Use the robot's stored URDF state (loaded once when robot was created)
  const urdfRobotState = $derived(robot.urdfRobotState);

  let isHovered = $state(false);
  let isSelected = $state(false);
  let lastJointValues = $state<Record<string, number>>({});

  // Sync joint values from simplified Robot to URDF joints with optimized updates
  $effect(() => {
    if (!urdfRobotState || jointArray.length === 0) return;

    // Check if this is the initial sync (no previous values recorded)
    const isInitialSync = Object.keys(lastJointValues).length === 0;
    
    // Check if any joint values have actually changed (using config threshold)
    const threshold = isInitialSync ? 0 : ROBOT_CONFIG.performance.uiUpdateThreshold;
    const hasSignificantChanges = isInitialSync || jointArray.some(joint => 
      Math.abs((lastJointValues[joint.name] || 0) - joint.value) > threshold
    );
    if (!hasSignificantChanges) return;

    // Batch update all joints that have changed (or all joints on initial sync)
    let updatedCount = 0;
    jointArray.forEach(joint => {
      if (isInitialSync || Math.abs((lastJointValues[joint.name] || 0) - joint.value) > threshold) {
        lastJointValues[joint.name] = joint.value;
        const urdfJoint = findUrdfJoint(urdfRobotState, joint.name);
        if (urdfJoint) {
          // Initialize rotation array if it doesn't exist
          if (!urdfJoint.rotation) {
            urdfJoint.rotation = [0, 0, 0];
          }
          
          // Use the Robot's conversion method for proper coordinate mapping
          const radians = robot.convertNormalizedToUrdfRadians(joint.name, joint.value);
          const axis = urdfJoint.axis_xyz || [0, 0, 1];
          
          // Reset rotation and apply to the appropriate axis
          urdfJoint.rotation = [0, 0, 0];
          for (let i = 0; i < 3; i++) {
            if (Math.abs(axis[i]) > 0.001) {
              urdfJoint.rotation[i] = radians * axis[i];
            }
          }
          updatedCount++;
        }
      }
    });

    if (updatedCount > 0) {
      console.debug(`${isInitialSync ? 'Initial sync: ' : ''}Updated ${updatedCount} URDF joints for robot ${robot.id}`);
    }
  });

  function findUrdfJoint(robot: any, jointName: string): any {
    // Search through the robot's joints array
    if (robot.joints && Array.isArray(robot.joints)) {
      for (const joint of robot.joints) {
        if (joint.name === jointName) {
          return joint;
        }
      }
    }
    return null;
  }

  const { onPointerEnter, onPointerLeave } = useCursor();
  interactivity();
</script>

<T.Group
  position.x={position.x}
  position.y={position.y}
  position.z={position.z}
  scale={[10, 10, 10]}
  rotation={[-Math.PI / 2, 0, 0]}
>
  {#if urdfRobotState}
    <!-- URDF Robot representation -->
    <T.Group
      onclick={(event: IntersectionEvent<MouseEvent>) => {
        event.stopPropagation();
        isSelected = true;
        onInteract(robot, 'manual');
      }}
      onpointerenter={(event: IntersectionEvent<PointerEvent>) => {
        event.stopPropagation();
        onPointerEnter();
        isHovered = true;
      }}
      onpointerleave={(event: IntersectionEvent<PointerEvent>) => {
        event.stopPropagation();
        onPointerLeave();
        isHovered = false;
      }}
    >
      {#each getRootLinks(urdfRobotState) as link}
        <UrdfLink
          robot={urdfRobotState}
          {link}
          textScale={0.2}
          showName={isHovered || isSelected}
          showVisual={true}
          showCollision={false}
          visualColor={connectionStatus.isConnected ? "#10b981" : "#6b7280"}
          visualOpacity={isHovered || isSelected ? 0.4 : 1.0}
          collisionOpacity={1.0}
          collisionColor="#813d9c"
          jointNames={isHovered}
          joints={isHovered}
          jointColor="#62a0ea"
          jointIndicatorColor="#f66151"
          nameHeight={0.1}
          showLine={isHovered || isSelected}
          opacity={1}
          isInteractive={false}
        />
      {/each}
    </T.Group>
  {:else}
    <!-- Fallback simple representation while URDF loads -->
    <T.Mesh
      onpointerenter={() => isHovered = true}
      onpointerleave={() => isHovered = false}
      onclick={() => onInteract(robot, 'manual')}
    >
      <T.BoxGeometry args={[0.1, 0.1, 0.1]} />
      <T.MeshStandardMaterial 
        color={connectionStatus.isConnected ? "#10b981" : "#6b7280"}
        opacity={isHovered ? 0.8 : 1.0}
        transparent
      />
    </T.Mesh>
  {/if}

  <!-- Status billboard when hovered -->
  {#if isHovered}
    <Billboard>
      <T.Group position.y={1.5}>
        <div class="bg-slate-800/90 rounded-lg p-3 text-white text-sm min-w-48 backdrop-blur">
          <div class="font-semibold mb-2">{robot.id}</div>
          
          <!-- Connection status boxes -->
          <div class="flex gap-2 mb-2">
            <!-- Consumer status -->
            <button
              onclick={() => onInteract(robot, 'consumer')}
              class="flex-1 p-2 rounded border transition-colors {hasConsumer ? 'bg-green-600 border-green-500' : 'bg-gray-600 border-gray-500 hover:bg-gray-500'}"
            >
              <div class="text-xs">Consumer</div>
              <div class="text-[10px] opacity-75">
                {hasConsumer ? 'Connected' : 'None'}
              </div>
            </button>

            <!-- Robot status -->
            <div class="flex-1 p-2 rounded border border-yellow-500 bg-yellow-600">
              <div class="text-xs">Robot</div>
              <div class="text-[10px] opacity-75">{robot.jointArray.length} joints</div>
            </div>

            <!-- Producer status -->
            <button
              onclick={() => onInteract(robot, 'producer')}
              class="flex-1 p-2 rounded border transition-colors {outputDriverCount > 0 ? 'bg-blue-600 border-blue-500' : 'bg-gray-600 border-gray-500 hover:bg-gray-500'}"
            >
              <div class="text-xs">Producer</div>
              <div class="text-[10px] opacity-75">
                {outputDriverCount} driver{outputDriverCount !== 1 ? 's' : ''}
              </div>
            </button>
          </div>

          <!-- Control status -->
          <div class="text-xs text-center px-2 py-1 rounded {isManualControl ? 'bg-purple-600' : 'bg-orange-600'}">
            {isManualControl ? 'Manual Control' : 'External Control'}
          </div>
        </div>
      </T.Group>
    </Billboard>
  {/if}
</T.Group> 