"use client";

import { useMemo } from "react";
import { forward2D, type FK2DInput } from "@/lib/kinematics/forward2D";

interface RobotArm2DProps {
  theta1: number;
  theta2: number;
  L1?: number;
  L2?: number;
  /** SVG viewport size in pixels */
  size?: number;
  /** Show angle labels */
  showAngles?: boolean;
  /** Show joint coordinates */
  showCoords?: boolean;
  /** End-effector highlight color */
  eeColor?: string;
}

const DEG = 180 / Math.PI;

export default function RobotArm2D({
  theta1,
  theta2,
  L1 = 1,
  L2 = 1,
  size = 300,
  showAngles = true,
  showCoords = false,
  eeColor = "#ef4444",
}: RobotArm2DProps) {
  const result = useMemo(
    () => forward2D({ theta1, theta2, L1, L2 }),
    [theta1, theta2, L1, L2]
  );

  // Scale: map world coords to SVG pixels
  const maxReach = L1 + L2;
  const margin = 40;
  const scale = (size - margin * 2) / (maxReach * 2.2);
  const cx = size / 2;
  const cy = size - margin;

  function worldToSVG(wx: number, wy: number) {
    return { x: cx + wx * scale, y: cy - wy * scale };
  }

  const base = worldToSVG(0, 0);
  const j2 = worldToSVG(result.j2.x, result.j2.y);
  const ee = worldToSVG(result.ee.x, result.ee.y);

  // Grid
  const gridLines = useMemo(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number }[] = [];
    const step = 0.5;
    for (let v = -maxReach; v <= maxReach; v += step) {
      const h = worldToSVG(v, 0);
      lines.push({ x1: h.x, y1: margin, x2: h.x, y2: size - margin });
      const vt = worldToSVG(0, v);
      lines.push({ x1: margin, y1: vt.y, x2: size - margin, y2: vt.y });
    }
    return lines;
  }, [size, scale, cx, cy, maxReach]);

  // Angle arcs
  const arc1 = useMemo(() => {
    if (!showAngles) return null;
    const r = 25;
    const t1 = (theta1 * Math.PI) / 180;
    const ex = cx + r * Math.cos(0);
    const ey = cy - r * Math.sin(0);
    const sx = cx + r * Math.cos(t1);
    const sy = cy - r * Math.sin(t1);
    const large = theta1 > 180 ? 1 : 0;
    return { cx, cy, r, sx, sy, ex, ey, large, label: `θ₁=${theta1.toFixed(1)}°`, lx: cx + (r + 40) * Math.cos(t1 / 2), ly: cy - (r + 40) * Math.sin(t1 / 2) };
  }, [showAngles, theta1, cx, cy]);

  const arc2 = useMemo(() => {
    if (!showAngles) return null;
    const r = 20;
    const t1 = (theta1 * Math.PI) / 180;
    const t2 = (theta2 * Math.PI) / 180;
    const sx = j2.x + r * Math.cos(t1 + Math.PI);
    const sy = j2.y - r * Math.sin(t1 + Math.PI);
    const ex = j2.x + r * Math.cos(t1 + t2);
    const ey = j2.y - r * Math.sin(t1 + t2);
    const large = theta2 > 180 ? 1 : 0;
    return { cx: j2.x, cy: j2.y, r, sx, sy, ex, ey, large, label: `θ₂=${theta2.toFixed(1)}°`, lx: j2.x + (r + 30) * Math.cos(t1 + t2 / 2), ly: j2.y - (r + 30) * Math.sin(t1 + t2 / 2) };
  }, [showAngles, theta2, j2.x, j2.y, theta1]);

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="mx-auto select-none"
    >
      {/* Grid */}
      {gridLines.map((l, i) => (
        <line key={i} {...l} stroke="#e2e8f0" strokeWidth="0.5" />
      ))}

      {/* Axes */}
      <line x1={cx} y1={0} x2={cx} y2={size} stroke="#94a3b8" strokeWidth="1" />
      <line x1={0} y1={cy} x2={size} y2={cy} stroke="#94a3b8" strokeWidth="1" />

      {/* Link 1 */}
      <line
        x1={base.x} y1={base.y}
        x2={j2.x} y2={j2.y}
        stroke="#3b82f6" strokeWidth="6" strokeLinecap="round"
      />
      {/* Link 2 */}
      <line
        x1={j2.x} y1={j2.y}
        x2={ee.x} y2={ee.y}
        stroke="#22c55e" strokeWidth="5" strokeLinecap="round"
      />

      {/* Base joint */}
      <circle cx={base.x} cy={base.y} r="8" fill="#1e293b" stroke="#fff" strokeWidth="2" />
      {/* Joint 2 */}
      <circle cx={j2.x} cy={j2.y} r="6" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
      {/* End effector */}
      <circle cx={ee.x} cy={ee.y} r="7" fill={eeColor} stroke="#fff" strokeWidth="2" />

      {/* Angle arcs */}
      {arc1 && (
        <>
          <path
            d={`M ${arc1.sx} ${arc1.sy} A ${arc1.r} ${arc1.r} 0 ${arc1.large} 1 ${arc1.ex} ${arc1.ey}`}
            fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2"
          />
          <text x={arc1.lx} y={arc1.ly} fontSize="11" fill="#f59e0b" fontWeight="600" textAnchor="middle">
            {arc1.label}
          </text>
        </>
      )}
      {arc2 && (
        <>
          <path
            d={`M ${arc2.sx} ${arc2.sy} A ${arc2.r} ${arc2.r} 0 ${arc2.large} 1 ${arc2.ex} ${arc2.ey}`}
            fill="none" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2"
          />
          <text x={arc2.lx} y={arc2.ly} fontSize="11" fill="#f59e0b" fontWeight="600" textAnchor="middle">
            {arc2.label}
          </text>
        </>
      )}

      {/* Joint coords */}
      {showCoords && (
        <>
          <text x={base.x + 12} y={base.y - 12} fontSize="10" fill="#64748b">(0,0)</text>
          <text x={j2.x + 10} y={j2.y - 10} fontSize="10" fill="#3b82f6">
            ({result.j2.x.toFixed(2)},{result.j2.y.toFixed(2)})
          </text>
          <text x={ee.x + 10} y={ee.y - 10} fontSize="10" fill={eeColor} fontWeight="600">
            ({result.ee.x.toFixed(2)},{result.ee.y.toFixed(2)})
          </text>
        </>
      )}

      {/* Reachable workspace ring */}
      <circle
        cx={cx} cy={cy}
        r={(L1 + L2) * scale}
        fill="none" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4"
      />
      <circle
        cx={cx} cy={cy}
        r={Math.abs(L1 - L2) * scale}
        fill="none" stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="2 4"
      />
    </svg>
  );
}
