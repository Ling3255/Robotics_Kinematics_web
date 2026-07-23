"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, Line, OrbitControls, useProgress } from "@react-three/drei";
import {
  INITIAL_Q_POSITION,
  TARGET_Q_POSITION,
  U_WORLD,
  clampQPosition,
  isNearTarget,
  qToWorld,
  worldToQ,
  type LessonStep,
  type Vec3Position,
} from "./types";

const AXIS_LENGTH = 3.1;
const ROOM_WIDTH = 3.6;
const ROOM_DEPTH = 3.25;
const ROOM_HEIGHT = 2.25;

interface TeachingSceneProps {
  step: LessonStep;
  qPosition: Vec3Position;
  targetPosition: Vec3Position | null;
  axisComplete: boolean;
  vectorComplete: boolean;
  resetKey: number;
  onQPositionChange: (position: Vec3Position) => void;
  onPresetComplete: () => void;
  onVectorComplete: () => void;
}

function LoadingOverlay() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="absolute inset-0 z-[6] flex items-center justify-center bg-slate-50/70 text-sm text-slate-400">
      Loading model... {progress.toFixed(0)}%
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

function AxisArrow({ direction, color }: { direction: [number, number, number]; color: string }) {
  const arrow = useMemo(() => {
    const dir = new THREE.Vector3(...direction).normalize();
    return new THREE.ArrowHelper(dir, new THREE.Vector3(...U_WORLD), AXIS_LENGTH, color, 0.22, 0.09);
  }, [color, direction]);

  return <primitive object={arrow} />;
}

