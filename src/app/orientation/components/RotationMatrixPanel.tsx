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
    <div className="flex h-full flex-col gap-2 overflow-auto rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">Rotation Matrix</p>
        <h2 className="mt-0.5 text-sm font-bold text-slate-900">Orientation as a Rotation Matrix</h2>
        <p className="mt-0.5 text-[11px] leading-5 text-slate-500">
          Drag the sphere to rotate. Each column is the direction of the local X (red), Y (black), Z (blue) axes in the world frame.
        </p>
      </div>

      <div className="rounded-xl bg-slate-950 p-3 font-mono">
        <div className="flex items-center gap-4">
          <p className="text-base font-bold text-white">R =</p>
          <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 text-xs">
            {matrix.map((_, index) => (
              <span
                key={index}
                ref={(el) => {
                  mainRefs.current[index] = el;
                }}
                className="rounded bg-slate-800 px-1.5 py-0.5 text-center tabular-nums text-white"
              >
                {formatMatrixValue(matrix[index])}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-slate-800">Column Interpretation</h3>
        <div className="mt-1 grid grid-cols-3 gap-1.5 text-[10px]">
          <div className="rounded-md border border-red-200 bg-red-50 p-1.5 text-center">
            <p className="font-bold text-red-600">Col 1 → X</p>
            {[0, 3, 6].map((idx, i) => (
              <p key={idx} className="font-mono text-slate-600 mt-0.5">
                <span ref={(el) => { col1Refs.current[i] = el; }}>
                  {formatMatrixValue(matrix[idx])}
                </span>
              </p>
            ))}
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-100 p-1.5 text-center">
            <p className="font-bold text-slate-700">Col 2 → Y</p>
            {[1, 4, 7].map((idx, i) => (
              <p key={idx} className="font-mono text-slate-600 mt-0.5">
                <span ref={(el) => { col2Refs.current[i] = el; }}>
                  {formatMatrixValue(matrix[idx])}
                </span>
              </p>
            ))}
          </div>
          <div className="rounded-md border border-blue-200 bg-blue-50 p-1.5 text-center">
            <p className="font-bold text-blue-600">Col 3 → Z</p>
            {[2, 5, 8].map((idx, i) => (
              <p key={idx} className="font-mono text-slate-600 mt-0.5">
                <span ref={(el) => { col3Refs.current[i] = el; }}>
                  {formatMatrixValue(matrix[idx])}
                </span>
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-violet-50 p-2.5 text-[11px] leading-5 text-violet-800">
        <p className="font-bold">Rotation Matrix Properties</p>
        <ul className="mt-1 list-inside list-disc space-y-0.5 text-violet-700">
          <li>R<sup>T</sup>R = I (orthogonal)</li>
          <li>det(R) = +1 (right-handed)</li>
          <li>Columns = local axes in world frame</li>
        </ul>
      </div>

      {isActive && (
        <p className="text-[10px] text-slate-400">
          Drag the sphere to rotate. Matrix values update in real time.
        </p>
      )}
    </div>
  );
}