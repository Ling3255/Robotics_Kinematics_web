"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import HintBox from "@/components/ui/HintBox";

// ============================================================
// Phase type: labelMatch → assembly → quiz → summary
// ============================================================
type Phase = "labelMatch" | "assembly" | "quiz" | "summary";

const LABEL: Record<string, string> = {
  "asssemble - base-1": "Base", "asssemble - joints-1": "Joint 1", "asssemble - joints-2": "Joint 2", "asssemble - joints-3": "Joint 3",
  "asssemble - links-1": "Link 1", "asssemble - links-2": "Link 2", "asssemble - End effort-1": "End Effector",
};
const ORDER = ["asssemble - base-1","asssemble - joints-1","asssemble - links-1","asssemble - joints-2","asssemble - links-2","asssemble - joints-3","asssemble - End effort-1"];
const IMG: Record<string, string> = {
  "asssemble - base-1": "/images/base-1.png", "asssemble - joints-1": "/images/joints-1.png", "asssemble - joints-2": "/images/joints-2.png", "asssemble - joints-3": "/images/joints-3.png",
  "asssemble - links-1": "/images/links-1.png", "asssemble - links-2": "/images/links-2.png", "asssemble - End effort-1": "/images/End effort-1.png",
};
const SNAP = 0.4;
useGLTF.preload("/models/assemble.glb");

const S = { mx: 0, my: 0, part: null as string | null, snap: false };
const CACHE = { g: new Map<string, THREE.BufferGeometry>(), q: new Map<string, THREE.Quaternion>(), s: new Map<string, THREE.Vector3>(), c: new Map<string, THREE.Color>() };

// ============================================================
// Label match config — 4 category labels to 4 zone areas
// ============================================================
const LABEL_CATEGORIES = [
  { id: "base", label: "Base", color: "#64748b", hint: "The fixed bottom support" },
  { id: "joint", label: "Joint", color: "#f59e0b", hint: "Rotating connection points" },
  { id: "link", label: "Link", color: "#3b82f6", hint: "Rigid connecting segments" },
  { id: "endeffector", label: "End Effector", color: "#ef4444", hint: "The gripper / tool at tip" },
];