function Room({ showAxes, highlightAxes }: { showAxes: boolean; highlightAxes: boolean }) {
  const floorCenter: [number, number, number] = [U_WORLD[0] + ROOM_WIDTH / 2, U_WORLD[1] - 0.02, U_WORLD[2] - ROOM_DEPTH / 2];

  return (
    <group>
      <mesh position={floorCenter} receiveShadow>
        <boxGeometry args={[ROOM_WIDTH, 0.04, ROOM_DEPTH]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.82} />
      </mesh>
      <gridHelper args={[ROOM_WIDTH, 12, "#94a3b8", "#e2e8f0"]} position={floorCenter} />
      <mesh position={[U_WORLD[0] - 0.02, ROOM_HEIGHT / 2, U_WORLD[2] - ROOM_DEPTH / 2]} receiveShadow>
        <boxGeometry args={[0.04, ROOM_HEIGHT, ROOM_DEPTH]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.82} transparent opacity={0.88} />
      </mesh>

      <mesh position={[U_WORLD[0] + ROOM_WIDTH / 2, ROOM_HEIGHT / 2, U_WORLD[2] + 0.02]} receiveShadow>
        <boxGeometry args={[ROOM_WIDTH, ROOM_HEIGHT, 0.04]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.82} transparent opacity={0.88} />
      </mesh>

      <mesh position={U_WORLD}>
        <sphereGeometry args={[0.055, 24, 24]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <Label position={[U_WORLD[0] - 0.14, U_WORLD[1] + 0.18, U_WORLD[2] - 0.1]} className="text-slate-900">U</Label>

      {showAxes && (
        <group>
          <AxisArrow direction={[1, 0, 0]} color="#ef4444" />
          <AxisArrow direction={[0, 0, -1]} color="#111827" />
          <AxisArrow direction={[0, 1, 0]} color="#2563eb" />
          <mesh position={[U_WORLD[0] + AXIS_LENGTH, U_WORLD[1], U_WORLD[2]]}><sphereGeometry args={[0.08, 24, 24]} /><meshStandardMaterial color="#ef4444" /></mesh>
          <mesh position={[U_WORLD[0], U_WORLD[1], U_WORLD[2] - AXIS_LENGTH]}><sphereGeometry args={[0.08, 24, 24]} /><meshStandardMaterial color="#111827" /></mesh>
          <mesh position={[U_WORLD[0], U_WORLD[1] + AXIS_LENGTH, U_WORLD[2]]}><sphereGeometry args={[0.08, 24, 24]} /><meshStandardMaterial color="#2563eb" /></mesh>
          <Label position={[U_WORLD[0] + AXIS_LENGTH + 0.25, U_WORLD[1] + 0.05, U_WORLD[2]]} className={highlightAxes ? "text-red-600 ring-red-300" : "text-red-600"}>X-Axis</Label>
          <Label position={[U_WORLD[0], U_WORLD[1] + 0.05, U_WORLD[2] - AXIS_LENGTH - 0.25]} className={highlightAxes ? "text-slate-900 ring-slate-400" : "text-slate-900"}>Y-Axis</Label>
          <Label position={[U_WORLD[0] + 0.12, U_WORLD[1] + AXIS_LENGTH + 0.2, U_WORLD[2]]} className={highlightAxes ? "text-blue-600 ring-blue-300" : "text-blue-600"}>Z-Axis</Label>
        </group>
      )}
    </group>
  );
}

function BallModel({ selected }: { selected: boolean }) {
  return (
    <mesh castShadow receiveShadow>
      <sphereGeometry args={[0.14, 32, 32]} />
      <meshStandardMaterial
        color={selected ? "#9ca3af" : "#d1d5db"}
        roughness={0.55}
        metalness={0.08}
      />
    </mesh>
  );
}

function StaticQ({ position = INITIAL_Q_POSITION }: { position?: Vec3Position }) {
  return (
    <group position={qToWorld(position)}>
      <BallModel selected={false} />
      <Label position={[0, 0.22, 0]} className="text-slate-700">Q</Label>
    </group>
  );
}

function ProjectionAndVector({ position }: { position: Vec3Position }) {
  const q = qToWorld(position);
  const xPoint: [number, number, number] = [q[0], U_WORLD[1], U_WORLD[2]];
  const xyPoint: [number, number, number] = [q[0], U_WORLD[1], q[2]];

  return (
    <group>
      <Line points={[U_WORLD, q]} color="#ef4444" lineWidth={4} />
      <Line points={[U_WORLD, xPoint]} color="#ef4444" lineWidth={2} dashed dashSize={0.12} gapSize={0.08} />
      <Line points={[xPoint, xyPoint]} color="#111827" lineWidth={2} dashed dashSize={0.12} gapSize={0.08} />
      <Line points={[xyPoint, q]} color="#2563eb" lineWidth={2} dashed dashSize={0.12} gapSize={0.08} />
      <Label position={[(U_WORLD[0] + q[0]) / 2 + 0.18, (U_WORLD[1] + q[1]) / 2 + 0.2, (U_WORLD[2] + q[2]) / 2]} className="text-red-600">UQ</Label>
    </group>
  );
}

type DragAxis = "x" | "y" | "z";

function AxisDragHandle({
  axis,
  color,
  direction,
  selected,
  onSelect,
  onDrag,
}: {
  axis: DragAxis;
  color: string;
  direction: [number, number, number];
  selected: boolean;
  onSelect: () => void;
  onDrag: (axis: DragAxis, delta: number) => void;
}) {
  const { camera, gl } = useThree();
  const tipRef = useRef<THREE.Mesh | null>(null);
  const dragRef = useRef<{ lastX: number; lastY: number; dirX: number; dirY: number; worldPerPixel: number } | null>(null);
  const end: [number, number, number] = [direction[0] * 0.9, direction[1] * 0.9, direction[2] * 0.9];
  const arrow = useMemo(() => {
    const dir = new THREE.Vector3(...direction).normalize();
    return new THREE.ArrowHelper(dir, new THREE.Vector3(0, 0, 0), 0.9, color, 0.18, 0.09);
  }, [color, direction]);

  return (
    <group>
      <primitive object={arrow} />
      <mesh
        ref={tipRef}
        position={end}
        onPointerDown={(event) => {
          event.stopPropagation();
          onSelect();
          const tip = tipRef.current;
          if (!tip?.parent) return;
          const rect = gl.domElement.getBoundingClientRect();
          const toScreen = (world: THREE.Vector3) => {
            const p = world.project(camera);
            return { x: (p.x * 0.5 + 0.5) * rect.width, y: (-p.y * 0.5 + 0.5) * rect.height };
          };
          const origin = toScreen(tip.parent.getWorldPosition(new THREE.Vector3()));
          const tipScreen = toScreen(tip.getWorldPosition(new THREE.Vector3()));
          const dx = tipScreen.x - origin.x;
          const dy = tipScreen.y - origin.y;
          const len = Math.hypot(dx, dy);
          if (len < 1e-3) return;
          dragRef.current = {
            lastX: event.nativeEvent.clientX,
            lastY: event.nativeEvent.clientY,
            dirX: dx / len,
            dirY: dy / len,
            worldPerPixel: 0.9 / len,
          };
          const target = event.target as Element & { setPointerCapture?: (pointerId: number) => void };
          target.setPointerCapture?.(event.pointerId);
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag) return;
          event.stopPropagation();
          const mx = event.nativeEvent.clientX - drag.lastX;
          const my = event.nativeEvent.clientY - drag.lastY;
          drag.lastX = event.nativeEvent.clientX;
          drag.lastY = event.nativeEvent.clientY;
          onDrag(axis, (mx * drag.dirX + my * drag.dirY) * drag.worldPerPixel);
        }}
        onPointerUp={(event) => {
          event.stopPropagation();
          dragRef.current = null;
          const target = event.target as Element & { releasePointerCapture?: (pointerId: number) => void };
          target.releasePointerCapture?.(event.pointerId);
        }}
      >
        <sphereGeometry args={[0.11, 24, 24]} />
        <meshStandardMaterial color={color} emissive={selected ? color : "#000000"} emissiveIntensity={selected ? 0.18 : 0} />
      </mesh>
    </group>
  );
}

