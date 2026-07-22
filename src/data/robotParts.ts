export interface RobotPart {
  id: string;
  name: string;
  description: string;
  /** Position in assembly order (0 = bottom/base) */
  order: number;
  /** Human arm counterpart for comparison */
  humanCounterpart: string;
  /** SVG color */
  color: string;
}

export const ROBOT_PARTS: RobotPart[] = [
  {
    id: "base",
    name: "Base",
    description: "Fixed support structure, anchors the entire arm",
    order: 0,
    humanCounterpart: "Shoulder",
    color: "#64748b",
  },
  {
    id: "upper_arm",
    name: "Upper Arm",
    description: "Primary link — provides reach and extension",
    order: 1,
    humanCounterpart: "Upper Arm Bone",
    color: "#3b82f6",
  },
  {
    id: "forearm",
    name: "Forearm",
    description: "Secondary link — adjusts length and angle",
    order: 2,
    humanCounterpart: "Forearm Bones",
    color: "#22c55e",
  },
  {
    id: "wrist",
    name: "Wrist",
    description: "Multi-directional joint for fine-tuning orientation",
    order: 3,
    humanCounterpart: "Wrist",
    color: "#f59e0b",
  },
  {
    id: "end_effector",
    name: "End Effector",
    description: "The 'hand' that performs actual gripping work",
    order: 4,
    humanCounterpart: "Hand & Fingers",
    color: "#ef4444",
  },
];

export const ASSEMBLY_ORDER = ROBOT_PARTS.map((p) => p.id);
