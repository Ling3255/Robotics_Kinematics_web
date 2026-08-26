"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, type ThreeEvent, useThree, useFrame } from "@react-three/fiber";
import { Html, MeshTransmissionMaterial, OrbitControls, useProgress } from "@react-three/drei";
import {
  IDENTITY_MATRIX_3X3,
  mat3FromQuaternion,
  quatMultiply,
  quatNormalize,
} from "./types";

const AXIS_LENGTH = 2.4;
const SPHERE_RADIUS = 1.2;
const B_AXIS_LENGTH = 1.0;

type RotationMatrix9 = number[];
type AxisLock = "X" | "Y" | "Z" | "free";

interface RotationSphereSceneProps {
  resetKey: number;
  matrixRef: { current: RotationMatrix9 };
  onMatrixChange: (matrix: RotationMatrix9) => void;
  isActive: boolean;
}

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

/** Fixed U (world) coordinate frame — always aligned, never rotates */
function UReferenceFrame() {
  return (
    <group>
      <ColoredAxis direction={[1, 0, 0]} color="#ef4444" labelText="X_U" labelOffset={[AXIS_LENGTH + 0.32, 0.06, 0]} />
      <ColoredAxis direction={[0, 0, -1]} color="#111827" labelText="Y_U" labelOffset={[0, 0.06, -AXIS_LENGTH - 0.32]} />
      <ColoredAxis direction={[0, 1, 0]} color="#2563eb" labelText="Z_U" labelOffset={[0.08, AXIS_LENGTH + 0.28, 0]} />
    </group>
  );
}

/** Angle arc showing deviation between X_U (world X) and X_B (sphere's B-frame X) */
function UBAngleIndicator({ orientationRef }: { orientationRef: { current: THREE.Quaternion } }) {
  const arcLineRef = useRef<THREE.Line | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);
  const angleDegRef = useRef(0);
  const arcRadius = 0.7;
  const numSegments = 64;
  const arcGeomRef = useRef<THREE.BufferGeometry>(new THREE.BufferGeometry());
  const positionArrayRef = useRef(new Float32Array((numSegments + 1) * 3));
  const arcLine = useMemo(
    () =>
      new THREE.Line(
        arcGeomRef.current,
        new THREE.LineBasicMaterial({
          color: "#f97316",
          transparent: true,
          opacity: 0.8,
        })
      ),
    []
  );

  useFrame(() => {
    const xB = new THREE.Vector3(1, 0, 0).applyQuaternion(orientationRef.current).normalize();
    const xU = new THREE.Vector3(1, 0, 0);

    const angleRad = Math.acos(Math.min(1, Math.max(-1, xB.dot(xU))));
    const angleDeg = THREE.MathUtils.radToDeg(angleRad);
    angleDegRef.current = angleDeg;

    if (angleRad < 0.005) {
      if (arcLineRef.current) arcLineRef.current.visible = false;
      if (labelRef.current) labelRef.current.style.opacity = "0";
      return;
    }

    if (arcLineRef.current) arcLineRef.current.visible = true;
    if (labelRef.current) labelRef.current.style.opacity = "1";

    const axis = new THREE.Vector3().crossVectors(xU, xB).normalize();
    if (axis.length() < 1e-6) axis.set(0, 0, 1);

    const positions = positionArrayRef.current;
    const startDir = xU.clone().normalize().multiplyScalar(arcRadius);

    for (let i = 0; i <= numSegments; i++) {
      const t = i / numSegments;
      const stepQ = new THREE.Quaternion().setFromAxisAngle(axis, angleRad * t);
      const pt = startDir.clone().applyQuaternion(stepQ);
      const idx = i * 3;
      positions[idx] = pt.x;
      positions[idx + 1] = pt.y;
      positions[idx + 2] = pt.z;
    }

    arcGeomRef.current.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    arcGeomRef.current.setDrawRange(0, numSegments + 1);
  });

  return (
    <group>
      <primitive
        object={arcLine}
        ref={(l: THREE.Line) => {
          arcLineRef.current = l;
        }}
      />
      <Html position={[0, 0, 0]} center distanceFactor={6} occlude={false} style={{ pointerEvents: "none" }}>
        <div
          ref={labelRef}
          className="rounded-full bg-orange-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-md backdrop-blur transition-opacity"
          style={{ opacity: 0 }}
        >
          ∠ {angleDegRef.current.toFixed(0)}°
        </div>
      </Html>
    </group>
  );
}

