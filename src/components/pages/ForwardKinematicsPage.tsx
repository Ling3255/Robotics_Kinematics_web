"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { useBottomPanelStore } from "@/store/useBottomPanelStore";
import HintBox from "@/components/ui/HintBox";
import TwoLink2DArm from "./TwoLink2DArm";
import { CFG } from "@/components/three/ForwardKinematicsScene";

const ThreeCanvasWrapper = dynamic(
  () => import("@/components/three/ThreeCanvasWrapper"),
  { ssr: false }
);
const ForwardKinematicsScene = dynamic(
  () => import("@/components/three/ForwardKinematicsScene"),
  { ssr: false }
);

const SLIDERS = [
  { label: "θ₀  Base Spin", key: "theta0", min: CFG.angleMin[0], max: CFG.angleMax[0], def: CFG.angleDefault[0] },
  { label: "θ₁  Upper Arm", key: "theta1", min: CFG.angleMin[1], max: CFG.angleMax[1], def: CFG.angleDefault[1] },
  { label: "θ₂  Forearm", key: "theta2", min: CFG.angleMin[2], max: CFG.angleMax[2], def: CFG.angleDefault[2] },
  { label: "θ₃  Wrist", key: "theta3", min: CFG.angleMin[3], max: CFG.angleMax[3], def: CFG.angleDefault[3] },
  { label: "θ₄  Wrist Twist", key: "theta4", min: CFG.angleMin[4], max: CFG.angleMax[4], def: CFG.angleDefault[4] },
];

function AngleSlider({ label, value, min, max, onChange, highlight }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void; highlight?: boolean;
}) {
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs mb-1.5">
        <span className={`font-medium transition-colors ${highlight ? "text-amber-600" : "text-slate-600"}`}>{label}</span>
        <span className={`font-bold tabular-nums transition-colors ${highlight ? "text-amber-600" : "text-slate-800"}`}>{value.toFixed(1)}°</span>
      </div>
      <input type="range" min={min} max={max} step={0.5} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className={`w-full h-1.5 rounded-full appearance-none outline-none cursor-pointer transition-colors
          ${highlight
            ? "bg-amber-200 [&::-webkit-slider-thumb]:bg-amber-500"
            : "bg-slate-200 [&::-webkit-slider-thumb]:bg-blue-600"
          }
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:shadow-md`} />
      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
        <span>{min}°</span><span>{max}°</span>
      </div>
    </div>
  );
}

