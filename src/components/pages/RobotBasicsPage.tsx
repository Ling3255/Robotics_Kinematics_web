"use client";

import { useState, useCallback, useMemo } from "react";
import { ROBOT_PARTS, ASSEMBLY_ORDER } from "@/data/robotParts";
import { useProgressStore } from "@/store/useProgressStore";
import BottomPanel from "@/components/layout/BottomPanel";

type Section = "assembly" | "comparison";

// ============================================================
// PART GEOMETRY — actual mechanical shapes for each component
// ============================================================
const PART_COLORS: Record<string, string> = {
  base:          "#64748b",
  upper_arm:     "#3b82f6",
  forearm:       "#22c55e",
  wrist:         "#f59e0b",
  end_effector:  "#ef4444",
};

interface PartShape {
  id: string;
  label: string;
  cx: number; cy: number; // center of the shape
}

const ARM_LAYOUT: PartShape[] = [
  { id: "base",          label: "Base",          cx: 100, cy: 390 },
  { id: "upper_arm",     label: "Upper Arm",     cx: 100, cy: 290 },
  { id: "forearm",       label: "Forearm",       cx: 100, cy: 190 },
  { id: "wrist",         label: "Wrist",         cx: 100, cy: 120 },
  { id: "end_effector",  label: "End Effector",  cx: 100, cy: 55  },
];

// ============================================================
// SVG: Draw a single robot part as a geometric shape
// ============================================================
function DrawPart({ id, filled = true, scale = 1, cx = 0, cy = 0 }: {
  id: string;
  filled?: boolean;
  scale?: number;
  cx?: number;
  cy?: number;
}) {
  const s = scale;
  const color = PART_COLORS[id];

  const renderShape = () => {
    switch (id) {
      case "base":
        // Trapezoid mount
        return (
          <g>
            <polygon
              points={`${cx - 50*s},${cy + 14*s} ${cx + 50*s},${cy + 14*s} ${cx + 34*s},${cy - 14*s} ${cx - 34*s},${cy - 14*s}`}
              fill={filled ? color : "transparent"}
              stroke={filled ? "none" : color}
              strokeWidth="1.5"
              strokeDasharray={filled ? "0" : "4 2"}
            />
            {filled && <rect x={cx - 18*s} y={cy - 8*s} width={36*s} height={5*s} rx={2*s} fill="rgba(255,255,255,.25)" />}
          </g>
        );

      case "upper_arm":
        // Long beam with joint circles
        return (
          <g>
            <rect x={cx - 14*s} y={cy - 55*s} width={28*s} height={110*s} rx={6*s}
              fill={filled ? color : "transparent"}
              stroke={filled ? "none" : color}
              strokeWidth="1.5"
              strokeDasharray={filled ? "0" : "4 2"}
            />
            <circle cx={cx} cy={cy - 55*s} r={14*s} fill={filled ? "rgba(0,0,0,.15)" : "transparent"} stroke={filled ? "none" : color} strokeWidth="1" />
            <circle cx={cx} cy={cy + 55*s} r={16*s} fill={filled ? "rgba(0,0,0,.15)" : "transparent"} stroke={filled ? "none" : color} strokeWidth="1" />
            {filled && <circle cx={cx} cy={cy - 55*s} r={5*s} fill="rgba(255,255,255,.3)" />}
            {filled && <circle cx={cx} cy={cy + 55*s} r={5*s} fill="rgba(255,255,255,.3)" />}
          </g>
        );

      case "forearm":
        // Slightly thinner beam
        return (
          <g>
            <rect x={cx - 11*s} y={cy - 48*s} width={22*s} height={96*s} rx={5*s}
              fill={filled ? color : "transparent"}
              stroke={filled ? "none" : color}
              strokeWidth="1.5"
              strokeDasharray={filled ? "0" : "4 2"}
            />
            <circle cx={cx} cy={cy - 48*s} r={12*s} fill={filled ? "rgba(0,0,0,.15)" : "transparent"} stroke={filled ? "none" : color} strokeWidth="1" />
            <circle cx={cx} cy={cy + 48*s} r={13*s} fill={filled ? "rgba(0,0,0,.15)" : "transparent"} stroke={filled ? "none" : color} strokeWidth="1" />
            {filled && <circle cx={cx} cy={cy - 48*s} r={4*s} fill="rgba(255,255,255,.3)" />}
            {filled && <circle cx={cx} cy={cy + 48*s} r={4*s} fill="rgba(255,255,255,.3)" />}
          </g>
        );

      case "wrist":
        // Compact connector
        return (
          <g>
            <ellipse cx={cx} cy={cy} rx={18*s} ry={14*s}
              fill={filled ? color : "transparent"}
              stroke={filled ? "none" : color}
              strokeWidth="1.5"
              strokeDasharray={filled ? "0" : "4 2"}
            />
            <circle cx={cx} cy={cy - 14*s} r={6*s} fill={filled ? "rgba(0,0,0,.2)" : "transparent"} stroke={filled ? "none" : color} strokeWidth="1" />
            <circle cx={cx} cy={cy + 14*s} r={5*s} fill={filled ? "rgba(0,0,0,.2)" : "transparent"} stroke={filled ? "none" : color} strokeWidth="1" />
          </g>
        );

      case "end_effector":
        // Two-finger gripper
        return (
          <g>
            <rect x={cx - 18*s} y={cy - 10*s} width={36*s} height={12*s} rx={4*s}
              fill={filled ? color : "transparent"}
              stroke={filled ? "none" : color}
              strokeWidth="1.5"
              strokeDasharray={filled ? "0" : "4 2"}
            />
            <line x1={cx - 10*s} y1={cy + 2*s} x2={cx - 12*s} y2={cy + 28*s}
              stroke={filled ? color : color} strokeWidth={5*s} strokeLinecap="round" />
            <line x1={cx + 10*s} y1={cy + 2*s} x2={cx + 12*s} y2={cy + 28*s}
              stroke={filled ? color : color} strokeWidth={5*s} strokeLinecap="round" />
            {!filled && <line x1={cx - 12*s} y1={cy + 28*s} x2={cx - 14*s} y2={cy + 34*s} stroke={color} strokeWidth="4" strokeLinecap="round" />}
            {!filled && <line x1={cx + 12*s} y1={cy + 28*s} x2={cx + 14*s} y2={cy + 34*s} stroke={color} strokeWidth="4" strokeLinecap="round" />}
            {filled && <circle cx={cx - 12*s} cy={cy + 28*s} r={3*s} fill="rgba(255,255,255,.3)" />}
            {filled && <circle cx={cx + 12*s} cy={cy + 28*s} r={3*s} fill="rgba(255,255,255,.3)" />}
          </g>
        );

      default:
        return null;
    }
  };

  return renderShape();
}

