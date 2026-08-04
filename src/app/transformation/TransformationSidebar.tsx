"use client";

import * as THREE from "three";
import { SHARED } from "./shared";

export default function TransformationSidebar({ pos, showPosition, showOrientation, onTogglePosition, onToggleOrientation }: {
  pos: THREE.Vector3; showPosition: boolean; showOrientation: boolean;
  onTogglePosition: () => void; onToggleOrientation: () => void;
}) {
  const t = [pos.z, pos.x, pos.y];
  const rm = new THREE.Matrix4().makeRotationFromEuler(SHARED.rot);
  const re = rm.elements;
  const m = [re[0], re[1], re[2], 0, re[4], re[5], re[6], 0, re[8], re[9], re[10], 0, t[0], t[1], t[2], 1];
  const fmt = (n: number) => n.toFixed(2).padStart(6);

  return (
    <div className="w-[300px] shrink-0 bg-white border-l border-slate-200 flex flex-col overflow-y-auto">

      {/* Section 1: Position */}
      <div className="p-3">
        <button onClick={onTogglePosition}
          className={`w-full text-left text-[12px] font-semibold uppercase tracking-wider mb-2 px-3 py-1.5 rounded-lg border-2 transition cursor-pointer shadow-sm
            ${showPosition ? "bg-blue-50 border-blue-400 text-blue-700" : "bg-white border-slate-300 text-slate-400 hover:border-slate-400 hover:bg-slate-50"}`}
        ><span className="mr-2">{showPosition ? "🟦" : "⬜"}</span>Position</button>

        <div className="flex flex-col gap-2 font-mono text-sm">
          <div>
            <span className="text-slate-800 font-semibold">{`{U}`} = (0, 0, 0)</span>
            <span className="text-[11px] text-slate-400 ml-2">— Universal frame</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-800 font-semibold"><sup>B</sup>Q = [q<sub>X</sub> q<sub>Y</sub> q<sub>Z</sub>]<sup>T</sup> =</span>
            <span className="inline-flex items-stretch gap-0.5">
              <span className="w-1.5 bg-slate-300 rounded-l-sm" />
              <span className="flex flex-col py-1 px-2 bg-slate-50 text-sm gap-0.5">
                <span className="tabular-nums font-bold" style={{ color: "#ef4444" }}>{t[0].toFixed(2)}</span>
                <span className="tabular-nums font-bold" style={{ color: "#1e293b" }}>{t[1].toFixed(2)}</span>
                <span className="tabular-nums font-bold" style={{ color: "#3b82f6" }}>{t[2].toFixed(2)}</span>
              </span>
              <span className="w-1.5 bg-slate-300 rounded-r-sm" />
            </span>
          </div>
        </div>
      </div>

      <div className="mx-3 border-b border-slate-200" />

      {/* Section 2: Orientation */}
      <div className="p-3">
        <button onClick={onToggleOrientation}
          className={`w-full text-left text-[12px] font-semibold uppercase tracking-wider mb-2 px-3 py-1.5 rounded-lg border-2 transition cursor-pointer shadow-sm
            ${showOrientation ? "bg-purple-50 border-purple-400 text-purple-700" : "bg-white border-slate-300 text-slate-400 hover:border-slate-400 hover:bg-slate-50"}`}
        ><span className="mr-2">{showOrientation ? "🟪" : "⬜"}</span>Orientation</button>

          {/* Rotation angles */}
          <div className="flex gap-2 text-[10px] mb-2 items-center">
            {[
              { label: "θx", val: SHARED.rot.x, color: "#ef4444" },
              { label: "θy", val: SHARED.rot.y, color: "#1e293b" },
              { label: "θz", val: SHARED.rot.z, color: "#3b82f6" },
            ].map(({ label, val, color }) => (
              <div key={label} className="flex-1 text-center px-1 py-1 rounded bg-slate-50 border border-slate-100">
                <span className="text-slate-400">{label}</span>
                <span className="ml-1 font-mono font-bold" style={{ color }}>{(val * 180 / Math.PI).toFixed(1)}°</span>
              </div>
            ))}
            <button
              onClick={() => { SHARED.rot.set(0, 0, 0); }}
              className="shrink-0 px-2.5 py-1 rounded-md border-2 cursor-pointer transition bg-slate-50 border-slate-300 text-slate-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600 text-xs font-bold shadow-sm"
              title="Reset rotation"
            >
              ↺
            </button>
          </div>

        <div className="mt-2 flex flex-col gap-2 font-mono text-sm">
          <div className="flex items-center justify-between">
            <div className="font-semibold text-slate-800">
              <sup>U</sup><sub>B</sub>R = [<sup>U</sup>x̂<sub>B</sub> &nbsp; <sup>U</sup>ŷ<sub>B</sub> &nbsp; <sup>U</sup>ẑ<sub>B</sub>]
            </div>
          </div>
          <div className="flex items-center">
            <span className="w-[25px]" />
            <span className="font-mono text-sm text-slate-800 font-semibold mr-1">=</span>
            <div className="font-mono text-sm flex items-stretch gap-0.5">
              <span className="w-1.5 bg-purple-200 rounded-l-sm" />
              <div className="flex flex-col gap-0.5 py-1 px-2 bg-purple-50/50">
                {[0, 1, 2].map(row => (
                  <div key={row} className="flex gap-4">
                    {[0, 1, 2].map(col => (
                      <span key={col} className="w-9 text-center tabular-nums text-slate-800 font-bold">
                        {re[col * 4 + row].toFixed(2)}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
              <span className="w-1.5 bg-purple-200 rounded-r-sm" />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-3 border-b border-slate-200" />

      {/* Section 3: Homogeneous Transformation Matrix */}
      <div className="p-3">
        <div className="mb-2 px-4 py-2 rounded-lg border-2 border-amber-400 shadow-sm bg-amber-50 group relative">
          <p className="text-[12px] font-semibold text-amber-700 uppercase tracking-wider cursor-help">
            Homogeneous Transformation Matrix
          </p>
          {/* Tooltip */}
          <div className="absolute left-0 top-full mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 text-white text-[10px] leading-relaxed shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition pointer-events-none z-50">
            <p className="text-slate-300">Represents the combined effects of rotation and translation of a rigid body in 3D space.</p>
          </div>
        </div>

        {/* Formula */}
        <p className="text-[9px] font-mono text-slate-500 mb-1.5 text-center">
          <sup>U</sup><sub>B</sub>T =
          [ <span className="text-purple-600 font-semibold">R₃×₃</span> &nbsp;
            <span className="text-blue-600 font-semibold">q₃×₁</span> / &nbsp;
            <span className="text-slate-400">0<sup>T</sup></span> 1 ]
        </p>

        {/* 4×4 Matrix */}
        <div className="font-mono text-sm leading-relaxed mb-2">
          {[0, 1, 2, 3].map(row => (
            <div key={row} className="flex gap-0.5">
              <span className="w-1.5 bg-amber-300 rounded-l-sm shrink-0" />
              {[0, 1, 2, 3].map(col => {
                const val = m[col * 4 + row];
                const isR = col < 3 && row < 3;
                const isQ = col === 3 && row < 3;
                const isFixed = row === 3;
                const bg = isR ? "bg-purple-50 text-purple-700" : isQ ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-400";
                return (
                  <span key={col}
                    className={`w-[56px] text-right tabular-nums px-1 py-0.5 rounded font-bold ${bg}`}
                  >{fmt(val)}</span>
                );
              })}
              <span className="w-1.5 bg-amber-300 rounded-r-sm shrink-0" />
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="space-y-1.5 text-[9px] leading-relaxed">
          <div className="flex items-start gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-purple-200 shrink-0 mt-0.5" />
            <span className="text-slate-600"><span className="font-semibold text-purple-700">R₃×₃</span> — Rotation matrix <sup>U</sup><sub>B</sub>R. Columns: <sup>U</sup>x̂<sub>B</sub> (elements[0,1,2]), <sup>U</sup>ŷ<sub>B</sub> ([4,5,6]), <sup>U</sup>ẑ<sub>B</sub> ([8,9,10])</span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-200 shrink-0 mt-0.5" />
            <span className="text-slate-600">
              <span className="font-semibold text-blue-700">q₃×₁</span> = [q<sub>X</sub>, q<sub>Y</sub>, q<sub>Z</sub>]<sup>T</sup> — 前三行第四列放置平移向量 q<sub>X</sub>, q<sub>Y</sub>, q<sub>Z</sub> (elements[12],[13],[14])
            </span>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-200 shrink-0 mt-0.5" />
            <span className="text-slate-500"><span className="font-semibold text-slate-600">0<sup>T</sup>, 1</span> — Fixed homogeneous row, unaffected by rotation/translation</span>
          </div>
        </div>
      </div>
    </div>
  );
}