// ============================================================
// 3D Scene — supports both label-match and assembly modes
// ============================================================
function Scene({ placed, onPlace, phase }: {
  placed: Set<string>;
  onPlace: React.MutableRefObject<((n: string) => void) | null>;
  phase: Phase;
}) {
  const gltf = useGLTF("/models/assemble.glb");
  const { scene, camera } = useThree();
  const rc = useRef(new THREE.Raycaster());
  const pl = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.03));
  const meshRef = useRef<THREE.Mesh | null>(null);
  const last = useRef<string | null>(null);

  useEffect(() => {
    const g = new THREE.SphereGeometry(0.5, 16, 16);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: "red", roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.7 }));
    m.visible = false; m.renderOrder = 999; scene.add(m); meshRef.current = m;
    return () => { scene.remove(m); g.dispose(); (m.material as THREE.Material).dispose(); };
  }, [scene]);

  const items = useMemo(() => {
    gltf.scene.position.set(0, 0, 0); gltf.scene.updateMatrixWorld();
    const b = new THREE.Box3().setFromObject(gltf.scene);
    gltf.scene.position.set(0.6 - (b.min.x + b.max.x) / 2, 0.08 - b.min.y, 0.4 - (b.min.z + b.max.z) / 2);
    gltf.scene.updateMatrixWorld();
    const arr: { name: string; geo: THREE.BufferGeometry; mat: THREE.Material; pt: THREE.Vector3; qt: THREE.Quaternion }[] = [];
    gltf.scene.traverse(o => {
      const m = o as THREE.Mesh; if (!m.isMesh) return;
      const raw = m.name.replace(/[_\-\s.]+/g, "").toLowerCase();
      const match = ORDER.find(x => raw.includes(x.replace(/[_\-\s]+/g, "").toLowerCase()));
      const n = match || ORDER[0];
      const wp = new THREE.Vector3(); m.getWorldPosition(wp);
      const wq = new THREE.Quaternion(); m.getWorldQuaternion(wq);
      const origColor = (m.material as THREE.MeshStandardMaterial).color.clone();
      CACHE.g.set(n, m.geometry); CACHE.q.set(n, wq); CACHE.s.set(n, wp); CACHE.c.set(n, origColor);
      arr.push({ name: n, geo: m.geometry, mat: (m.material as THREE.Material).clone(), pt: wp, qt: wq });
    });
    arr.sort((a, b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name));
    return arr;
  }, [gltf]);

  // Only run drag logic in assembly phase
  const isAssembly = phase === "assembly";
  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    if (!S.part && last.current) {
      if (S.snap && last.current === ORDER.find(n => !placed.has(n))) {
        onPlace.current?.(last.current);
      }
      mesh.visible = false;
      last.current = null; S.snap = false;
    }

    if (!isAssembly) return;

    if (S.part !== last.current) {
      last.current = S.part;
      if (S.part) {
        const g = CACHE.g.get(S.part), q = CACHE.q.get(S.part);
        if (g && q) {
          mesh.geometry = g; mesh.quaternion.copy(q);
          const c = CACHE.c.get(S.part);
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (c) { mat.color.copy(c); mat.emissive?.copy(c); }
          mat.emissiveIntensity = 0.3;
          mat.roughness = 0.3; mat.metalness = 0.2;
          mat.opacity = 0.65; mat.transparent = true;
          mesh.visible = true; mesh.position.set(0, 5, 0);
        }
      }
    }

    if (!S.part || !mesh.visible) return;

    rc.current.setFromCamera(new THREE.Vector2(S.mx, S.my), camera);
    const h = new THREE.Vector3();
    if (rc.current.ray.intersectPlane(pl.current, h)) {
      const pos = h.add(new THREE.Vector3(0, 0.04, 0));
      mesh.position.copy(pos);
      const nxt = ORDER.find(n => !placed.has(n));
      if (nxt === S.part) {
        const sock = CACHE.s.get(nxt);
        if (sock && new THREE.Vector2(pos.x - sock.x, pos.z - sock.z).length() < SNAP) {
          mesh.position.copy(sock.clone().add(new THREE.Vector3(0, 0.04, 0)));
          S.snap = true;
        } else S.snap = false;
      }
    }
  });

  // In label-match phase, show all parts as wireframe
  // In assembly phase, show placed parts solid and unplaced as wireframe
  const showAllWireframe = phase === "labelMatch";

  return (<>
    <ambientLight intensity={0.9} />
    <directionalLight position={[5, 10, 5]} intensity={1.4} />
    <directionalLight position={[-3, 4, -3]} intensity={0.4} />
    <mesh position={[0, -0.04, 0]}><boxGeometry args={[20, 0.14, 14]} /><meshStandardMaterial color="#d1d5db" roughness={0.5} metalness={0.05} /></mesh>
    <mesh position={[0, 0.03, 0]}><boxGeometry args={[20.2, 0.03, 14.2]} /><meshStandardMaterial color="#9ca3af" roughness={0.3} metalness={0.15} /></mesh>
    <gridHelper args={[20, 20, "#e5e7eb", "#e5e7eb"]} position={[0, 0.05, 0]} />
    {items.map(item => {
      const ok = placed.has(item.name);
      const mat = item.mat as THREE.MeshStandardMaterial;
      if (showAllWireframe) {
        // Label match: all parts visible as wireframe
        mat.wireframe = true; mat.transparent = true; mat.opacity = 0.35;
        mat.color.set("#64748b");
      } else if (ok) {
        mat.wireframe = false; mat.transparent = false; mat.opacity = 1;
        const orig = CACHE.c.get(item.name);
        if (orig) mat.color.copy(orig);
      } else {
        mat.wireframe = true; mat.transparent = true; mat.opacity = 0.3;
        mat.color.set("#64748b");
      }
      return <mesh key={item.name} geometry={item.geo} position={item.pt} quaternion={item.qt} material={mat} />;
    })}
    <OrbitControls enablePan enableZoom enableRotate minDistance={2.5} maxDistance={16} maxPolarAngle={Math.PI / 2.5} target={[0, 2, 0]} enabled />
  </>);
}

