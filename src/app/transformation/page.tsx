"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import TransformationScene from "./TransformationScene";
import TransformationSidebar from "./TransformationSidebar";
import { SHARED } from "./shared";
import * as THREE from "three";

function KeyCap({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`flex items-center justify-center ${wide ? "px-3" : "w-9"} h-9 rounded-lg bg-white border-2 border-slate-300 shadow-sm`}>
      <span className="text-[11px] font-bold text-slate-700 font-mono">{children}</span>
    </div>
  );
}

export default function TransformationPage() {
  const posRef = useRef(new THREE.Vector3(5, 1, 5));
  const [, tick] = useState(0);
  const [showHint, setShowHint] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [showPosition, setShowPosition] = useState(true);
  const [showOrientation, setShowOrientation] = useState(false);
  const sceneKey = useMemo(() => "tfm-" + Math.random().toString(36).slice(2, 10), []);

  // Reset state + force fresh Canvas on every page mount
  useEffect(() => {
    SHARED.pos.set(5, 1, 5);
    SHARED.rot.set(0, 0, 0);
    SHARED.dragging = false;
    posRef.current.set(5, 1, 5);
  }, []);

  useEffect(() => {
    const iv = setInterval(() => tick(n => n + 1), 100);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="flex h-[calc(100vh-112px)] w-full relative">
      <div className="flex-1 min-w-0 relative">
        <TransformationScene posRef={posRef} showPosition={showPosition} showOrientation={showOrientation} sceneKey={sceneKey} />
        {/* Scale legend */}
        <div className="absolute bottom-4 left-4 z-20 bg-white/90 backdrop-blur rounded-lg border border-slate-200 shadow-sm px-3 py-2">
          <p className="text-[10px] text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-700">Grid:</span> 1 unit per cell &nbsp;|&nbsp;
            <span className="font-semibold text-slate-700">Ball:</span> r = 1 unit
          </p>
        </div>

        {/* Floating control hint — near sidebar */}
        {showHint && (
          <div className="absolute top-4 right-4 z-20 bg-white/95 backdrop-blur rounded-xl border border-slate-200 shadow-lg p-5 w-[280px]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Movement Controls</span>
              <button
                onClick={() => { setShowHint(false); setDismissed(true); }}
                className="text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-0.5 rounded-md hover:bg-blue-50 cursor-pointer transition"
              >
                I got it ✕
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {/* WASD cluster visual */}
              <div className="flex flex-col items-center gap-1">
                <div className="grid grid-cols-3 gap-1.5">
                  <div />
                  <div className="flex flex-col items-center gap-0.5">
                    <KeyCap>W</KeyCap>
                    <span className="text-[9px] text-slate-400">↑</span>
                  </div>
                  <div />
                  <div className="flex flex-col items-center gap-0.5">
                    <KeyCap>A</KeyCap>
                    <span className="text-[9px] text-slate-400">←</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <KeyCap>S</KeyCap>
                    <span className="text-[9px] text-slate-400">↓</span>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <KeyCap>D</KeyCap>
                    <span className="text-[9px] text-slate-400">→</span>
                  </div>
                </div>
              </div>
              {/* Up/Down */}
              <div className="flex items-center justify-center gap-3">
                <div className="flex items-center gap-2">
                  <KeyCap wide>Space</KeyCap>
                  <span className="text-[10px] text-slate-400">Up</span>
                </div>
                <div className="flex items-center gap-2">
                  <KeyCap wide>Shift</KeyCap>
                  <span className="text-[10px] text-slate-400">Down</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sidebar + reopen button */}
      <div className="relative">
        <TransformationSidebar pos={posRef.current} showPosition={showPosition} showOrientation={showOrientation} onTogglePosition={() => setShowPosition(p => !p)} onToggleOrientation={() => setShowOrientation(p => !p)} />
        {dismissed && !showHint && (
          <button
            onClick={() => setShowHint(true)}
            className="absolute -left-8 top-4 w-6 h-16 bg-white border border-slate-200 rounded-l-lg flex items-center justify-center cursor-pointer hover:bg-slate-50 shadow-sm"
            title="Show controls"
          >
            <span className="text-slate-400 text-xs">◀</span>
          </button>
        )}
      </div>
    </div>
  );
}

