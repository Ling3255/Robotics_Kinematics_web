/**
 * 2D 二连杆正运动学 — 公共库
 * 输入: 关节角(度) + 连杆长度
 * 输出: 关节1/2 坐标 + 末端坐标
 * 供 Mission 5 (正运动学) 和 Mission 6 (逆运动学) 共用
 */

export interface FK2DInput {
  theta1: number; // °
  theta2: number; // °
  L1: number;
  L2: number;
}

export interface FK2DOutput {
  j1: { x: number; y: number };
  j2: { x: number; y: number };
  ee: { x: number; y: number };
}

export function forward2D({ theta1, theta2, L1, L2 }: FK2DInput): FK2DOutput {
  const t1 = (theta1 * Math.PI) / 180;
  const t2 = (theta2 * Math.PI) / 180;

  const j1 = { x: 0, y: 0 };
  const j2 = {
    x: L1 * Math.cos(t1),
    y: L1 * Math.sin(t1),
  };
  const ee = {
    x: j2.x + L2 * Math.cos(t1 + t2),
    y: j2.y + L2 * Math.sin(t1 + t2),
  };

  return { j1, j2, ee };
}