function MovableQ({
  position,
  targetPosition,
  resetKey,
  onPositionChange,
  onPresetComplete,
  onVectorComplete,
}: {
  position: Vec3Position;
  targetPosition: Vec3Position | null;
  resetKey: number;
  onPositionChange: (position: Vec3Position) => void;
  onPresetComplete: () => void;
  onVectorComplete: () => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const latestPosition = useRef(position);
  const [selected, setSelected] = useState(false);

  useEffect(() => {
    latestPosition.current = position;
    groupRef.current?.position.set(...qToWorld(position));
  }, [position, resetKey]);

  const updatePosition = (nextPosition: Vec3Position) => {
    const clamped = clampQPosition(nextPosition);
    latestPosition.current = clamped;
    groupRef.current?.position.set(...qToWorld(clamped));
    onPositionChange(clamped);
  };

  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    if (targetPosition) {
      const target = new THREE.Vector3(...qToWorld(targetPosition));
      group.position.lerp(target, 0.09);
      const next = worldToQ(group.position.toArray() as [number, number, number]);
      latestPosition.current = next;
      onPositionChange(next);

      if (group.position.distanceTo(target) < 0.025) {
        group.position.copy(target);
        onPositionChange(targetPosition);
        onPresetComplete();
      }
    }

    if (isNearTarget(latestPosition.current)) onVectorComplete();
  });

  const dragAxis = (axis: DragAxis, delta: number) => {
    setSelected(true);
    const current = latestPosition.current;
    updatePosition({
      qx: axis === "x" ? current.qx + delta : current.qx,
      qy: axis === "y" ? current.qy + delta : current.qy,
      qz: axis === "z" ? current.qz + delta : current.qz,
    });
  };

  return (
    <group ref={groupRef} position={qToWorld(position)} onPointerDown={(event) => { event.stopPropagation(); setSelected(true); }}>
      <mesh visible={selected} position={[0, 0, 0]}>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshBasicMaterial color="#9ca3af" transparent opacity={0.18} />
      </mesh>
      <BallModel selected={selected} />
      <Label position={[0, 0.22, 0]} className={selected ? "text-slate-700 ring-slate-400" : "text-slate-700"}>Q</Label>
      <AxisDragHandle axis="x" color="#ef4444" direction={[1, 0, 0]} selected={selected} onSelect={() => setSelected(true)} onDrag={dragAxis} />
      <AxisDragHandle axis="y" color="#111827" direction={[0, 0, -1]} selected={selected} onSelect={() => setSelected(true)} onDrag={dragAxis} />
      <AxisDragHandle axis="z" color="#2563eb" direction={[0, 1, 0]} selected={selected} onSelect={() => setSelected(true)} onDrag={dragAxis} />
    </group>
  );
}
function TargetMarker() {
  return (
    <group position={qToWorld(TARGET_Q_POSITION)}>
      <mesh>
        <sphereGeometry args={[0.18, 24, 24]} />
        <meshBasicMaterial color="#9ca3af" transparent opacity={0.28} />
      </mesh>
      <Label position={[0, 0.34, 0]} className="text-slate-600">Target</Label>
    </group>
  );
}

function SceneContent(props: TeachingSceneProps) {
  const showAxes = props.step >= 2;

  return (
    <>
      <ambientLight intensity={0.78} />
      <directionalLight position={[4, 6, 5]} intensity={1.2} castShadow />
      <Room showAxes={showAxes} highlightAxes={props.axisComplete || props.step === 3} />
      {props.step === 2 && <StaticQ />}
      {props.step === 3 && (
        <>
          <ProjectionAndVector position={props.qPosition} />
          <TargetMarker />
          <MovableQ
            position={props.qPosition}
            targetPosition={props.targetPosition}
            resetKey={props.resetKey}
            onPositionChange={props.onQPositionChange}
            onPresetComplete={props.onPresetComplete}
            onVectorComplete={props.onVectorComplete}
          />
        </>
      )}
      <OrbitControls makeDefault enablePan={false} mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }} />
    </>
  );
}

export default function TeachingScene(props: TeachingSceneProps) {
  return (
    <div className="relative h-full min-h-[420px] overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm">
      <Canvas camera={{ position: [3.1, 2.4, -5.0], fov: 45 }} gl={{ antialias: true }} shadows>
        <color attach="background" args={["#e9edf2"]} />
        <Suspense fallback={null}>
          <SceneContent {...props} />
        </Suspense>
      </Canvas>
      <LoadingOverlay />
      <div className="absolute left-4 top-4 rounded-xl bg-white/90 px-3 py-2 text-xs font-semibold leading-5 text-slate-600 shadow-sm backdrop-blur">
        <p>Right drag to rotate camera. Scroll to zoom.</p>
        {props.step === 3 && <p>Drag the axis arrows on Q to move it onto the Target marker.</p>}
      </div>
    </div>
  );
}