"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { Html, MeshTransmissionMaterial, OrbitControls, useProgress } from "@react-three/drei";
import { IDENTITY_MATRIX_3X3, mat3FromQuaternion } from "./types";

const AXIS_LENGTH = 2.4;
const SPHERE_RADIUS = 1.2;

type RotationMatrix9 = number[];

interface SingleAxisRotatorProps {
  resetKey: number;
  matrixRef: { current: RotationMatrix9 };
  onMatrixChange: (matrix: RotationMatrix9) => void;
}

type AxisLock = "X" | "Y" | "Z" | "free";

function LoadingOverlay() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="absolute inset-0 z-[6] flex items-center justify-center bg-slate-50/70 text-sm text-slate-400">
      Loading… {progress.toFixed(0)}%
    </div>
  );
}

function Label({ position, children, className = "" }: { position: [number, number, number]; children: React.ReactNode; className?: string }) {
  return (
    <Html position={position} center distanceFactor={8} occlude={false} style={{ pointerEvents: "none" }}>
      <div className={`whitespace-nowrap rounded-md bg-white/90 px-2 py-1 text-xs font-bold shadow-sm ring-1 ring-slate-200 ${className}`}>
        {children}
      </div>
    </Html>
  );
}

function AxisArrow({ direction, color, origin }: { direction: [number, number, number]; color: string; origin: [number, number, number] }) {
  const arrow = useMemo(() => {
    const dir = new THREE.Vector3(...direction).normalize();
    const len = AXIS_LENGTH - SPHERE_RADIUS - 0.14;
    return new THREE.ArrowHelper(dir, new THREE.Vector3(...origin), len, color, 0.18, 0.1);
  }, [color, direction, origin]);

  return <primitive object={arrow} />;
}

function ColoredAxis({ direction, color, labelText, labelOffset }: {
  direction: [number, number, number];
  color: string;
  labelText: string;
  labelOffset: [number, number, number];
}) {
  const dir = useMemo(() => new THREE.Vector3(...direction).normalize(), [direction]);
  const tipEnd = useMemo(() => {
    const end = dir.clone().multiplyScalar(AXIS_LENGTH);
    return [end.x, end.y, end.z] as [number, number, number];
  }, [dir]);
  const arrowOrigin = useMemo(() => {
    const start = dir.clone().multiplyScalar(SPHERE_RADIUS + 0.14);
    return [start.x, start.y, start.z] as [number, number, number];
  }, [dir]);

  return (
    <group>
      <mesh position={tipEnd}>
        <sphereGeometry args={[0.1, 24, 24]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <AxisArrow direction={direction} color={color} origin={arrowOrigin} />
      <Label position={labelOffset} className={
        color === "#ef4444" ? "text-red-600" : color === "#111827" ? "text-slate-900" : "text-blue-600"
      }>{labelText}</Label>
    </group>
  );
}

function FixedAxes() {
  return (
    <group>
      <ColoredAxis direction={[1, 0, 0]} color="#ef4444" labelText="X" labelOffset={[AXIS_LENGTH + 0.28, 0.06, 0]} />
      <ColoredAxis direction={[0, 0, -1]} color="#111827" labelText="Y" labelOffset={[0, 0.06, -AXIS_LENGTH - 0.28]} />
      <ColoredAxis direction={[0, 1, 0]} color="#2563eb" labelText="Z" labelOffset={[0.08, AXIS_LENGTH + 0.24, 0]} />
    </group>
  );
}

function SingleAxisSphere({
  axisLock,
  angle,
  matrixRef,
  onMatrixChange,
}: {
  axisLock: AxisLock;
  angle: number;
  matrixRef: { current: RotationMatrix9 };
  onMatrixChange: (matrix: RotationMatrix9) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const angleRef = useRef(angle);

  useEffect(() => {
    angleRef.current = angle;
  }, [angle]);

  useEffect(() => {
    if (!groupRef.current) return;

    const rad = THREE.MathUtils.degToRad(angle);
    let q: THREE.Quaternion;

    switch (axisLock) {
      case "X":
        q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), rad);
        break;
      case "Y":
        // Y is black (0, 0, -1) in world
        q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, -1), rad);
        break;
      case "Z":
        q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rad);
        break;
      default:
        q = new THREE.Quaternion().identity();
    }

    groupRef.current.quaternion.copy(q);

    const matrix = mat3FromQuaternion({ x: q.x, y: q.y, z: q.z, w: q.w });
    matrixRef.current = matrix;
    onMatrixChange(matrix);
  }, [angle, axisLock, matrixRef, onMatrixChange]);

  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[SPHERE_RADIUS, 64, 64]} />
        <MeshTransmissionMaterial
          backside
          samples={8}
          thickness={0.35}
          chromaticAberration={0.08}
          anisotropy={0.15}
          roughness={0.2}
          distortionScale={0.3}
          temporalDistortion={0.1}
          iridescence={1}
          iridescenceIOR={0.6}
          iridescenceThicknessRange={[0, 1100]}
          color="#a78bfa"
        />
      </mesh>
      {/* Colored dots on sphere surface to show orientation */}
      <mesh position={[SPHERE_RADIUS, 0, 0]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0, -SPHERE_RADIUS]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color="#111827" emissive="#111827" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, SPHERE_RADIUS, 0]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial color="#2563eb" emissive="#2563eb" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function SceneContent({
  axisLock,
  angle,
  matrixRef,
  onMatrixChange,
}: {
  axisLock: AxisLock;
  angle: number;
  matrixRef: { current: RotationMatrix9 };
  onMatrixChange: (matrix: RotationMatrix9) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 5]} intensity={1.15} />
      <FixedAxes />
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <Label position={[0.14, 0.14, -0.1]}>O</Label>
      <SingleAxisSphere
        axisLock={axisLock}
        angle={angle}
        matrixRef={matrixRef}
        onMatrixChange={onMatrixChange}
      />
      <OrbitControls makeDefault enablePan={false} enableZoom={true} target={[0, 0, 0]} mouseButtons={{ LEFT: undefined, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }} />
      <gridHelper args={[5, 16, "#94a3b8", "#e2e8f0"]} position={[0, -2.6, 0]} />
    </>
  );
}

