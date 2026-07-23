"use client";

import { useEffect, useRef } from "react";
import { formatMatrixValue } from "./types";

type RotationMatrix9 = number[];

interface RotationMatrixPanelProps {
  matrixRef: { current: RotationMatrix9 };
  isActive: boolean;
}

export default function RotationMatrixPanel({ matrixRef, isActive }: RotationMatrixPanelProps) {
  const mainRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const col1Refs = useRef<(HTMLSpanElement | null)[]>([]);
  const col2Refs = useRef<(HTMLSpanElement | null)[]>([]);
  const col3Refs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    let rafId: number;
    const tick = () => {
      const m = matrixRef.current;
      for (let i = 0; i < 9; i++) {
        const el = mainRefs.current[i];
        if (el) el.textContent = formatMatrixValue(m[i]);
      }
      for (let i = 0; i < 3; i++) {
        const el = col1Refs.current[i];
        if (el) el.textContent = formatMatrixValue(m[i * 3]);
      }
      for (let i = 0; i < 3; i++) {
        const el = col2Refs.current[i];
        if (el) el.textContent = formatMatrixValue(m[i * 3 + 1]);
      }
      for (let i = 0; i < 3; i++) {
        const el = col3Refs.current[i];
        if (el) el.textContent = formatMatrixValue(m[i * 3 + 2]);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [matrixRef]);

  const matrix = matrixRef.current;

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Rotation Matrix</p>
        <h2 className="mt-2 text-lg font-bold text-slate-900">Orientation as a Rotation Matrix</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Drag the sphere to rotate it. The rotation matrix R ∈ ℝ³ˣ³ updates in real time.
          Each column is the direction of the sphere's local X (red), Y (black), Z (blue) axes
          expressed in the world frame.
        </p>
      </div>

      <div className="rounded-2xl bg-slate-950 p-5 font-mono">
        <div className="flex items-center gap-6">
          <p className="text-lg font-bold text-white">R =</p>
          <div className="grid grid-cols-3 gap-x-4 gap-y-2 text-sm">
            {matrix.map((_, index) => (
              <span
                key={index}
                ref={(el) => {
                  mainRefs.current[index] = el;
                }}
                className="rounded bg-slate-800 px-2 py-1 text-center tabular-nums text-white"
              >
                {formatMatrixValue(matrix[index])}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold text-slate-800">Column Interpretation</h3>
        <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
            <p className="font-bold text-red-600">Col 1 → X-axis</p>
            {[0, 3, 6].map((idx, i) => (
              <p key={idx} className="font-mono text-slate-600 mt-1">
                <span ref={(el) => { col1Refs.current[i] = el; }}>
                  {formatMatrixValue(matrix[idx])}
                </span>
              </p>
            ))}
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-100 p-3 text-center">
            <p className="font-bold text-slate-700">Col 2 → Y-axis</p>
            {[1, 4, 7].map((idx, i) => (
              <p key={idx} className="font-mono text-slate-600 mt-1">
                <span ref={(el) => { col2Refs.current[i] = el; }}>
                  {formatMatrixValue(matrix[idx])}
                </span>
              </p>
            ))}
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-center">
            <p className="font-bold text-blue-600">Col 3 → Z-axis</p>
            {[2, 5, 8].map((idx, i) => (
              <p key={idx} className="font-mono text-slate-600 mt-1">
                <span ref={(el) => { col3Refs.current[i] = el; }}>
                  {formatMatrixValue(matrix[idx])}
                </span>
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-violet-50 p-4 text-sm leading-6 text-violet-800">
        <p className="font-bold">Rotation Matrix Properties</p>
        <ul className="mt-2 list-inside list-disc space-y-1 text-violet-700">
          <li>R<sup>T</sup>R = I (orthogonal)</li>
          <li>det(R) = +1 (right-handed)</li>
          <li>Columns = directions of local axes in world frame</li>
        </ul>
      </div>

      {isActive && (
        <p className="text-xs text-slate-400">
          Drag the sphere in the 3D view to rotate it. The matrix values update in real time.
        </p>
      )}
    </div>
  );
}