"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import HintBox from "@/components/ui/HintBox";

// ============================================================
// Forward Kinematics for a 2-link planar arm:
//   x = a₁·cos(θ₁) + a₂·cos(θ₁+θ₂)
//   y = a₁·sin(θ₁) + a₂·sin(θ₁+θ₂)
// ============================================================

interface TwoLinkState {
  theta1: number;   // degrees
  theta2: number;   // degrees
  a1: number;       // link 1 length (pixels in canvas space)
  a2: number;       // link 2 length (pixels in canvas space)
}

const DEFAULT_STATE: TwoLinkState = {
  theta1: 45,
  theta2: 30,
  a1: 120,
  a2: 90,
};

// Canvas coordinate helpers
function toRad(deg: number) { return (deg * Math.PI) / 180; }

function computeFK(state: TwoLinkState) {
  const t1 = toRad(state.theta1);
  const t2 = toRad(state.theta2);
  const t12 = t1 + t2;
  const j1x = 0;
  const j1y = 0;
  const j2x = state.a1 * Math.cos(t1);
  const j2y = state.a1 * Math.sin(t1);
  const eex = j2x + state.a2 * Math.cos(t12);
  const eey = j2y + state.a2 * Math.sin(t12);
  return { j1x, j1y, j2x, j2y, eex, eey };
}

type HighlightTarget = "theta1" | "theta2" | "a1" | "a2" | null;