export default function SingleAxisRotator({ resetKey, matrixRef, onMatrixChange }: SingleAxisRotatorProps) {
  const [axisLock, setAxisLock] = useState<AxisLock>("X");
  const [angle, setAngle] = useState(0);

  useEffect(() => {
    setAngle(0);
    matrixRef.current = [...IDENTITY_MATRIX_3X3];
    onMatrixChange([...IDENTITY_MATRIX_3X3]);
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const axisColors: Record<AxisLock, string> = {
    X: "bg-red-500",
    Y: "bg-slate-800",
    Z: "bg-blue-500",
    free: "bg-purple-400",
  };

  return (
    <div className="relative flex h-full min-h-[420px] flex-col gap-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
      {/* 3D Canvas */}
      <div className="relative flex-1 min-h-0">
        <Canvas camera={{ position: [4.2, 3.6, 5.8], fov: 42 }} gl={{ antialias: true }}>
          <color attach="background" args={["#e9edf2"]} />
          <Suspense fallback={null}>
            <SceneContent
              axisLock={axisLock}
              angle={angle}
              matrixRef={matrixRef}
              onMatrixChange={onMatrixChange}
            />
          </Suspense>
        </Canvas>
        <LoadingOverlay />
      </div>

      {/* Controls overlay */}
      <div className="shrink-0 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur">
        {/* Axis selection pills */}
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Lock Axis:</span>
          {(["X", "Y", "Z"] as const).map((axis) => (
            <button
              key={axis}
              type="button"
              onClick={() => { setAxisLock(axis); setAngle(0); }}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                axisLock === axis
                  ? `${axisColors[axis]} text-white`
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {axis}-Axis
            </button>
          ))}
        </div>

        {/* Angle slider */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-500">Angle:</span>
          <input
            type="range"
            min={-180}
            max={180}
            value={angle}
            onChange={(e) => setAngle(Number(e.target.value))}
            className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-slate-200 accent-slate-700"
          />
          <span className="w-14 text-right font-mono text-sm font-bold tabular-nums text-slate-800">
            {angle}°
          </span>
        </div>
      </div>
    </div>
  );
}