// ============================================================
// SVG: Full Robot Arm Canvas
// ============================================================
function RobotArmCanvas({
  placedParts,
  highlightPartId,
}: {
  placedParts: Record<string, boolean>;
  highlightPartId?: string | null;
}) {
  const w = 200;
  const h = 440;

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mx-auto">
      {/* Grid */}
      <defs>
        <pattern id="g" width="24" height="24" patternUnits="userSpaceOnUse">
          <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#f1f5f9" strokeWidth="0.5" />
        </pattern>
      </defs>
      <rect width={w} height={h} fill="url(#g)" />

      {/* Mount surface line */}
      <line x1="20" y1="410" x2="180" y2="410" stroke="#e2e8f0" strokeWidth="2" />
      <line x1="20" y1="412" x2="180" y2="412" stroke="#e2e8f0" strokeWidth="4" />

      {/* Draw each part: either placed (filled) or ghost (outline) */}
      {ARM_LAYOUT.map((shape) => {
        const isPlaced = placedParts[shape.id];
        const isHighlighted = highlightPartId === shape.id;

        return (
          <g key={shape.id} style={{ transition: "all 0.3s ease" }}>
            {/* Highlight glow */}
            {isHighlighted && (
              <circle cx={shape.cx} cy={shape.cy} r={55} fill="rgba(59,130,246,.06)" />
            )}

            {/* Ghost outline when not placed */}
            {!isPlaced && (
              <>
                <DrawPart id={shape.id} filled={false} cx={shape.cx} cy={shape.cy} scale={isHighlighted ? 1.05 : 1} />
                {/* Label */}
                <text x={shape.cx + 42} y={shape.cy + 4}
                  textAnchor="start" fill={isHighlighted ? "#3b82f6" : "#94a3b8"}
                  fontSize="10" fontWeight={isHighlighted ? 600 : 400}
                  style={{ pointerEvents: "none" }}>
                  {shape.label}
                </text>
              </>
            )}

            {/* Filled part */}
            {isPlaced && (
              <DrawPart id={shape.id} filled={true} cx={shape.cx} cy={shape.cy} scale={isHighlighted ? 1.05 : 1} />
            )}

            {/* Subtle label for placed parts */}
            {isPlaced && (
              <text x={shape.cx + 42} y={shape.cy + 4}
                textAnchor="start" fill={PART_COLORS[shape.id]}
                fontSize="9" fontWeight={600} opacity="0.7"
                style={{ pointerEvents: "none" }}>
                {shape.label}
              </text>
            )}
          </g>
        );
      })}

      {/* Connector hatching between assembled parts */}
      {ARM_LAYOUT.map((shape, i) => {
        if (i === 0) return null;
        const prev = ARM_LAYOUT[i - 1];
        const bothPlaced = placedParts[prev.id] && placedParts[shape.id];
        return (
          <line key={`conn-${i}`}
            x1={shape.cx} y1={shape.cy + 30} x2={prev.cx} y2={prev.cy - 30}
            stroke={bothPlaced ? "#cbd5e1" : "transparent"}
            strokeWidth="1" strokeDasharray="2 2"
            style={{ transition: "all 0.5s ease" }}
          />
        );
      })}
    </svg>
  );
}