export default function TwoLink2DArm() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  
  const [state, setState] = useState<TwoLinkState>(DEFAULT_STATE);
  const [highlight, setHighlight] = useState<HighlightTarget>(null);
  const [trail, setTrail] = useState<{ x: number; y: number }[]>([]);
  const [showTrail, setShowTrail] = useState(true);
  
  const trailRef = useRef(trail);
  useEffect(() => { trailRef.current = trail; }, [trail]);
  
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Limit trail length
  const maxTrail = 200;

  // Draw the arm on canvas
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    
    // Only resize canvas when dimensions actually change
    const targetW = Math.floor(w * dpr);
    const targetH = Math.floor(h * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
    
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    const s = stateRef.current;
    const fk = computeFK(s);
    const cx = w / 2;
    const cy = h / 2;
    
    // Transform: canvas origin at center, Y-up
    const tx = (x: number) => cx + x;
    const ty = (y: number) => cy - y;
    
    // Clear
    ctx.clearRect(0, 0, w, h);
    
    // Background - pure white for maximum contrast
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    
    // ----- Grid -----
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 0.5;
    const gridSize = 50;
    for (let x = cx % gridSize; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = cy % gridSize; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    
    // ----- Axes -----
    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 2;
    // X axis
    ctx.beginPath();
    ctx.moveTo(0, cy);
    ctx.lineTo(w, cy);
    ctx.stroke();
    // Y axis
    ctx.beginPath();
    ctx.moveTo(cx, 0);
    ctx.lineTo(cx, h);
    ctx.stroke();
    
    // Axis arrows
    ctx.fillStyle = "#64748b";
    // X arrow
    ctx.beginPath();
    ctx.moveTo(w - 8, cy);
    ctx.lineTo(w - 16, cy - 5);
    ctx.lineTo(w - 16, cy + 5);
    ctx.closePath();
    ctx.fill();
    // Y arrow
    ctx.beginPath();
    ctx.moveTo(cx, 8);
    ctx.lineTo(cx - 5, 16);
    ctx.lineTo(cx + 5, 16);
    ctx.closePath();
    ctx.fill();
    
    // Axis labels
    ctx.fillStyle = "#64748b";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("X", w - 20, cy - 12);
    ctx.fillText("Y", cx + 14, 16);
    
    // Origin label
    ctx.fillText("O", cx - 12, cy + 16);
    
    // ----- Trajectory trail -----
    if (showTrail && trailRef.current.length > 1) {
      ctx.strokeStyle = "rgba(239, 68, 68, 0.3)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      const first = trailRef.current[0];
      ctx.moveTo(tx(first.x), ty(first.y));
      for (let i = 1; i < trailRef.current.length; i++) {
        const pt = trailRef.current[i];
        ctx.lineTo(tx(pt.x), ty(pt.y));
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
    
    // ----- Link 1 -----
    const isA1Highlighted = highlight === "a1";
    ctx.strokeStyle = isA1Highlighted ? "#f59e0b" : "#2563eb";
    ctx.lineWidth = isA1Highlighted ? 14 : 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(tx(fk.j1x), ty(fk.j1y));
    ctx.lineTo(tx(fk.j2x), ty(fk.j2y));
    ctx.stroke();
    
    // Link 1 label
    ctx.fillStyle = "#1e40af";
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center";
    const mid1x = tx((fk.j1x + fk.j2x) / 2);
    const mid1y = ty((fk.j1y + fk.j2y) / 2);
    const offset1 = 20;
    // offset perpendicular to link
    const dx1 = fk.j2x - fk.j1x;
    const dy1 = fk.j2y - fk.j1y;
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    if (len1 > 0) {
      const px1 = -dy1 / len1 * offset1;
      const py1 = dx1 / len1 * offset1;
      ctx.fillText(`a₁=${s.a1}`, mid1x + px1, mid1y - py1);
    }
    
    // ----- Link 2 -----
    const isA2Highlighted = highlight === "a2";
    ctx.strokeStyle = isA2Highlighted ? "#f59e0b" : "#059669";
    ctx.lineWidth = isA2Highlighted ? 14 : 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(tx(fk.j2x), ty(fk.j2y));
    ctx.lineTo(tx(fk.eex), ty(fk.eey));
    ctx.stroke();
    
    // Link 2 label
    ctx.fillStyle = "#065f46";
    ctx.font = "bold 13px system-ui, sans-serif";
    const mid2x = tx((fk.j2x + fk.eex) / 2);
    const mid2y = ty((fk.j2y + fk.eey) / 2);
    const dx2 = fk.eex - fk.j2x;
    const dy2 = fk.eey - fk.j2y;
    const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    if (len2 > 0) {
      const px2 = -dy2 / len2 * offset1;
      const py2 = dx2 / len2 * offset1;
      ctx.fillText(`a₂=${s.a2}`, mid2x + px2, mid2y - py2);
    }
    
    // ----- Joint 1 (Base) -----
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.arc(tx(fk.j1x), ty(fk.j1y), 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Base cross
    ctx.strokeStyle = "#f8fafc";
    ctx.lineWidth = 2;
    const bs = 4;
    ctx.beginPath();
    ctx.moveTo(tx(fk.j1x) - bs, ty(fk.j1y));
    ctx.lineTo(tx(fk.j1x) + bs, ty(fk.j1y));
    ctx.moveTo(tx(fk.j1x), ty(fk.j1y) - bs);
    ctx.lineTo(tx(fk.j1x), ty(fk.j1y) + bs);
    ctx.stroke();
    
    // ----- Joint 2 -----
    const j2Color = highlight === "theta2" ? "#f59e0b" : "#3b82f6";
    ctx.fillStyle = j2Color;
    ctx.beginPath();
    ctx.arc(tx(fk.j2x), ty(fk.j2y), 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1d4ed8";
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Joint 2 label
    ctx.fillStyle = "#1e40af";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`θ₂=${s.theta2.toFixed(1)}°`, tx(fk.j2x) + 12, ty(fk.j2y) - 4);
    
    // ----- End Effector -----
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(tx(fk.eex), ty(fk.eey), 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#b91c1c";
    ctx.lineWidth = 2.5;
    ctx.stroke();
    
    // End effector crosshair
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 1.5;
    const es = 4;
    ctx.beginPath();
    ctx.moveTo(tx(fk.eex) - es, ty(fk.eey));
    ctx.lineTo(tx(fk.eex) + es, ty(fk.eey));
    ctx.moveTo(tx(fk.eex), ty(fk.eey) - es);
    ctx.lineTo(tx(fk.eex), ty(fk.eey) + es);
    ctx.stroke();
    
    // End effector label
    ctx.fillStyle = "#b91c1c";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(
      `EE (${(fk.eex / 2).toFixed(1)}, ${(fk.eey / 2).toFixed(1)})`,
      tx(fk.eex) + 14,
      ty(fk.eey) - 6
    );
    
    // ----- Angle Arcs -----
    // θ₁ arc (from X axis to link 1)
    ctx.strokeStyle = highlight === "theta1" ? "#f59e0b" : "#3b82f6";
    ctx.lineWidth = highlight === "theta1" ? 3 : 2;
    ctx.setLineDash(highlight === "theta1" ? [] : [3, 3]);
    ctx.beginPath();
    const arcR1 = 30;
    const t1r = toRad(s.theta1);
    ctx.arc(tx(0), ty(0), arcR1, -t1r, 0); // clockwise from X axis
    ctx.stroke();
    ctx.setLineDash([]);
    
    // θ₁ label
    const a1LabelAngle = -t1r / 2;
    const a1Lx = tx(Math.cos(a1LabelAngle) * (arcR1 + 18));
    const a1Ly = ty(Math.sin(a1LabelAngle) * (arcR1 + 18));
    ctx.fillStyle = highlight === "theta1" ? "#d97706" : "#2563eb";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`θ₁`, a1Lx, a1Ly);
    
    // θ₂ arc (from link 1 direction to link 2 direction)
    ctx.strokeStyle = highlight === "theta2" ? "#f59e0b" : "#10b981";
    ctx.lineWidth = highlight === "theta2" ? 3 : 2;
    ctx.setLineDash(highlight === "theta2" ? [] : [3, 3]);
    ctx.beginPath();
    const arcR2 = 25;
    const startAngle = -t1r; // link 1 direction (measured from X axis)
    const endAngle = -(t1r + toRad(s.theta2)); // link 2 direction
    if (s.theta2 >= 0) {
      ctx.arc(tx(fk.j2x), ty(fk.j2y), arcR2, endAngle, startAngle);
    } else {
      ctx.arc(tx(fk.j2x), ty(fk.j2y), arcR2, startAngle, endAngle, true);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    
    // θ₂ label
    const midArcAngle = -(t1r + toRad(s.theta2) / 2);
    const a2Lx = tx(fk.j2x + Math.cos(midArcAngle) * (arcR2 + 18));
    const a2Ly = ty(fk.j2y + Math.sin(midArcAngle) * (arcR2 + 18));
    ctx.fillStyle = highlight === "theta2" ? "#d97706" : "#059669";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`θ₂`, a2Lx, a2Ly);
    
    // ----- Dimension annotations -----
    // Dashed projection lines from end effector to axes
    ctx.strokeStyle = "rgba(148, 163, 184, 0.5)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    // To X axis
    ctx.beginPath();
    ctx.moveTo(tx(fk.eex), ty(fk.eey));
    ctx.lineTo(tx(fk.eex), ty(0));
    ctx.stroke();
    // To Y axis
    ctx.beginPath();
    ctx.moveTo(tx(fk.eex), ty(fk.eey));
    ctx.lineTo(tx(0), ty(fk.eey));
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Projection dots on axes
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(tx(fk.eex), ty(0), 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(tx(0), ty(fk.eey), 4, 0, Math.PI * 2);
    ctx.fill();
    
  }, [highlight, showTrail]);

  // Animation loop
  useEffect(() => {
    const loop = () => {
      draw();
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  // Resize observer
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [draw]);

  // Update trail
  useEffect(() => {
    const fk = computeFK(state);
    setTrail(prev => {
      const next = [...prev, { x: fk.eex, y: fk.eey }];
      if (next.length > maxTrail) return next.slice(-maxTrail);
      return next;
    });
  }, [state]);

  // Handlers with highlight tracking
  const updateTheta1 = useCallback((v: number) => {
    setHighlight("theta1");
    setState(prev => ({ ...prev, theta1: v }));
  }, []);
  
  const updateTheta2 = useCallback((v: number) => {
    setHighlight("theta2");
    setState(prev => ({ ...prev, theta2: v }));
  }, []);
  
  const updateA1 = useCallback((v: number) => {
    setHighlight("a1");
    setState(prev => ({ ...prev, a1: v }));
  }, []);
  
  const updateA2 = useCallback((v: number) => {
    setHighlight("a2");
    setState(prev => ({ ...prev, a2: v }));
  }, []);

  const resetAll = useCallback(() => {
    setHighlight(null);
    setState(DEFAULT_STATE);
    setTrail([]);
  }, []);

  // Current FK values
  const fk = computeFK(state);
  // Scale: 1 canvas unit = 1 "cm" for display (purely cosmetic scaling)
  const scaleFactor = 0.5; // pixels to display units
  const displayX = (fk.eex * scaleFactor).toFixed(2);
  const displayY = (fk.eey * scaleFactor).toFixed(2);

  // ---- Highlight-aware formula rendering ----
  const isHL = (t: HighlightTarget) => highlight === t;

  return (
    <div className="flex flex-col h-full">
      {/* ===== Header ===== */}
      <div className="flex items-center gap-3 px-8 pt-3 pb-3 shrink-0">
        <span className="flex-1" />
        <button
          onClick={() => setShowTrail(!showTrail)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition cursor-pointer ${
            showTrail
              ? "bg-red-50 border-red-200 text-red-600"
              : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
          }`}
        >
          {showTrail ? "Trail ON" : "Trail OFF"}
        </button>
        <button
          onClick={resetAll}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer"
        >
          Reset
        </button>
      </div>

      {/* ===== Content ===== */}
      <div className="flex-1 flex gap-5 px-8 pb-4 min-h-0 overflow-hidden">
        {/* Left: Canvas */}
        <div className="flex-[2] bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-w-0 relative">
          <canvas
            ref={canvasRef}
            className="w-full h-full block"
            style={{ touchAction: "none" }}
          />
          <HintBox hintLabel="Controls">
            <p>Drag θ₁, θ₂ sliders to rotate joints (−180°~180°)</p>
            <p>Change a₁, a₂ values to adjust link lengths</p>
            <p>Watch the formulas highlight in real-time</p>
            <p>Toggle "Trail ON/OFF" to show/hide end-effector path</p>
          </HintBox>
        </div>

        {/* Right: Controls + Formula */}
        <div className="w-[300px] shrink-0 flex flex-col gap-4 min-h-0 overflow-y-auto">
          {/* ----- Formula Panel ----- */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 shrink-0">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
              📐 Forward Kinematics Formula
            </p>
            
            {/* Formula 1: x */}
            <div className="mb-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-baseline gap-1 flex-wrap font-mono text-sm leading-relaxed">
                <span className="text-slate-600">x</span>
                <span className="text-slate-400">=</span>
                <span className={`font-bold px-0.5 rounded transition-colors ${isHL("a1") ? "bg-amber-100 text-amber-700" : "text-blue-600"}`}>
                  a₁
                </span>
                <span className="text-slate-600">cos</span>
                <span className={`font-bold px-0.5 rounded transition-colors ${isHL("theta1") ? "bg-amber-100 text-amber-700 ring-2 ring-amber-300" : "text-blue-600"}`}>
                  θ₁
                </span>
                <span className="text-slate-400">+</span>
                <span className={`font-bold px-0.5 rounded transition-colors ${isHL("a2") ? "bg-amber-100 text-amber-700" : "text-emerald-600"}`}>
                  a₂
                </span>
                <span className="text-slate-600">cos(</span>
                <span className={`font-bold px-0.5 rounded transition-colors ${isHL("theta1") ? "bg-amber-100 text-amber-700 ring-2 ring-amber-300" : "text-blue-600"}`}>
                  θ₁
                </span>
                <span className="text-slate-400">+</span>
                <span className={`font-bold px-0.5 rounded transition-colors ${isHL("theta2") ? "bg-amber-100 text-amber-700 ring-2 ring-amber-300" : "text-emerald-600"}`}>
                  θ₂
                </span>
                <span className="text-slate-600">)</span>
              </div>
            </div>

            {/* Formula 2: y */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-baseline gap-1 flex-wrap font-mono text-sm leading-relaxed">
                <span className="text-slate-600">y</span>
                <span className="text-slate-400">=</span>
                <span className={`font-bold px-0.5 rounded transition-colors ${isHL("a1") ? "bg-amber-100 text-amber-700" : "text-blue-600"}`}>
                  a₁
                </span>
                <span className="text-slate-600">sin</span>
                <span className={`font-bold px-0.5 rounded transition-colors ${isHL("theta1") ? "bg-amber-100 text-amber-700 ring-2 ring-amber-300" : "text-blue-600"}`}>
                  θ₁
                </span>
                <span className="text-slate-400">+</span>
                <span className={`font-bold px-0.5 rounded transition-colors ${isHL("a2") ? "bg-amber-100 text-amber-700" : "text-emerald-600"}`}>
                  a₂
                </span>
                <span className="text-slate-600">sin(</span>
                <span className={`font-bold px-0.5 rounded transition-colors ${isHL("theta1") ? "bg-amber-100 text-amber-700 ring-2 ring-amber-300" : "text-blue-600"}`}>
                  θ₁
                </span>
                <span className="text-slate-400">+</span>
                <span className={`font-bold px-0.5 rounded transition-colors ${isHL("theta2") ? "bg-amber-100 text-amber-700 ring-2 ring-amber-300" : "text-emerald-600"}`}>
                  θ₂
                </span>
                <span className="text-slate-600">)</span>
              </div>
            </div>
          </div>

          {/* ----- End Effector Position ----- */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 shrink-0">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
              🎯 End Effector Position
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-red-50 border border-red-100 text-center">
                <p className="text-[10px] text-red-400 uppercase tracking-wider mb-1">X Coordinate</p>
                <p className="text-2xl font-bold font-mono text-red-600 tabular-nums">{displayX}</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-center">
                <p className="text-[10px] text-blue-400 uppercase tracking-wider mb-1">Y Coordinate</p>
                <p className="text-2xl font-bold font-mono text-blue-600 tabular-nums">{displayY}</p>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-center">
              Position: ({displayX}, {displayY}) units
            </p>
          </div>

          {/* ----- Joint Angle Sliders ----- */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 shrink-0">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
              🔧 Interaction 1: Joint Angles
            </p>
            
            {/* θ₁ Slider */}
            <div className="mb-4">
              <div className="flex justify-between text-xs mb-1.5">
                <span className={`font-medium transition-colors ${isHL("theta1") ? "text-amber-600" : "text-slate-600"}`}>
                  θ₁ (Base Joint)
                </span>
                <span className={`font-bold tabular-nums transition-colors ${isHL("theta1") ? "text-amber-600" : "text-slate-800"}`}>
                  {state.theta1.toFixed(1)}°
                </span>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                step={0.5}
                value={state.theta1}
                onChange={e => updateTheta1(Number(e.target.value))}
                className={`w-full h-2 rounded-full appearance-none outline-none cursor-pointer transition-colors
                  ${isHL("theta1")
                    ? "bg-amber-200 [&::-webkit-slider-thumb]:bg-amber-500"
                    : "bg-slate-200 [&::-webkit-slider-thumb]:bg-blue-600"
                  }
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:shadow-md`}
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>-180°</span><span>180°</span>
              </div>
            </div>

            {/* θ₂ Slider */}
            <div className="mb-1">
              <div className="flex justify-between text-xs mb-1.5">
                <span className={`font-medium transition-colors ${isHL("theta2") ? "text-amber-600" : "text-slate-600"}`}>
                  θ₂ (Elbow Joint)
                </span>
                <span className={`font-bold tabular-nums transition-colors ${isHL("theta2") ? "text-amber-600" : "text-slate-800"}`}>
                  {state.theta2.toFixed(1)}°
                </span>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                step={0.5}
                value={state.theta2}
                onChange={e => updateTheta2(Number(e.target.value))}
                className={`w-full h-2 rounded-full appearance-none outline-none cursor-pointer transition-colors
                  ${isHL("theta2")
                    ? "bg-amber-200 [&::-webkit-slider-thumb]:bg-amber-500"
                    : "bg-slate-200 [&::-webkit-slider-thumb]:bg-emerald-600"
                  }
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:shadow-md`}
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>-180°</span><span>180°</span>
              </div>
            </div>
          </div>

          {/* ----- Link Length Inputs ----- */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 shrink-0">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3">
              📏 Interaction 2: Link Lengths
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`text-xs font-medium mb-1 block transition-colors ${isHL("a1") ? "text-amber-600" : "text-slate-600"}`}>
                  a₁ (Link 1)
                </label>
                <div className={`flex items-center rounded-lg border transition-colors overflow-hidden ${
                  isHL("a1") ? "border-amber-400 ring-2 ring-amber-200" : "border-slate-200"
                }`}>
                  <input
                    type="number"
                    min={20}
                    max={250}
                    step={1}
                    value={state.a1}
                    onChange={e => updateA1(Number(e.target.value))}
                    className="w-full px-2.5 py-2 text-sm font-mono font-bold outline-none text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400 pr-2.5">px</span>
                </div>
              </div>
              <div>
                <label className={`text-xs font-medium mb-1 block transition-colors ${isHL("a2") ? "text-amber-600" : "text-slate-600"}`}>
                  a₂ (Link 2)
                </label>
                <div className={`flex items-center rounded-lg border transition-colors overflow-hidden ${
                  isHL("a2") ? "border-amber-400 ring-2 ring-amber-200" : "border-slate-200"
                }`}>
                  <input
                    type="number"
                    min={20}
                    max={250}
                    step={1}
                    value={state.a2}
                    onChange={e => updateA2(Number(e.target.value))}
                    className="w-full px-2.5 py-2 text-sm font-mono font-bold outline-none text-slate-800"
                  />
                  <span className="text-[10px] text-slate-400 pr-2.5">px</span>
                </div>
              </div>
            </div>
          </div>

          {/* ----- Presets ----- */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 shrink-0">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              ⚡ Quick Presets
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Home", theta1: 0, theta2: 0, a1: 120, a2: 90 },
                { label: "Reach", theta1: 45, theta2: 0, a1: 120, a2: 90 },
                { label: "Bent", theta1: 30, theta2: 60, a1: 120, a2: 90 },
                { label: "Fold", theta1: 90, theta2: -120, a1: 120, a2: 90 },
                { label: "Long", theta1: 20, theta2: 30, a1: 150, a2: 120 },
                { label: "Short", theta1: 60, theta2: -45, a1: 60, a2: 50 },
              ].map(p => (
                <button
                  key={p.label}
                  onClick={() => {
                    setHighlight(null);
                    setState({ theta1: p.theta1, theta2: p.theta2, a1: p.a1, a2: p.a2 });
                    setTrail([]);
                  }}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-50
                    border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800
                    transition cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