// ============================================================
// PHASE 1: Label Match — drag category labels to correct zones
// ============================================================
function LabelMatchPhase({ onComplete }: { onComplete: () => void }) {
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [dragging, setDragging] = useState<string | null>(null);
  const [bounceLabel, setBounceLabel] = useState<string | null>(null);
  const [hintMsg, setHintMsg] = useState("Drag each label onto the matching part of the robot arm.");

  const allMatched = matched.size === LABEL_CATEGORIES.length;

  useEffect(() => {
    if (allMatched) {
      setHintMsg("All labels matched correctly! Moving to assembly...");
      const t = setTimeout(onComplete, 1200);
      return () => clearTimeout(t);
    }
  }, [allMatched, onComplete]);

  const handleDrop = useCallback((zoneId: string, labelId: string) => {
    if (zoneId === labelId) {
      setMatched(prev => { const u = new Set(prev); u.add(labelId); return u; });
      const cat = LABEL_CATEGORIES.find(c => c.id === labelId);
      setHintMsg(`Correct! ${cat?.label} identified.`);
      setBounceLabel(null);
    } else {
      setBounceLabel(labelId);
      const cat = LABEL_CATEGORIES.find(c => c.id === labelId);
      const zoneCat = LABEL_CATEGORIES.find(c => c.id === zoneId);
      setHintMsg(`That's not the ${zoneCat?.label}. Try placing ${cat?.label} on the correct part.`);
      setTimeout(() => setBounceLabel(null), 600);
    }
  }, []);

  return (
    <div className="flex-1 flex gap-5 px-8 pb-4 min-h-0">
      {/* Left: draggable category labels */}
      <div className="w-[220px] shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-4 overflow-y-auto">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Category Labels</p>
        <p className="text-[10px] text-slate-400 leading-relaxed -mt-2">Drag each label to the matching part on the 3D model.</p>
        {LABEL_CATEGORIES.map(cat => {
          const isMatched = matched.has(cat.id);
          const isBouncing = bounceLabel === cat.id;
          return (
            <div
              key={cat.id}
              draggable={!isMatched}
              onDragStart={(e) => {
                if (isMatched) return;
                e.dataTransfer.setData("text/plain", cat.id);
                e.dataTransfer.effectAllowed = "move";
                setDragging(cat.id);
              }}
              onDragEnd={() => setDragging(null)}
              className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all select-none
                ${isMatched
                  ? "border-emerald-200 bg-emerald-50/50 cursor-default"
                  : `cursor-grab active:cursor-grabbing hover:shadow-md ${isBouncing ? "animate-shake border-red-400 bg-red-50" : "border-slate-200 bg-white hover:border-slate-400"}`}
              `}
              style={{ ...(isMatched ? {} : { borderLeftWidth: "4px", borderLeftColor: cat.color }) }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: cat.color + "20" }}>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className={`text-[12px] font-semibold ${isMatched ? "text-emerald-600" : "text-slate-700"}`}>{cat.label}</span>
                <span className="text-[10px] text-slate-400 truncate">{cat.hint}</span>
              </div>
              {isMatched && (
                <svg className="w-5 h-5 text-emerald-400 shrink-0 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          );
        })}
        {allMatched && (
          <div className="mt-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center animate-fade-up">
            <p className="text-[12px] font-semibold text-emerald-600">All labels matched!</p>
          </div>
        )}
      </div>

      {/* Right: 3D canvas with drop zones overlaid */}
      <div id="cvs" className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
        <Canvas camera={{ position: [0, 7, -9], fov: 50, near: 0.5, far: 200 }} gl={{ antialias: true }} style={{ background: "#f8fafc" }}>
          <Scene placed={new Set()} onPlace={{ current: null }} phase="labelMatch" />
        </Canvas>

        {/* Drop zone overlays — positioned approximately at robot arm part locations */}
        {[
          { id: "base", top: "78%", left: "50%", w: "120px", h: "50px", label: "Base area" },
          { id: "joint", top: "40%", left: "50%", w: "100px", h: "120px", label: "Joint areas" },
          { id: "link", top: "55%", left: "38%", w: "130px", h: "100px", label: "Link areas" },
          { id: "endeffector", top: "12%", left: "50%", w: "100px", h: "65px", label: "End Effector area" },
        ].map(zone => {
          const isFilled = matched.has(zone.id);
          const isHovered = dragging !== null && !isFilled;
          return (
            <div
              key={zone.id}
              data-dropzone={zone.id}
              className={`absolute z-10 rounded-xl border-2 border-dashed transition-all duration-300 pointer-events-auto
                ${isFilled
                  ? "border-emerald-400 bg-emerald-100/40"
                  : isHovered
                    ? "border-blue-400 bg-blue-50/50 scale-105"
                    : "border-slate-300 bg-slate-50/30 hover:border-slate-400 hover:bg-slate-100/40"}
              `}
              style={{
                top: zone.top, left: zone.left,
                width: zone.w, height: zone.h,
                transform: "translate(-50%, -50%)",
              }}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
              onDrop={(e) => {
                e.preventDefault();
                const labelId = e.dataTransfer.getData("text/plain");
                if (labelId) handleDrop(zone.id, labelId);
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-[10px] font-medium pointer-events-none transition-colors
                  ${isFilled ? "text-emerald-600" : isHovered ? "text-blue-600" : "text-slate-400"}`}>
                  {isFilled
                    ? `✓ ${LABEL_CATEGORIES.find(c => c.id === zone.id)?.label}`
                    : zone.label}
                </span>
              </div>
            </div>
          );
        })}

        <HintBox hintLabel="How to play">
          <p>Drag each category label from the left panel</p>
          <p>Drop onto the matching zone on the robot arm</p>
          <p>Base → bottom / Joint → middle connectors</p>
          <p>Link → long segments / End Effector → top gripper</p>
        </HintBox>
      </div>
    </div>
  );
}

