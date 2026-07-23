"use client";

import { formatComponent, type Vec3Position } from "./types";

interface PositionVectorPanelProps {
  qPosition: Vec3Position;
  completed: boolean;
  onPreset: (target: Vec3Position) => void;
}

export default function PositionVectorPanel({ qPosition, completed, onPreset }: PositionVectorPanelProps) {
  return (
    <div className="flex h-full flex-col gap-4 overflow-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Position Vector</p>
        <h2 className="mt-2 text-lg font-bold text-slate-900">Position of Q with respect to U</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Move Q inside the fixed reference frame U. Drag Q onto the Target marker — the vector and components update continuously.
        </p>
      </div>

      <div className="rounded-2xl bg-slate-950 p-4 font-mono text-sm text-white">
        <p className="text-slate-300">U = (0, 0, 0)</p>
        <p className="mt-3 text-lg font-bold">
          <sup>U</sup>Q = [{formatComponent(qPosition.qx)}, {formatComponent(qPosition.qy)}, {formatComponent(qPosition.qz)}]<sup>T</sup>
        </p>
      </div>

      <div className="grid gap-2 text-sm font-semibold">
        <p className="rounded-lg bg-red-50 px-3 py-2 text-red-600">X component: {formatComponent(qPosition.qx)}</p>
        <p className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">Y component: {formatComponent(qPosition.qy)}</p>
        <p className="rounded-lg bg-blue-50 px-3 py-2 text-blue-600">Z component: {formatComponent(qPosition.qz)}</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => onPreset({ qx: 2.65, qy: qPosition.qy, qz: qPosition.qz })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Move along X</button>
        <button type="button" onClick={() => onPreset({ qx: qPosition.qx, qy: 2.45, qz: qPosition.qz })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Move along Y</button>
        <button type="button" onClick={() => onPreset({ qx: qPosition.qx, qy: qPosition.qy, qz: 1.65 })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Move along Z</button>
        <button type="button" onClick={() => onPreset({ qx: 2.55, qy: 2.2, qz: 1.35 })} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">Move diagonally</button>
      </div>

      {completed && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold leading-6 text-emerald-700">
          Good job! The position of Q can be represented by a position vector relative to U.
        </div>
      )}
    </div>
  );
}