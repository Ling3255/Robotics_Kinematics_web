"use client";

import { Suspense, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls, useProgress } from "@react-three/drei";

type DemoMode = "position" | "orientation";

const BOX_SIZE = 0.9;
const AXIS_LENGTH = 1.8;
const ORIGIN_RADIUS = 0.06;
const POSITION_AMPLITUDE = 0.7;
const POSITION_SPEED = 0.9;

function LoadingOverlay() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="absolute inset-0 z-[6] flex items-center justify-center bg-slate-50/70 text-xs text-slate-400">
      Loading… {progress.toFixed(0)}%
    </div>
  );
}

function HtmlLabel({
  position,
  children,
  className = "",
}: {
  position: [number, number, number];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Html position={position} center distanceFactor={6} occlude={false} style={{ pointerEvents: "none" }}>
      <div
        className={`whitespace-nowrap rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-bold shadow-sm ring-1 ring-slate-200 ${className}`}
      >
        {children}
      </div>
    </Html>
  );
}

/** Fixed reference axes (world frame) */
function FixedAxes() {
  return (
    <group>
      <arrowHelper
        args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), AXIS_LENGTH, "#ef4444", 0.12, 0.06]}
      />
      <arrowHelper
        args={[new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 0), AXIS_LENGTH, "#111827", 0.12, 0.06]}
      />
      <arrowHelper
        args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), AXIS_LENGTH, "#2563eb", 0.12, 0.06]}
      />
      <HtmlLabel position={[AXIS_LENGTH + 0.25, 0.06, 0]} className="text-red-600">
        X
      </HtmlLabel>
      <HtmlLabel position={[0, 0.06, -(AXIS_LENGTH + 0.25)]} className="text-slate-900">
        Y
      </HtmlLabel>
      <HtmlLabel position={[0.06, AXIS_LENGTH + 0.25, 0]} className="text-blue-600">
        Z
      </HtmlLabel>
      {/* Origin dot */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[ORIGIN_RADIUS, 24, 24]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <HtmlLabel position={[0.14, 0.12, -0.05]}>O</HtmlLabel>
    </group>
  );
}

/** B-frame axes on the cube that rotate with it — always renders, uses visible prop */
function BFrameAxes({ visible }: { visible: boolean }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    if (!visible) return;
    groupRef.current.rotation.x += delta * 0.5;
    groupRef.current.rotation.y += delta * 0.7;
    groupRef.current.rotation.z += delta * 0.3;
  });

  return (
    <group ref={groupRef} visible={visible}>
      <arrowHelper
        args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), BOX_SIZE * 0.85, "#fca5a5", 0.1, 0.05]}
      />
      <arrowHelper
        args={[new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 0), BOX_SIZE * 0.85, "#d1d5db", 0.1, 0.05]}
      />
      <arrowHelper
        args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), BOX_SIZE * 0.85, "#93c5fd", 0.1, 0.05]}
      />
      <HtmlLabel position={[BOX_SIZE * 0.85 + 0.18, 0.04, 0]} className="text-red-400 text-[9px]">
        X_B
      </HtmlLabel>
      <HtmlLabel position={[0, 0.04, -(BOX_SIZE * 0.85 + 0.18)]} className="text-slate-400 text-[9px]">
        Y_B
      </HtmlLabel>
      <HtmlLabel position={[0.04, BOX_SIZE * 0.85 + 0.18, 0]} className="text-blue-400 text-[9px]">
        Z_B
      </HtmlLabel>
    </group>
  );
}

/** The cube that either moves (position mode) or spins (orientation mode) */
function DemoBox({ mode }: { mode: DemoMode }) {
  const boxRef = useRef<THREE.Group>(null);
  const elapsedRef = useRef(0);

  useFrame((_, delta) => {
    if (!boxRef.current) return;
    elapsedRef.current += delta;

    if (mode === "position") {
      const t = elapsedRef.current * POSITION_SPEED;
      const px = Math.sin(t) * POSITION_AMPLITUDE;
      const py = Math.cos(t * 1.4) * POSITION_AMPLITUDE * 0.6;
      const pz = Math.cos(t * 0.7 + 1) * POSITION_AMPLITUDE * 0.5;
      boxRef.current.position.set(px, py, pz);
      boxRef.current.rotation.set(0, 0, 0);
    } else {
      boxRef.current.position.set(0, 0, 0);
      boxRef.current.rotation.x += delta * 0.6;
      boxRef.current.rotation.y += delta * 0.85;
    }
  });

  return (
    <group ref={boxRef}>
      <mesh>
        <boxGeometry args={[BOX_SIZE, BOX_SIZE, BOX_SIZE]} />
        <meshStandardMaterial color="#38bdf8" roughness={0.35} metalness={0.1} />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(BOX_SIZE, BOX_SIZE, BOX_SIZE)]} />
        <lineBasicMaterial color="#0f172a" transparent opacity={0.18} />
      </lineSegments>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#f97316" emissive="#f97316" emissiveIntensity={0.4} />
      </mesh>
      <BFrameAxes visible={mode === "orientation"} />
    </group>
  );
}

function SceneContent({ mode }: { mode: DemoMode }) {
  return (
    <>
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 5, 4]} intensity={1.0} />
      <FixedAxes />
      <DemoBox mode={mode} />
      <OrbitControls makeDefault enablePan={false} enableZoom={true} target={[0, 0, 0]} />
      <gridHelper args={[4, 12, "#94a3b8", "#e2e8f0"]} position={[0, -2.0, 0]} />
    </>
  );
}

interface PositionVsOrientationDemoProps {
  className?: string;
}

export default function PositionVsOrientationDemo({ className = "" }: PositionVsOrientationDemoProps) {
  const [mode, setMode] = useState<DemoMode>("position");

  const modeLabel: Record<DemoMode, string> = {
    position: "位置变化（平移）",
    orientation: "朝向变化（旋转）",
  };

  const modeHint: Record<DemoMode, string> = {
    position: "立方体在空间中移动——中心点离开了原点",
    orientation: "立方体在原位旋转——中心点始终在原点上",
  };

  const cubeCenterQuestion =
    mode === "position"
      ? "✓ 物体中心离开了原点 → 这是位置变化"
      : "✗ 物体中心没离开原点 → 这不是位置变化";

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm ${className}`}
    >
      <div className="relative flex-1 min-h-0">
        <Canvas camera={{ position: [3.2, 2.6, 4.8], fov: 46 }} gl={{ antialias: true }}>
          <color attach="background" args={["#e9edf2"]} />
          <Suspense fallback={null}>
            <SceneContent mode={mode} />
          </Suspense>
        </Canvas>
        <LoadingOverlay />
      </div>

      <div className="shrink-0 border-t border-slate-200 bg-white/90 px-3 py-2.5 backdrop-blur">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            演示模式：
          </span>
          <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            {(["position", "orientation"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                  mode === m
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {modeLabel[m]}
              </button>
            ))}
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-slate-500 mb-1.5">{modeHint[mode]}</p>

        <div className="flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 border border-amber-200">
          <span className="text-xs">🔍</span>
          <p className="text-[11px] font-semibold leading-snug text-amber-800">
            {cubeCenterQuestion}
          </p>
        </div>
      </div>
    </div>
  );
}