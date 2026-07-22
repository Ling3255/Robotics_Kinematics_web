export type LessonStep = 1 | 2 | 3;
export type AxisChoice = "" | "X-Axis" | "Y-Axis" | "Z-Axis";

export interface Vec3Position {
  qx: number;
  qy: number;
  qz: number;
}

export const INITIAL_Q_POSITION: Vec3Position = { qx: 1.8, qy: 1.6, qz: 1.1 };
export const TARGET_Q_POSITION: Vec3Position = { qx: 2.65, qy: 2.25, qz: 1.15 };

export const ROOM_BOUNDS = {
  qx: { min: 0.15, max: 3.15 },
  qy: { min: 0.15, max: 2.85 },
  qz: { min: 0.12, max: 1.95 },
};

export const U_WORLD: [number, number, number] = [-1.55, 0, 1.55];

export function clampQPosition(position: Vec3Position): Vec3Position {
  return {
    qx: Math.min(ROOM_BOUNDS.qx.max, Math.max(ROOM_BOUNDS.qx.min, position.qx)),
    qy: Math.min(ROOM_BOUNDS.qy.max, Math.max(ROOM_BOUNDS.qy.min, position.qy)),
    qz: Math.min(ROOM_BOUNDS.qz.max, Math.max(ROOM_BOUNDS.qz.min, position.qz)),
  };
}

export function qToWorld(position: Vec3Position): [number, number, number] {
  const clamped = clampQPosition(position);
  return [U_WORLD[0] + clamped.qx, U_WORLD[1] + clamped.qz, U_WORLD[2] - clamped.qy];
}

export function worldToQ(world: [number, number, number]): Vec3Position {
  return clampQPosition({
    qx: world[0] - U_WORLD[0],
    qy: U_WORLD[2] - world[2],
    qz: world[1] - U_WORLD[1],
  });
}

export function formatComponent(value: number) {
  return value.toFixed(2);
}

export function isNearTarget(position: Vec3Position) {
  const dx = position.qx - TARGET_Q_POSITION.qx;
  const dy = position.qy - TARGET_Q_POSITION.qy;
  const dz = position.qz - TARGET_Q_POSITION.qz;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) < 0.28;
}