/** Rotating B-frame axes — attached to the sphere, rotates with it */
function BFrameAxes({ orientationRef }: { orientationRef: { current: THREE.Quaternion } }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.quaternion.copy(orientationRef.current);
    }
  });

  return (
    <group ref={groupRef}>
      {/* X_B axis arrow (lighter shade to distinguish from U) */}
      <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), B_AXIS_LENGTH, "#fca5a5", 0.13, 0.07]} />
      {/* Y_B axis arrow */}
      <arrowHelper args={[new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 0), B_AXIS_LENGTH, "#d1d5db", 0.13, 0.07]} />
      {/* Z_B axis arrow */}
      <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), B_AXIS_LENGTH, "#93c5fd", 0.13, 0.07]} />
      {/* B labels */}
      <Label position={[B_AXIS_LENGTH + 0.22, 0.04, 0]} className="text-red-400 text-[9px]">X_B</Label>
      <Label position={[0, 0.04, -(B_AXIS_LENGTH + 0.22)]} className="text-slate-400 text-[9px]">Y_B</Label>
      <Label position={[0.04, B_AXIS_LENGTH + 0.22, 0]} className="text-blue-400 text-[9px]">Z_B</Label>
    </group>
  );
}

function RotationSphere({
  orientationRef,
  matrixRef,
  onMatrixChange,
  isActive,
  resetKey,
  axisLock,
}: {
  orientationRef: { current: THREE.Quaternion };
  matrixRef: { current: RotationMatrix9 };
  onMatrixChange: (matrix: RotationMatrix9) => void;
  isActive: boolean;
  resetKey: number;
  axisLock: AxisLock;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();
  const dragRef = useRef<{
    active: boolean;
    lastX: number;
    lastY: number;
    prevQuat: THREE.Quaternion;
  } | null>(null);

  useEffect(() => {
    orientationRef.current.identity();
    if (groupRef.current) {
      groupRef.current.quaternion.identity();
    }
    const m = IDENTITY_MATRIX_3X3;
    matrixRef.current = [...m];
    onMatrixChange([...m]);
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const onPointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!isActive) return;
      event.stopPropagation();
      (event.target as HTMLElement)?.setPointerCapture?.(event.pointerId);

      if (groupRef.current) {
        dragRef.current = {
          active: true,
          lastX: event.nativeEvent.clientX,
          lastY: event.nativeEvent.clientY,
          prevQuat: groupRef.current.quaternion.clone(),
        };
      }
    },
    [isActive],
  );

  const onPointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!dragRef.current?.active || !isActive) return;
      event.stopPropagation();

      const dx = event.nativeEvent.clientX - dragRef.current.lastX;
      const dy = event.nativeEvent.clientY - dragRef.current.lastY;
      dragRef.current.lastX = event.nativeEvent.clientX;
      dragRef.current.lastY = event.nativeEvent.clientY;

      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

      const rect = gl.domElement.getBoundingClientRect();
      const radius = Math.min(rect.width, rect.height) * 0.5;
      let angleX = (dy / radius) * 1.8;
      let angleY = (dx / radius) * 1.8;

      // If axis is locked, zero out the other component
      if (axisLock === "X") { angleY = 0; }
      if (axisLock === "Y") { angleX = 0; }
      if (axisLock === "Z") {
        // For Z rotation, use only the component based on the axis direction
        // Z is (0,1,0) in world — map vertical drag to Z rotation, zero horizontal
        angleY = 0;
      }

      const cameraRight = camera.getWorldDirection(new THREE.Vector3())
        .cross(camera.up)
        .normalize();
      const cameraUp = camera.up.clone().normalize();

      const qX = new THREE.Quaternion().setFromAxisAngle(cameraRight, angleX);
      const qY = new THREE.Quaternion().setFromAxisAngle(cameraUp, angleY);

      const combined = quatMultiply(
        { x: qX.x, y: qX.y, z: qX.z, w: qX.w },
        { x: qY.x, y: qY.y, z: qY.z, w: qY.w },
      );
      const normalized = quatNormalize(combined);
      const deltaQ = new THREE.Quaternion(normalized.x, normalized.y, normalized.z, normalized.w);

      const newQuat = deltaQ.multiply(dragRef.current.prevQuat).normalize();
      dragRef.current.prevQuat = newQuat.clone();

      if (groupRef.current) {
        groupRef.current.quaternion.copy(newQuat);
      }
      orientationRef.current.copy(newQuat);

      const q = orientationRef.current;
      const matrix = mat3FromQuaternion({ x: q.x, y: q.y, z: q.z, w: q.w });
      matrixRef.current = matrix;
      onMatrixChange(matrix);
    },
    [camera, gl.domElement, isActive, matrixRef, onMatrixChange, orientationRef, axisLock],
  );

  const onPointerUp = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      dragRef.current = null;
      (event.target as HTMLElement)?.releasePointerCapture?.(event.pointerId);
    },
    [],
  );

  return (
    <group
      ref={groupRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
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
  orientationRef,
  matrixRef,
  onMatrixChange,
  isActive,
  resetKey,
  axisLock,
}: {
  orientationRef: { current: THREE.Quaternion };
  matrixRef: { current: RotationMatrix9 };
  onMatrixChange: (matrix: RotationMatrix9) => void;
  isActive: boolean;
  resetKey: number;
  axisLock: AxisLock;
}) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[4, 6, 5]} intensity={1.15} />
      {/* Fixed U frame (world axes, always aligned) */}
      <UReferenceFrame />
      {/* Angle arc between X_U and X_B */}
      <UBAngleIndicator orientationRef={orientationRef} />
      {/* Rotating B-frame (follows sphere) */}
      <BFrameAxes orientationRef={orientationRef} />
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <Label position={[0.14, 0.14, -0.1]}>O</Label>
      <RotationSphere
        orientationRef={orientationRef}
        matrixRef={matrixRef}
        onMatrixChange={onMatrixChange}
        isActive={isActive}
        resetKey={resetKey}
        axisLock={axisLock}
      />
      <OrbitControls makeDefault enablePan={false} enableZoom={true} target={[0, 0, 0]} mouseButtons={{ LEFT: undefined, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }} />
      <gridHelper args={[5, 16, "#94a3b8", "#e2e8f0"]} position={[0, -2.6, 0]} />
    </>
  );
}

