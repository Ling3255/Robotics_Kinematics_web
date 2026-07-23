"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import HintBox from "@/components/ui/HintBox";
import { Canvas, type ThreeEvent, useThree } from "@react-three/fiber";
import { Html, MeshTransmissionMaterial, OrbitControls, useProgress } from "@react-three/drei";
import {
  IDENTITY_MATRIX_3X3,
  mat3FromQuaternion,
  quatMultiply,
  quatNormalize,
} from "./types";

const AXIS_LENGTH = 2.4;
const SPHERE_RADIUS = 1.2;

type RotationMatrix9 = number[];

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

function FixedAxes() {
  return (
    <group>
      <ColoredAxis direction={[1, 0, 0]} color="#ef4444" labelText="X" labelOffset={[AXIS_LENGTH + 0.28, 0.06, 0]} />
      <ColoredAxis direction={[0, 0, -1]} color="#111827" labelText="Y" labelOffset={[0, 0.06, -AXIS_LENGTH - 0.28]} />
      <ColoredAxis direction={[0, 1, 0]} color="#2563eb" labelText="Z" labelOffset={[0.08, AXIS_LENGTH + 0.24, 0]} />
    </group>
  );
}

function RotationSphere({
  orientationRef,
  matrixRef,
  onMatrixChange,
  isActive,
  resetKey,
}: {
  orientationRef: { current: THREE.Quaternion };
  matrixRef: { current: RotationMatrix9 };
  onMatrixChange: (matrix: RotationMatrix9) => void;
  isActive: boolean;
  resetKey: number;
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
      const angleX = (dy / radius) * 1.8;
      const angleY = (dx / radius) * 1.8;

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
    [camera, gl.domElement, isActive, matrixRef, onMatrixChange, orientationRef],
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

function SceneContent({ orientationRef, matrixRef, onMatrixChange, isActive, resetKey }: {
  orientationRef: { current: THREE.Quaternion };
  matrixRef: { current: RotationMatrix9 };
  onMatrixChange: (matrix: RotationMatrix9) => void;
  isActive: boolean;
  resetKey: number;
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
      <RotationSphere
        orientationRef={orientationRef}
        matrixRef={matrixRef}
        onMatrixChange={onMatrixChange}
        isActive={isActive}
        resetKey={resetKey}
      />
      <OrbitControls makeDefault enablePan={false} enableZoom={true} target={[0, 0, 0]} mouseButtons={{ LEFT: undefined, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }} />
      <gridHelper args={[5, 16, "#94a3b8", "#e2e8f0"]} position={[0, -2.6, 0]} />
    </>
  );
}

export default function RotationSphereScene({ resetKey, matrixRef, onMatrixChange, isActive }: RotationSphereSceneProps) {
  const orientationRef = useRef(new THREE.Quaternion());

  return (
    <div className="relative h-full min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
      <Canvas camera={{ position: [4.2, 3.6, 5.8], fov: 42 }} gl={{ antialias: true }}>
        <color attach="background" args={["#e9edf2"]} />
        <Suspense fallback={null}>
          <SceneContent
            orientationRef={orientationRef}
            matrixRef={matrixRef}
            onMatrixChange={onMatrixChange}
            isActive={isActive}
            resetKey={resetKey}
          />
        </Suspense>
      </Canvas>
      <LoadingOverlay />
      <HintBox hintLabel="Controls">
        <p>Drag the sphere to rotate. Right-drag to orbit camera. Scroll to zoom.</p>
        <p>X axis: red · Y axis: black · Z axis: blue</p>
      </HintBox>
    </div>
  );
}