/** ----- Step 2: 3D Advanced Demo (preserving original 5-axis arm) ----- */
function Advanced3DDemo() {
  const [theta0, setTheta0] = useState(CFG.angleDefault[0]);
  const [theta1, setTheta1] = useState(CFG.angleDefault[1]);
  const [theta2, setTheta2] = useState(CFG.angleDefault[2]);
  const [theta3, setTheta3] = useState(CFG.angleDefault[3]);
  const [theta4, setTheta4] = useState(CFG.angleDefault[4]);
  const [mode2D, setMode2D] = useState(false);
  const [modelReady, setModelReady] = useState(false);
  const angles = [theta0, theta1, theta2, theta3, theta4];

  const toggle2D = useCallback(() => {
    setMode2D(prev => {
      const next = !prev;
      if (next) { setTheta0(0); setTheta4(0); }
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setTheta0(CFG.angleDefault[0]);
    setTheta1(CFG.angleDefault[1]);
    setTheta2(CFG.angleDefault[2]);
    setTheta3(CFG.angleDefault[3]);
    setTheta4(CFG.angleDefault[4]);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {/* ===== Header ===== */}
      <div className="flex items-center gap-3 px-8 pt-3 pb-3">
        <span className="px-4 py-2 text-[13px] font-medium rounded-lg bg-purple-700 text-white">
          Forward Kinematics — Advanced 3D
        </span>
        <span className="flex-1" />
        <button onClick={toggle2D}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition cursor-pointer
            ${mode2D ? "bg-amber-500 border-amber-400 text-white" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
          {mode2D ? "2D View ON" : "2D View"}
        </button>
        <button onClick={handleReset}
          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer">
          Reset Angles
        </button>
        {modelReady && (
          <span className="text-xs text-emerald-600 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />Model Ready
          </span>
        )}
      </div>

      {/* ===== Content ===== */}
      <div className="flex-1 flex gap-5 px-8 pb-4 min-h-0 overflow-hidden">
        {/* 3D Canvas */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-w-0 relative">
          <ThreeCanvasWrapper background="#f8fafc" orthographic={mode2D}>
            <ForwardKinematicsScene
              angles={angles}
              cameraMode={mode2D ? "side" : "3d"}
              onReady={(ok) => { setModelReady(ok); }}
            />
          </ThreeCanvasWrapper>
          <HintBox hintLabel="Controls">
            <p>Drag with left mouse button: rotate view</p>
            <p>Scroll: zoom in / out</p>
            <p>Right-drag: pan view</p>
            <p>Adjust the joint angle sliders to see how the arm moves</p>
          </HintBox>
        </div>

        {/* Right panel */}
        <div className="w-[240px] shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-4 overflow-y-auto">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Joint Angles
          </p>

          <AngleSlider label={SLIDERS[0].label} value={mode2D ? 0 : theta0}
            min={SLIDERS[0].min} max={SLIDERS[0].max} onChange={mode2D ? () => {} : setTheta0} />
          <AngleSlider label={SLIDERS[1].label} value={theta1}
            min={SLIDERS[1].min} max={SLIDERS[1].max} onChange={setTheta1} />
          <AngleSlider label={SLIDERS[2].label} value={theta2}
            min={SLIDERS[2].min} max={SLIDERS[2].max} onChange={setTheta2} />
          <AngleSlider label={SLIDERS[3].label} value={theta3}
            min={SLIDERS[3].min} max={SLIDERS[3].max} onChange={setTheta3} />
          <AngleSlider label={SLIDERS[4].label} value={mode2D ? 0 : theta4}
            min={SLIDERS[4].min} max={SLIDERS[4].max} onChange={mode2D ? () => {} : setTheta4} />

          <div className="pt-3 border-t border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Values</p>
            {angles.map((v, i) => (
              <div key={i} className="flex justify-between py-1 px-2">
                <span className="text-xs text-slate-500 font-mono">θ<sub>{i + 1}</sub></span>
                <span className="text-xs text-slate-800 font-mono font-bold">{v.toFixed(1)}°</span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-100">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Presets</p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { label: "Home", v: [0, 0, 0, 0, 0] },
                { label: "Reach", v: [0, 45, 30, 15, 0] },
                { label: "Fold", v: [0, 90, -60, -30, 0] },
                { label: "Twist", v: [45, 30, 45, 0, 90] },
              ].map(p => (
                <button key={p.label}
                  onClick={() => { setTheta0(p.v[0]); setTheta1(p.v[1]); setTheta2(p.v[2]); setTheta3(p.v[3]); setTheta4(p.v[4]); }}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-50
                    border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-800
                    transition cursor-pointer">
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

/** ----- Main Forward Kinematics Page with step-based navigation ----- */
export default function ForwardKinematicsPage() {
  const [step, setStep] = useState(1);
  const setBottomPanel = useBottomPanelStore((state) => state.setConfig);
  const resetBottomPanel = useBottomPanelStore((state) => state.resetConfig);

  useEffect(() => {
    const resetLesson = () => setStep(1);

    if (step === 1) {
      setBottomPanel({
        hint: "🟢 Teaching Mode: Explore the 2-link planar arm. Adjust θ₁, θ₂ sliders and a₁, a₂ lengths. Watch the formulas highlight in real-time!",
        checkDisabled: true,
        checkLabel: "Previous",
        nextDisabled: false,
        resetDisabled: false,
        onReset: resetLesson,
        onNext: () => setStep(2),
      });
      return;
    }

    if (step === 2) {
      setBottomPanel({
        hint: "🟣 Advanced Mode: Explore a full 5-axis 3D robotic arm. Drag to rotate, scroll to zoom. Compare with the 2-link arm from the Teaching step.",
        checkDisabled: false,
        checkLabel: "Back to Teaching",
        onCheck: () => setStep(1),
        nextDisabled: true,
        resetDisabled: false,
        onReset: resetLesson,
      });
      return;
    }
  }, [step, setBottomPanel]);

  useEffect(() => resetBottomPanel, [resetBottomPanel]);

  // ---- Step indicators at top ----
  const StepIndicator = () => (
    <div className="flex items-center gap-2 px-8 pt-2 pb-0">
      <button
        onClick={() => setStep(1)}
        className={`px-4 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
          step === 1
            ? "bg-emerald-600 border-emerald-500 text-white shadow-sm"
            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
        }`}
      >
        📐 Step 1: 2-Link Teaching
      </button>
      <button
        onClick={() => setStep(2)}
        className={`px-4 py-1.5 text-xs font-semibold rounded-lg border transition cursor-pointer ${
          step === 2
            ? "bg-purple-700 border-purple-600 text-white shadow-sm"
            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
        }`}
      >
        🦾 Step 2: 3D Advanced
      </button>
      <span className="flex-1" />
      <span className="text-[11px] text-slate-400">
        Mission 5: Forward Kinematics
      </span>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-112px)]">
      <StepIndicator />
      <div className="flex-1 min-h-0">
        {step === 1 ? <TwoLink2DArm /> : <Advanced3DDemo />}
      </div>
    </div>
  );
}