export default function RotationSphereScene({ resetKey, matrixRef, onMatrixChange, isActive }: RotationSphereSceneProps) {
  const orientationRef = useRef(new THREE.Quaternion());
  const [axisLock, setAxisLock] = useState<AxisLock>("free");

  useEffect(() => {
    setAxisLock("free");
  }, [resetKey]);

  const axisColors: Record<AxisLock, string> = {
    X: "bg-red-500",
    Y: "bg-slate-800",
    Z: "bg-blue-500",
    free: "bg-purple-500",
  };

  return (
    <div className="relative flex h-full min-h-[420px] flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
      {/* 3D Canvas */}
      <div className="relative flex-1 min-h-0">
        <Canvas camera={{ position: [4.2, 3.6, 5.8], fov: 42 }} gl={{ antialias: true }}>
          <color attach="background" args={["#e9edf2"]} />
          <Suspense fallback={null}>
            <SceneContent
              orientationRef={orientationRef}
              matrixRef={matrixRef}
              onMatrixChange={onMatrixChange}
              isActive={isActive}
              resetKey={resetKey}
              axisLock={axisLock}
            />
          </Suspense>
        </Canvas>
        <LoadingOverlay />
        {/* Info overlay */}
        <div className="absolute left-4 top-4 z-10 rounded-xl bg-white/90 px-3 py-2 text-xs font-semibold leading-5 text-slate-600 shadow-sm backdrop-blur">
          <p>Drag the sphere to rotate. Right-drag to orbit camera. Scroll to zoom.</p>
          <p>X_U / X_B: red · Y_U / Y_B: black/gray · Z_U / Z_B: blue</p>
        </div>
        {/* Learning hint */}
        <div className="absolute bottom-4 left-4 z-10 rounded-lg border border-amber-200 bg-amber-50/95 px-3 py-2 text-[11px] leading-relaxed text-amber-800 shadow-sm backdrop-blur">
          <span className="font-bold">💡 Learning tip:</span>{" "}
          {axisLock === "free"
            ? "Lock an axis below to rotate one direction at a time. Observe how the B axes (lighter) deviate from the U axes."
            : `Only ${axisLock}-axis rotation allowed. The B frame rotates around ${axisLock}_U. Switch to "Free" when ready for 3D.`}
        </div>
      </div>

      {/* Axis lock controls */}
      <div className="shrink-0 border-t border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Lock Axis:
          </span>
          {(["X", "Y", "Z", "free"] as const).map((axis) => (
            <button
              key={axis}
              type="button"
              onClick={() => setAxisLock(axis)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                axisLock === axis
                  ? `${axisColors[axis]} text-white`
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {axis === "free" ? "Free" : `${axis}-Axis`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}