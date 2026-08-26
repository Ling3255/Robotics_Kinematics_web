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

      {/* Position equation with live values — one merged card */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Position Equation
          </p>
          <p className="font-mono text-[11px] text-slate-400">U = (0, 0, 0)</p>
        </div>

        {/* ᵁQ̄ = [qx qy qz]ᵀ column matrix — values update live as Q moves */}
        <div className="mt-3 flex items-center justify-center gap-3 text-slate-900">
          <span className="text-xl font-semibold italic">
            <sup className="mr-0.5 text-xs not-italic text-slate-500">U</sup>
            <span className="overline">Q</span>
            <span className="ml-2 not-italic">=</span>
          </span>
          <span className="flex items-stretch">
            <span className="w-[10px] self-stretch rounded-l-sm border-y-2 border-l-2 border-slate-800" />
            <span className="flex flex-col gap-1.5 px-3 py-1.5 text-base font-semibold">
              {([
                { axis: "x", value: qPosition.qx, color: "text-red-600" },
                { axis: "y", value: qPosition.qy, color: "text-slate-700" },
                { axis: "z", value: qPosition.qz, color: "text-blue-600" },
              ] as const).map(({ axis, value, color }) => (
                <span key={axis} className="flex items-baseline justify-between gap-3">
                  <span className="italic">q<sub className="text-xs not-italic">{axis}</sub></span>
                  <span className={`font-mono text-sm tabular-nums ${color}`}>{formatComponent(value)}</span>
                </span>
              ))}
            </span>
            <span className="w-[10px] self-stretch rounded-r-sm border-y-2 border-r-2 border-slate-800" />
          </span>
          <span className="text-xs font-medium text-slate-400">3 × 1 matrix</span>
        </div>

        {/* Symbol explanation */}
        <dl className="mt-4 space-y-1.5 text-xs leading-5 text-slate-500">
          <div className="flex gap-2">
            <dt className="shrink-0 font-bold text-slate-700">U</dt>
            <dd>The fixed reference frame — the robotic base (the corner of the room). It cannot move.</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 font-bold text-slate-700">Q</dt>
            <dd>The movable object (the ball), initially at U and moved to a new position.</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 font-bold text-red-600">Qx</dt>
            <dd>Distance from U to Q measured along the X (red) axis.</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 font-bold text-slate-700">Qy</dt>
            <dd>Distance from U to Q measured along the Y (black) axis.</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 font-bold text-blue-600">Qz</dt>
            <dd>Distance from U to Q measured along the Z (blue) axis.</dd>
          </div>

        </dl>
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