// ============================================================
// PHASE 3: Quiz — fill-in-the-blank for part counts
// ============================================================
function QuizPhase({ onComplete, snapshot }: { onComplete: () => void; snapshot: string | null }) {
  const [answers, setAnswers] = useState({ base: "", joints: "", links: "", endEffector: "" });
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  const correctAnswers = { base: "1", joints: "3", links: "2", endEffector: "1" };

  const handleSubmit = () => {
    const isCorrect =
      answers.base.trim() === correctAnswers.base &&
      answers.joints.trim() === correctAnswers.joints &&
      answers.links.trim() === correctAnswers.links &&
      answers.endEffector.trim() === correctAnswers.endEffector;
    if (isCorrect) {
      setResult("correct");
      setTimeout(onComplete, 1500);
    } else {
      setResult("wrong");
      setShakeKey(k => k + 1);
      setTimeout(() => setResult(null), 1500);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center px-8 pb-4 min-h-0">
      <div className={`bg-white rounded-2xl border shadow-sm p-10 max-w-lg w-full text-center transition-all ${result === "wrong" ? "animate-shake" : ""}`} key={shakeKey}>
        {/* Icon */}
        <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-slate-800 mb-2">Part Count Check</h2>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
          How many of each part type did you assemble? Fill in the numbers.
        </p>

        {/* Snapshot of the arm you just assembled */}
        {snapshot && (
          <div className="mb-8 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
            <img
              src={snapshot}
              alt="The robot arm you just assembled"
              className="w-full h-56 object-contain bg-[#f8fafc]"
            />
            <p className="text-[11px] text-slate-400 py-2 text-center border-t border-slate-200">
              The robot arm you just assembled — count the parts in the picture
            </p>
          </div>
        )}

        {/* Fill-in-the-blank fields */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {[
            { key: "base", label: "Base", correct: correctAnswers.base },
            { key: "joints", label: "Joints", correct: correctAnswers.joints },
            { key: "links", label: "Links", correct: correctAnswers.links },
            { key: "endEffector", label: "End Effector", correct: correctAnswers.endEffector },
          ].map(field => (
            <div key={field.key} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
              <span className="text-[13px] font-semibold text-slate-600 whitespace-nowrap">{field.label}:</span>
              <input
                type="number"
                min="0"
                max="9"
                value={(answers as Record<string, string>)[field.key]}
                onChange={(e) => setAnswers(prev => ({ ...prev, [field.key]: e.target.value }))}
                onKeyDown={(e) => { if (e.key === "Enter") handleSubmit(); }}
                className="w-16 text-center text-lg font-bold text-slate-800 bg-white border border-slate-300 rounded-lg py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
                placeholder="?"
              />
            </div>
          ))}
        </div>

        {/* Submit button */}
        <button
          onClick={handleSubmit}
          disabled={!answers.base || !answers.joints || !answers.links || !answers.endEffector}
          className="px-8 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-medium hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
        >
          Check Answers
        </button>

        {/* Result feedback */}
        {result === "correct" && (
          <div className="mt-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 animate-fade-up">
            <p className="text-lg font-bold text-emerald-600">🎉 Good Job!</p>
            <p className="text-[13px] text-emerald-500 mt-1">All answers correct. The robot arm has 1 Base, 3 Joints, 2 Links, and 1 End Effector.</p>
          </div>
        )}
        {result === "wrong" && (
          <div className="mt-6 p-4 rounded-xl bg-red-50 border border-red-200 animate-fade-up">
            <p className="text-sm font-semibold text-red-500">Not quite right. Check your counts and try again.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// PHASE 4: Summary — completion summary with concepts
// ============================================================
function SummaryPhase() {
  return (
    <div className="flex-1 flex items-center justify-center px-8 pb-4 min-h-0">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-10 max-w-2xl w-full text-center">
        <div className="mx-auto mb-5 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <svg className="w-8 h-8 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
          </svg>
        </div>

        <h2 className="text-xl font-semibold text-slate-800 mb-3">Robot Arm Assembly Complete!</h2>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">
          You've successfully identified the parts, assembled them in order, and verified the part counts.
          This arm will be used in later kinematics missions.
        </p>

        {/* Parts summary grid */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { label: "Base", count: "1", color: "#64748b" },
            { label: "Joints", count: "3", color: "#f59e0b" },
            { label: "Links", count: "2", color: "#3b82f6" },
            { label: "End Effector", count: "1", color: "#ef4444" },
          ].map(p => (
            <div key={p.label} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <div className="w-4 h-4 rounded-full mx-auto mb-2" style={{ backgroundColor: p.color }} />
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">{p.label}</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{p.count}</p>
            </div>
          ))}
        </div>

        {/* Concepts summary — Actuator / Controller / Sensors */}
        <div className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 rounded-xl p-5 border border-slate-200 text-left">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Beyond Mechanical Parts</p>
          <p className="text-[13px] text-slate-600 leading-relaxed">
            A complete robot also needs an <strong className="text-blue-600">Actuator</strong> (motors that drive the joints),
            a <strong className="text-purple-600">Controller</strong> (the &ldquo;brain&rdquo; that coordinates movements),
            and <strong className="text-pink-600">Sensors</strong> (to perceive position, force, and the environment).
          </p>
        </div>

        <p className="text-[11px] text-slate-400 mt-6">
          You can now explore joint angles and kinematics in the next sections.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE — orchestrates phases
// ============================================================
export default function Page() {
  const [phase, setPhase] = useState<Phase>("labelMatch");
  const [placed, setPlaced] = useState<Set<string>>(new Set());
  const [hint, setHint] = useState("Drag each label onto the matching part of the robot arm.");
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const onPlaceRef = useRef<(n: string) => void>(null);

  // Phase transition callbacks
  const goToAssembly = useCallback(() => { setPhase("assembly"); setHint("Now drag each part image onto the table to assemble the arm."); }, []);
  // Snapshot the assembled 3D arm right before leaving the assembly phase,
  // so the quiz can show it as a memory aid.
  const goToQuiz = useCallback(() => {
    const c = document.getElementById("cvs")?.querySelector("canvas");
    if (c) setSnapshot((c as HTMLCanvasElement).toDataURL("image/png"));
    setPhase("quiz");
  }, []);
  const goToSummary = useCallback(() => setPhase("summary"), []);

  // Assembly onPlace handler with better hints
  useEffect(() => {
    onPlaceRef.current = (name: string) => {
      setPlaced(prev => { const u = new Set(prev); u.add(name); return u; });
      setErrorHint(null);
      const rem = ORDER.filter(x => x !== name && !placed.has(x));
      if (rem.length > 0) {
        const nextLabel = LABEL[rem[0]];
        const nextCategory = rem[0].includes("base") ? "Base" : rem[0].includes("joints") ? "Joint" : rem[0].includes("links") ? "Link" : "End Effector";
        setHint(`Placed ${LABEL[name]}. Next: ${nextLabel} (${nextCategory}).`);
      } else {
        setHint("All parts assembled! Let's check your understanding...");
        setTimeout(goToQuiz, 1200);
      }
    };
  }, [placed, goToQuiz]);

  // Mouse event handlers for assembly phase
  useEffect(() => {
    if (phase !== "assembly") return;
    const mv = (e: MouseEvent) => {
      const c = document.getElementById("cvs"); if (!c) return;
      const r = c.getBoundingClientRect();
      S.mx = ((e.clientX - r.left) / r.width) * 2 - 1;
      S.my = -((e.clientY - r.top) / r.height) * 2 + 1;
    };
    const up = () => {
      if (S.part) {
        if (!S.snap) {
          const partName = LABEL[S.part] || S.part;
          const expected = ORDER.find(n => !placed.has(n));
          const expectedLabel = expected ? LABEL[expected] : "nothing";
          if (expected && S.part !== expected) {
            // Wrong part dragged
            const cat = S.part.includes("base") ? "Base" : S.part.includes("joints") ? "Joint" : S.part.includes("links") ? "Link" : "End Effector";
            const expCat = expected.includes("base") ? "Base" : expected.includes("joints") ? "Joint" : expected.includes("links") ? "Link" : "End Effector";
            setErrorHint(`Wrong order! You tried to place ${partName} (${cat}), but ${expectedLabel} (${expCat}) should go next.`);
            setHint(`Try placing ${expectedLabel} instead.`);
          } else {
            setErrorHint("Missed the target. Try dragging closer to the assembly area.");
          }
          setTimeout(() => setErrorHint(null), 3000);
        } else {
          setErrorHint(null);
        }
        S.part = null;
      }
    };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, [phase, placed]);

  // Determine header title based on phase
  const headerTitle = phase === "labelMatch" ? "Identify the Parts"
    : phase === "assembly" ? "Assemble the Robot Arm"
    : phase === "quiz" ? "Check Your Understanding"
    : "Assembly Complete";

  return (<div className="flex flex-col h-[calc(100vh-112px)]" onContextMenu={e => e.preventDefault()}>
    {/* Header bar with phase indicator */}
    <div className="flex items-center gap-3 px-8 pt-5 pb-3">
      <span className="px-4 py-2 text-[13px] font-medium rounded-lg bg-slate-800 text-white">{headerTitle}</span>
      <span className="flex-1" />
      {/* Phase indicators */}
      <div className="flex items-center gap-1.5">
        {(["labelMatch", "assembly", "quiz", "summary"] as Phase[]).map((p, i) => {
          const idx = (["labelMatch", "assembly", "quiz", "summary"] as Phase[]).indexOf(phase);
          const isActive = p === phase;
          const isPast = i < idx;
          return (
            <div key={p} className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all
              ${isActive ? "bg-slate-800 text-white scale-110"
                : isPast ? "bg-emerald-100 text-emerald-600"
                : "bg-slate-100 text-slate-400"}`}
              title={p === "labelMatch" ? "Label" : p === "assembly" ? "Build" : p === "quiz" ? "Quiz" : "Done"}
            >
              {isPast ? "✓" : i + 1}
            </div>
          );
        })}
      </div>
      {phase === "assembly" && (
        <>
          <button onClick={() => { setPlaced(new Set(ORDER)); setHint("Auto-completed!"); setErrorHint(null); setTimeout(goToQuiz, 600); }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 cursor-pointer ml-3">Auto</button>
          <button onClick={() => { setPlaced(new Set()); setHint("Drag a part to begin."); setErrorHint(null); }}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer">Reset</button>
        </>
      )}
    </div>

    {/* Phase content */}
    {phase === "labelMatch" && <LabelMatchPhase onComplete={goToAssembly} />}

    {phase === "assembly" && (
      <div className="flex-1 flex gap-5 px-8 pb-4 min-h-0">
        {/* Left: Parts tray */}
        <div className="w-[220px] shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-4 overflow-y-auto">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Parts</p>
          {[{ label: "Base", items: [ORDER[0]] }, { label: "Joints", items: [ORDER[1], ORDER[3], ORDER[5]] }, { label: "Links", items: [ORDER[2], ORDER[4]] }, { label: "End Effector", items: [ORDER[6]] }].map(g => (<div key={g.label} className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{g.label}</span>
            <div className="flex flex-col gap-1.5">{g.items.map(n => {
              const d = placed.has(n);
              return (<div key={n} onMouseDown={e => { if (e.button === 0 && !d) { e.preventDefault(); S.part = n; S.snap = false; setHint(`Dragging ${LABEL[n]}...`); setErrorHint(null); } }}
                className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all select-none cursor-pointer ${d ? "border-emerald-200 bg-emerald-50/50" : "border-slate-100 bg-slate-50 hover:border-slate-300 active:border-blue-400 active:bg-blue-50"}`}>
                <div className="w-full aspect-[4/3] flex items-center justify-center bg-white/50 rounded-lg">
                  <img src={IMG[n]} alt={LABEL[n]} className="max-w-full max-h-full object-contain pointer-events-none" style={{ mixBlendMode: "multiply" }} draggable={false} />
                </div>
                <span className={`text-[11px] font-medium text-center ${d ? "text-emerald-500" : "text-slate-600"}`}>{LABEL[n]}</span>
              </div>);
            })}</div>
          </div>))}
        </div>
        {/* Right: 3D canvas */}
        <div id="cvs" className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden relative">
          <Canvas camera={{ position: [0, 7, -9], fov: 50, near: 0.5, far: 200 }} gl={{ antialias: true, preserveDrawingBuffer: true }} style={{ background: "#f8fafc" }}>
            <Scene placed={placed} onPlace={onPlaceRef} phase="assembly" />
          </Canvas>
          {/* Error hint toast */}
          {errorHint && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
              <div className="px-4 py-2.5 rounded-xl bg-red-500/90 text-white text-[12px] font-medium shadow-lg shadow-red-500/30 flex items-center gap-2 animate-fade-up max-w-md">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{errorHint}</span>
              </div>
            </div>
          )}

          <HintBox hintLabel="Controls">
            <p>Drag with left mouse button: rotate view</p>
            <p>Scroll: zoom in / out</p>
            <p>Right-drag: pan view</p>
            <p>Hold a part image and drag onto the table to assemble in order</p>
          </HintBox>
        </div>
      </div>
    )}

    {phase === "quiz" && <QuizPhase onComplete={goToSummary} snapshot={snapshot} />}

    {phase === "summary" && <SummaryPhase />}

    {/* Bottom hint bar (not shown on quiz/summary) */}
    {(phase === "labelMatch" || phase === "assembly") && (
      <div className="h-14 bg-white border-t border-slate-200 flex items-center px-5 gap-3">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex-shrink-0">Hint</span>
        <span className={`text-[13px] truncate flex-1 ${errorHint ? "text-red-500" : "text-slate-500"}`}>{hint}</span>
        {phase === "assembly" && (
          <span className="text-[11px] text-slate-400">{placed.size}/{ORDER.length} placed</span>
        )}
      </div>
    )}
  </div>);
}
