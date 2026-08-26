"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
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

type AxisLock = "X" | "Y" | "Z";

const WORLD_AXES: Record<AxisLock, [number, number, number]> = {
  X: [1, 0, 0],
  Y: [0, 0, -1],
  Z: [0, 1, 0],
};

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

function DragRotateSphere({
  axisLock,
  matrixRef,
  onMatrixChange,
}: {
  axisLock: AxisLock;
  matrixRef: { current: RotationMatrix9 };
  onMatrixChange: (matrix: RotationMatrix9) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera, gl } = useThree();
  const dragRef = useRef<{
    active: boolean;
    lastX: number;
    lastY: number;
    prevQuat: THREE.Quaternion;
  } | null>(null);

  const onPointerDown = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
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
    [],
  );

  const onPointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      if (!dragRef.current?.active) return;
      event.stopPropagation();

      const dx = event.nativeEvent.clientX - dragRef.current.lastX;
      const dy = event.nativeEvent.clientY - dragRef.current.lastY;
      dragRef.current.lastX = event.nativeEvent.clientX;
      dragRef.current.lastY = event.nativeEvent.clientY;

      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;

      const rect = gl.domElement.getBoundingClientRect();
      const radius = Math.min(rect.width, rect.height) * 0.5;

      const cameraRight = camera.getWorldDirection(new THREE.Vector3())
        .cross(camera.up)
        .normalize();
      const cameraUp = camera.up.clone().normalize();

      // Rotate about the locked world axis. Project the axis into screen space and
      // use the drag component perpendicular to it as the signed rotation angle.
      // This keeps the X, Y and Z locks distinct (previously X and Z were identical).
      const worldAxis = new THREE.Vector3(...WORLD_AXES[axisLock]);
      const axisScreenX = worldAxis.dot(cameraRight);
      const axisScreenY = worldAxis.dot(cameraUp);
      let perpX = -axisScreenY;
      let perpY = axisScreenX;
      const perpLen = Math.hypot(perpX, perpY);
      if (perpLen > 1e-6) {
        perpX /= perpLen;
        perpY /= perpLen;
      } else {
        // Axis points straight out of the screen: fall back to horizontal drag.
        perpX = 1;
        perpY = 0;
      }

      const lockAngle = ((dx * perpX + dy * perpY) / radius) * 1.8;
      const deltaQ = new THREE.Quaternion().setFromAxisAngle(worldAxis.normalize(), lockAngle);

      const newQuat = deltaQ.multiply(dragRef.current.prevQuat).normalize();
      dragRef.current.prevQuat = newQuat.clone();

      if (groupRef.current) {
        groupRef.current.quaternion.copy(newQuat);
      }

      const matrix = mat3FromQuaternion({ x: newQuat.x, y: newQuat.y, z: newQuat.z, w: newQuat.w });
      matrixRef.current = matrix;
      onMatrixChange(matrix);
    },
    [camera, gl.domElement, matrixRef, onMatrixChange, axisLock],
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
          transparent
          opacity={0.35}
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
      {/* Internal B-frame axes (rotate with the sphere) */}
      <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1.0, "#ef4444", 0.12, 0.07]} />
      <arrowHelper args={[new THREE.Vector3(0, 0, -1), new THREE.Vector3(0, 0, 0), 1.0, "#111827", 0.12, 0.07]} />
      <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), 1.0, "#2563eb", 0.12, 0.07]} />
    </group>
  );
}

function SceneContent({
  axisLock,
  matrixRef,
  onMatrixChange,
}: {
  axisLock: AxisLock;
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
      <DragRotateSphere
        axisLock={axisLock}
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

  useEffect(() => {
    matrixRef.current = [...IDENTITY_MATRIX_3X3];
    onMatrixChange([...IDENTITY_MATRIX_3X3]);
  }, [resetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const axisColors: Record<AxisLock, string> = {
    X: "bg-red-500",
    Y: "bg-slate-800",
    Z: "bg-blue-500",
  };

  return (
    <div className="relative flex h-full min-h-[420px] flex-col gap-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
      {/* 3D Canvas */}
      <div className="relative flex-1 min-h-0">
        <Canvas camera={{ position: [4.2, 3.6, 5.8], fov: 42 }} gl={{ antialias: true }}>
          <color attach="background" args={["#e9edf2"]} />
          <Suspense fallback={null}>
            <SceneContent
              axisLock={axisLock}
              matrixRef={matrixRef}
              onMatrixChange={onMatrixChange}
            />
          </Suspense>
        </Canvas>
        <LoadingOverlay />
        {/* Info overlay */}
        <div className="absolute left-4 top-4 z-10 rounded-xl bg-white/90 px-3 py-2 text-xs font-semibold leading-5 text-slate-600 shadow-sm backdrop-blur">
          <p>Drag the sphere to rotate. Right-drag to orbit camera. Scroll to zoom.</p>
        </div>
        {/* Hint */}
        <div className="absolute bottom-4 left-4 z-10 rounded-lg border border-amber-200 bg-amber-50/95 px-3 py-2 text-[11px] leading-relaxed text-amber-800 shadow-sm backdrop-blur">
          <span className="font-bold">💡 Tip:</span>{" "}
          Lock an axis to rotate only on the other two. Observe how the rotation matrix columns change.
        </div>
      </div>

      {/* Axis lock controls */}
      <div className="shrink-0 border-t border-slate-200 bg-white/90 px-4 py-2.5 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Lock Axis:</span>
          {(["X", "Y", "Z"] as const).map((axis) => (
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
              {axis}-Axis
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
