/**
 * 2D 二连杆逆运动学 (解析解) — 公共库
 * 输入: 目标末端坐标 + 连杆长度
 * 输出: 关节角(度) + 是否可达
 * 两个解: elbow-up (默认) / elbow-down
 * 供 Mission 6 (逆运动学) 共用
 */

export interface IK2DInput {
  x: number;
  y: number;
  L1: number;
  L2: number;
}

export interface IK2DOutput {
  theta1: number; // °
  theta2: number; // °
  reachable: boolean;
}

/** 判断坐标是否在可达范围内 */
export function isReachable(x: number, y: number, L1: number, L2: number): boolean {
  const d = Math.sqrt(x * x + y * y);
  return d <= L1 + L2 + 0.001 && d >= Math.abs(L1 - L2) - 0.001;
}

/** 默认解: elbow-up */
export function inverse2D({ x, y, L1, L2 }: IK2DInput): IK2DOutput {
  if (!isReachable(x, y, L1, L2)) {
    // 投影到最近的可达点
    const d = Math.sqrt(x * x + y * y);
    const maxR = L1 + L2;
    const scale = d > maxR ? maxR / d : 1;
    return inverse2D({ x: x * scale, y: y * scale, L1, L2 });
  }

  const d = Math.sqrt(x * x + y * y);
  const cosT2 = (d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  const t2 = Math.acos(Math.max(-1, Math.min(1, cosT2)));
  const alpha = Math.atan2(y, x);
  const beta = Math.atan2(L2 * Math.sin(t2), L1 + L2 * Math.cos(t2));

  return {
    theta1: ((alpha - beta) * 180) / Math.PI,
    theta2: (t2 * 180) / Math.PI,
    reachable: true,
  };
}

/** elbow-down 解 */
export function inverse2DElbowDown({ x, y, L1, L2 }: IK2DInput): IK2DOutput {
  if (!isReachable(x, y, L1, L2)) {
    const d = Math.sqrt(x * x + y * y);
    const maxR = L1 + L2;
    const scale = d > maxR ? maxR / d : 1;
    return inverse2DElbowDown({ x: x * scale, y: y * scale, L1, L2 });
  }

  const d = Math.sqrt(x * x + y * y);
  const cosT2 = (d * d - L1 * L1 - L2 * L2) / (2 * L1 * L2);
  const t2 = -Math.acos(Math.max(-1, Math.min(1, cosT2)));
  const alpha = Math.atan2(y, x);
  const beta = Math.atan2(L2 * Math.sin(t2), L1 + L2 * Math.cos(t2));

  return {
    theta1: ((alpha - beta) * 180) / Math.PI,
    theta2: (t2 * 180) / Math.PI,
    reachable: true,
  };
}