// ============================================================
// SECTION 1: PART ASSEMBLY
// ============================================================
function PartAssembly({ onComplete }: { onComplete: () => void }) {
  const [placedParts, setPlacedParts] = useState<Record<string, boolean>>({});
  const [activeDrag, setActiveDrag] = useState<string | null>(null);
  const [failedPart, setFailedPart] = useState<string | null>(null);

  const allPlaced = useMemo(() => ASSEMBLY_ORDER.every((id) => placedParts[id]), [placedParts]);
  const nextExpected = useMemo(() => ASSEMBLY_ORDER.find((id) => !placedParts[id]), [placedParts]);

  const tryPlace = useCallback((partId: string) => {
    const currentNext = ASSEMBLY_ORDER.find((id) => !placedParts[id]);
    if (partId === currentNext) {
      setPlacedParts((prev) => {
        const next = { ...prev, [partId]: true };
        if (Object.keys(next).length === ASSEMBLY_ORDER.length) {
          setTimeout(onComplete, 800);
        }
        return next;
      });
      setFailedPart(null);
    } else {
      setFailedPart(partId);
      setTimeout(() => setFailedPart(null), 500);
    }
    setActiveDrag(null);
  }, [placedParts, onComplete]);

  return (
    <div className="flex gap-8 h-full items-start">
      {/* Left: Parts tray — geometric shapes to drag */}
      <div className="w-[180px] flex-shrink-0 bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Parts
        </p>
        <div className="flex flex-col gap-6">
          {ROBOT_PARTS.map((part) => (
            <div
              key={part.id}
              draggable={!placedParts[part.id]}
              onDragStart={(e) => {
                if (placedParts[part.id]) return;
                e.dataTransfer.setData("text/plain", part.id);
                setActiveDrag(part.id);
              }}
              onDragEnd={() => setActiveDrag(null)}
              className={`
                flex flex-col items-center gap-1.5 select-none transition-all duration-200
                ${placedParts[part.id] ? "opacity-30 cursor-default" : "cursor-grab hover:scale-105"}
                ${failedPart === part.id ? "animate-shake" : ""}
              `}
              title={placedParts[part.id] ? "Placed" : part.description}
            >
              <svg width="80" height="50" viewBox="0 0 80 50">
                <g transform="translate(40, 25)">
                  <DrawPart id={part.id} filled={!placedParts[part.id]} scale={0.6}
                    cx={0} cy={0} />
                </g>
              </svg>
              <span className={`text-[11px] font-medium ${placedParts[part.id] ? "text-slate-300" : "text-slate-600"}`}>
                {part.name}
              </span>
              {placedParts[part.id] && (
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right: Assembly canvas */}
      <div
        className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center p-4"
        style={{ minHeight: 480 }}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
        onDrop={(e) => {
          e.preventDefault();
          const partId = e.dataTransfer.getData("text/plain");
          if (partId) tryPlace(partId);
        }}
      >
        <div className="flex-1 flex items-center justify-center">
          <RobotArmCanvas placedParts={placedParts} highlightPartId={allPlaced ? null : nextExpected} />
        </div>

        {allPlaced && (
          <p className="text-[12px] text-emerald-600 font-medium mt-2 animate-fade-up text-center max-w-xs">
            Assembly complete. This arm will be used in Missions 5 &amp; 6 for forward and inverse kinematics.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// SECTION 2: HUMAN-ROBOT COMPARISON
// ============================================================
function HumanArmOutline({ highlightPartId, onHover }: {
  highlightPartId: string | null;
  onHover: (id: string | null) => void;
}) {
  const zones = [
    { id: "base",          x: 20, y: 320, w: 140, h: 42, label: "Shoulder" },
    { id: "upper_arm",     x: 42, y: 200, w: 96,  h: 115, label: "Upper Arm" },
    { id: "forearm",       x: 46, y: 100, w: 88,  h: 95,  label: "Forearm" },
    { id: "wrist",         x: 56, y: 60,  w: 68,  h: 36,  label: "Wrist" },
    { id: "end_effector",  x: 42, y: 10,  w: 96,  h: 46,  label: "Hand" },
  ];

  return (
    <svg width="180" height="380" viewBox="0 0 180 380" className="mx-auto">
      <defs>
        <linearGradient id="bone" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(203,213,225,.7)" />
          <stop offset="100%" stopColor="rgba(148,163,184,.4)" />
        </linearGradient>
      </defs>

      {/* Shoulder girdle */}
      <ellipse cx="90" cy="348" rx="55" ry="14" fill="rgba(148,163,184,.2)" stroke="rgba(100,116,139,.3)" strokeWidth="1.5" />
      <line x1="30" y1="338" x2="150" y2="338" stroke="rgba(100,116,139,.25)" strokeWidth="6" strokeLinecap="round" />

      {/* Upper arm */}
      <rect x="60" y="210" width="60" height="108" rx="18" fill="url(#bone)" stroke="rgba(100,116,139,.3)" strokeWidth="1.5" />
      <ellipse cx="90" cy="220" rx="22" ry="10" fill="rgba(148,163,184,.35)" />

      {/* Elbow */}
      <circle cx="90" cy="180" r="13" fill="rgba(148,163,184,.35)" stroke="rgba(100,116,139,.35)" strokeWidth="1.8" />
      <circle cx="90" cy="180" r="5" fill="rgba(100,116,139,.45)" />

      {/* Forearm */}
      <line x1="72" y1="178" x2="62" y2="70" stroke="rgba(100,116,139,.3)" strokeWidth="10" strokeLinecap="round" />
      <line x1="106" y1="178" x2="114" y2="68" stroke="rgba(100,116,139,.25)" strokeWidth="9" strokeLinecap="round" />

      {/* Wrist */}
      <ellipse cx="88" cy="58" rx="28" ry="10" fill="rgba(148,163,184,.25)" stroke="rgba(100,116,139,.3)" strokeWidth="1.5" />

      {/* Hand */}
      <rect x="50" y="12" width="76" height="42" rx="8" fill="rgba(148,163,184,.2)" stroke="rgba(100,116,139,.25)" strokeWidth="1.5" />
      {[[60,14,56,-4],[70,14,68,-6],[80,14,80,-7],[90,14,92,-6],[100,14,104,-4]].map(([x1,y1,x2,y2],i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(100,116,139,.25)" strokeWidth="5" strokeLinecap="round" />
      ))}

      {/* Hover zones */}
      {zones.map(z => {
        const hl = highlightPartId === z.id;
        return (
          <g key={z.id}>
            <rect x={z.x} y={z.y} width={z.w} height={z.h} rx="6"
              fill={hl ? "rgba(59,130,246,.1)" : "transparent"}
              stroke={hl ? "#3b82f6" : "transparent"} strokeWidth="1.5"
              style={{ cursor: "pointer", transition: "all .2s" }}
              onMouseEnter={() => onHover(z.id)}
              onMouseLeave={() => onHover(null)}
            />
            {hl && (
              <text x={z.x + z.w / 2} y={z.y + z.h / 2 + 1}
                textAnchor="middle" dominantBaseline="middle"
                fill="#2563eb" fontSize="10" fontWeight="600"
                style={{ pointerEvents: "none" }}>
                {z.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function HumanRobotComparison({ onComplete }: { onComplete: () => void }) {
  const [hoveredPart, setHoveredPart] = useState<string | null>(null);
  const [quizAnswer, setQuizAnswer] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<"correct" | "wrong" | null>(null);

  const mapping = [
    { human: "Shoulder",      robot: "Base" },
    { human: "Upper Arm",     robot: "Upper Arm" },
    { human: "Forearm",       robot: "Forearm" },
    { human: "Wrist",         robot: "Wrist" },
    { human: "Hand / Fingers", robot: "End Effector" },
  ];

  const handleQuiz = (answer: string) => {
    setQuizAnswer(answer);
    if (answer === "end_effector") {
      setQuizResult("correct");
      setTimeout(onComplete, 1200);
    } else {
      setQuizResult("wrong");
      setTimeout(() => { setQuizAnswer(null); setQuizResult(null); }, 800);
    }
  };

  return (
    <div className="flex flex-col gap-5 h-full">
      {/* Side-by-side comparison */}
      <div className="flex gap-6 flex-1">
        {/* Human */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col items-center">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 self-start">
            Human Arm
          </p>
          <HumanArmOutline highlightPartId={hoveredPart} onHover={setHoveredPart} />
          <p className="text-[11px] text-slate-400 mt-2">Hover to highlight counterpart</p>
        </div>

        {/* Robot */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col items-center">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 self-start">
            Robot Arm
          </p>
          <RobotArmCanvas
            placedParts={Object.fromEntries(ASSEMBLY_ORDER.map(id => [id, true]))}
            highlightPartId={hoveredPart}
          />
          <p className="text-[11px] text-slate-400 mt-2">Your assembled model</p>
        </div>
      </div>

      {/* Mapping table */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Structure Mapping
        </p>
        <div className="grid grid-cols-5 gap-1.5">
          {mapping.map(m => {
            const hl = hoveredPart === m.robot.toLowerCase().replace(/ /g, "_");
            return (
              <div key={m.human}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all duration-150 cursor-default ${
                  hl ? "border-blue-300 bg-blue-50" : "border-slate-100 bg-slate-50"
                }`}
                onMouseEnter={() => {
                  const id = ROBOT_PARTS.find(p => p.name === m.robot)?.id;
                  if (id) setHoveredPart(id);
                }}
                onMouseLeave={() => setHoveredPart(null)}
              >
                <span className={`text-[10px] font-medium ${hl ? "text-blue-700" : "text-slate-500"}`}>
                  {m.human}
                </span>
                <span className="text-[9px] text-slate-300">↕</span>
                <span className={`text-[10px] font-semibold ${hl ? "text-blue-700" : "text-slate-700"}`}>
                  {m.robot}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quiz */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Check
        </p>
        <p className="text-sm font-medium text-slate-700 mb-3">
          The robot&apos;s &ldquo;hand&rdquo; that grips objects is called the:
        </p>
        <div className="flex gap-2">
          {[
            { id: "base",          label: "Base" },
            { id: "upper_arm",     label: "Upper Arm" },
            { id: "end_effector",  label: "End Effector" },
          ].map(opt => {
            const sel = quizAnswer === opt.id;
            const ok = opt.id === "end_effector";
            let cls = "border-slate-200 bg-white text-slate-600 hover:border-slate-300";
            if (sel && quizResult === "correct" && ok) cls = "border-emerald-400 bg-emerald-50 text-emerald-700";
            else if (sel && quizResult === "wrong") cls = "border-red-400 bg-red-50 text-red-700";
            return (
              <button key={opt.id}
                onClick={() => handleQuiz(opt.id)}
                disabled={quizResult === "correct"}
                className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all cursor-pointer ${cls}`}>
                {opt.label}
              </button>
            );
          })}
        </div>
        {quizResult === "correct" && (
          <p className="text-emerald-600 text-xs font-medium mt-2 animate-fade-up">
            Correct. The end effector is the &ldquo;hand&rdquo; that performs gripping and manipulation.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function RobotBasicsPage() {
  const [section, setSection] = useState<Section>("assembly");
  const { completeTask } = useProgressStore();

  return (
    <div className="flex flex-col h-[calc(100vh-112px)]">
      {/* Section tabs */}
      <div className="flex items-center gap-0 px-8 pt-5 pb-3">
        <button
          onClick={() => setSection("assembly")}
          className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-all cursor-pointer
            ${section === "assembly" ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}>
          1. Part Assembly
        </button>
        <span className="text-slate-300 mx-1">·</span>
        <button
          onClick={() => setSection("comparison")}
          className={`px-4 py-2 text-[13px] font-medium rounded-lg transition-all cursor-pointer
            ${section === "comparison" ? "bg-slate-800 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}>
          2. Human-Robot Comparison
        </button>
        <div className="flex-1" />
        <span className="text-[11px] text-slate-400">
          Mission 1 — Robot Arm Basics
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 pb-4 overflow-y-auto">
        {section === "assembly"
          ? <PartAssembly onComplete={() => completeTask(1, 0)} />
          : <HumanRobotComparison onComplete={() => completeTask(1, 1)} />
        }
      </div>

      <BottomPanel
        hint={
          section === "assembly"
            ? "Drag each geometric part onto the canvas to assemble your arm from base to tip. This model will carry through to all later kinematics missions."
            : "A robotic arm mirrors human anatomy. Hover over the human skeleton to see how each biological structure maps to your robot."
        }
        checkDisabled={section !== "comparison"}
        checkLabel="Submit"
        nextDisabled={false}
      />
    </div>
  );
}
