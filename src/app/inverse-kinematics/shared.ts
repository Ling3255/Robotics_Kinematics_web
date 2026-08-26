// ============================================================
// Shared constants & helper helpers for the Inverse-Kinematics
// 5-part lesson.
// ============================================================

export const L1 = 50; // length of link 1 (base -> elbow)
export const L2 = 80; // length of link 2 (elbow -> end-effector)

export const R_MAX = L1 + L2; // outer radius of reachable workspace
export const R_MIN = Math.abs(L1 - L2); // inner radius of reachable workspace

export function deg2rad(deg: number) {
  return (deg * Math.PI) / 180;
}

export function rad2deg(rad: number) {
  return (rad * 180) / Math.PI;
}

export interface IKSolution {
  reachable: boolean;
  theta1?: number; // radians, base angle
  theta2?: number; // radians, elbow angle (relative to link 1)
  d?: number; // distance from base to target
}

/**
 * Analytic planar 2-link IK solver (law of cosines), mirrors the
 * logic of the public/inverse-kinematics-demo.html demo.
 */
export function solve2LinkIK(
  x: number,
  y: number,
  l1 = L1,
  l2 = L2,
  elbowUp = false
): IKSolution {
  const d = Math.hypot(x, y);
  const rmax = l1 + l2;
  const rmin = Math.abs(l1 - l2);
  // unreachable if outside the annulus, or exactly at the origin when rmin > 0
  if (d > rmax || d < rmin || d === 0) return { reachable: false, d };
  let cos2 = (x * x + y * y - l1 * l1 - l2 * l2) / (2 * l1 * l2);
  cos2 = Math.max(-1, Math.min(1, cos2));
  let theta2 = Math.acos(cos2);
  if (elbowUp) theta2 = -theta2;
  const k1 = l1 + l2 * Math.cos(theta2);
  const k2 = l2 * Math.sin(theta2);
  const theta1 = Math.atan2(y, x) - Math.atan2(k2, k1);
  return { reachable: true, theta1, theta2, d };
}

/** Compute joint + end-effector world positions from the two angles. */
export function armPositions(theta1: number, theta2: number) {
  const jx = L1 * Math.cos(theta1);
  const jy = L1 * Math.sin(theta1);
  const ex = jx + L2 * Math.cos(theta1 + theta2);
  const ey = jy + L2 * Math.sin(theta1 + theta2);
  return { jx, jy, ex, ey };
}

// Part definitions for the 5-part navigator -------------------
// (paths are relative to /inverse-kinematics)
export const IK_PARTS = [
  { part: 1, label: "What is IK", description: "Introduction", path: "/inverse-kinematics/intro" },
  { part: 2, label: "The 2-Link Arm", description: "Setup & formulas", path: "/inverse-kinematics/arm" },
  { part: 3, label: "Reachable Workspace", description: "Where the arm can reach", path: "/inverse-kinematics/workspace" },
  { part: 4, label: "Multiple Solutions", description: "Elbow up / down", path: "/inverse-kinematics/solutions" },
  { part: 5, label: "Interactive Demo", description: "Practice", path: "/inverse-kinematics/demo" },
  { part: 6, label: "Quiz", description: "Multiple choice questions", path: "/inverse-kinematics/quiz" },
] as const;

export const HOME_OF_MISSION = "/inverse-kinematics";
