"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { FBXLoader, SkeletonUtils } from "three-stdlib";
import * as THREE from "three";

const MODEL_URL = "/models/Backflip.fbx";
const INITIAL_ROTATION_MATRIX = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const CUBE_AXIS_LENGTH = 2.0;

type MatrixRef = { current: number[] };
type OrientationRef = { current: THREE.Quaternion };

function CameraSetup({ position, target }: { position: [number, number, number]; target: [number, number, number] }) {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(...position);
    camera.lookAt(...target);
  }, [camera, position, target]);

  return null;
}

function getOrientationSource(model: THREE.Object3D) {
  let fallback: THREE.Object3D = model;
  let source: THREE.Object3D | null = null;

  model.traverse((obj) => {
    if (source) return;
    const name = obj.name.toLowerCase();
    if (name.includes("hips") || name.includes("pelvis") || name.includes("spine")) {
      source = obj;
    }
    if ((obj as THREE.Bone).isBone && fallback === model) {
      fallback = obj;
    }
  });

  return source ?? fallback;
}

function writeMatrixFromQuaternion(quaternion: THREE.Quaternion, matrixRef: MatrixRef) {
  const matrix = new THREE.Matrix4().makeRotationFromQuaternion(quaternion);
  const e = matrix.elements;
  matrixRef.current = [e[0], e[4], e[8], e[1], e[5], e[9], e[2], e[6], e[10]];
}

function BackflipModel({ orientationRef, matrixRef }: { orientationRef: OrientationRef; matrixRef: MatrixRef }) {
  const fbx = useLoader(FBXLoader, MODEL_URL);
  const model = useMemo(() => SkeletonUtils.clone(fbx), [fbx]);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const orientationSourceRef = useRef<THREE.Object3D | null>(null);
  const worldQuaternionRef = useRef(new THREE.Quaternion());

  const scale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    return size.y > 0 ? 4.6 / size.y : 1;
  }, [model]);

  useEffect(() => {
    const mixer = new THREE.AnimationMixer(model);
    const clip = model.animations.reduce<THREE.AnimationClip | null>(
      (best, current) => (current.tracks.length > (best?.tracks.length ?? -1) ? current : best),
      null,
    );

    mixerRef.current = mixer;
    orientationSourceRef.current = getOrientationSource(model);

    if (clip) {
      const action = mixer.clipAction(clip);
      action.setLoop(THREE.LoopRepeat, Infinity);
      action.clampWhenFinished = false;
      action.reset().play();
    }

    return () => {
      mixer.stopAllAction();
      mixerRef.current = null;
      orientationSourceRef.current = null;
    };
  }, [model]);

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);

    const source = orientationSourceRef.current;
    if (!source) return;

    source.getWorldQuaternion(worldQuaternionRef.current);
    orientationRef.current.copy(worldQuaternionRef.current);
    writeMatrixFromQuaternion(worldQuaternionRef.current, matrixRef);
  });

  return <primitive object={model} scale={scale} position={[0, 0, 0]} />;
}

function HtmlLabel({ position, children, className = "" }: { position: [number, number, number]; children: React.ReactNode; className?: string }) {
  return (
    <Html position={position} center distanceFactor={8} occlude={false} style={{ pointerEvents: "none" }}>
      <div className={`whitespace-nowrap rounded-md bg-white/90 px-2 py-1 text-xs font-bold shadow-sm ring-1 ring-slate-200 ${className}`}>
        {children}
      </div>
    </Html>
  );
}

/** Fixed U coordinate frame — always world-aligned, never rotates */
function UReferenceFrame() {
  return (
    <group>
      <axesHelper args={[CUBE_AXIS_LENGTH]} />
      {/* Origin sphere */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.07, 24, 24]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      {/* U labels */}
      <HtmlLabel position={[CUBE_AXIS_LENGTH + 0.25, 0.06, 0]} className="text-red-600">X_U</HtmlLabel>
      <HtmlLabel position={[0, CUBE_AXIS_LENGTH + 0.25, 0]} className="text-green-600">Y_U</HtmlLabel>
      <HtmlLabel position={[0, 0.06, CUBE_AXIS_LENGTH + 0.25]} className="text-blue-600">Z_U</HtmlLabel>
    </group>
  );
}

/** Arc ring showing angular deviation between X_U (world X) and X_B (rotated X) */
function UBAngleIndicator({ orientationRef }: { orientationRef: OrientationRef }) {
  const arcRef = useRef<THREE.Line | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);
  const angleRef = useRef(0);

  // We use a 3D arc in the X-Y plane to show the deviation
  const arcRadius = 0.9;
  const numSegments = 64;

  // Create the arc geometry once
  const arcGeomRef = useRef<THREE.BufferGeometry>(new THREE.BufferGeometry());
  const positionArrayRef = useRef(new Float32Array((numSegments + 1) * 3));
  const arcLine = useMemo(
    () =>
      new THREE.Line(
        arcGeomRef.current,
        new THREE.LineBasicMaterial({
          color: "#f97316",
          transparent: true,
          opacity: 0.85,
        })
      ),
    []
  );

  useFrame(() => {
    // Compute X_B direction from orientation
    const xB = new THREE.Vector3(1, 0, 0).applyQuaternion(orientationRef.current).normalize();
    // World X (X_U)
    const xU = new THREE.Vector3(1, 0, 0);

    const angleRad = Math.acos(Math.min(1, Math.max(-1, xB.dot(xU))));
    const angleDeg = THREE.MathUtils.radToDeg(angleRad);
    angleRef.current = angleDeg;

    // Only show arc if there's meaningful deviation
    if (angleRad < 0.003) {
      // Hide arc
      if (arcRef.current) arcRef.current.visible = false;
      if (labelRef.current) labelRef.current.style.opacity = "0";
      return;
    }

    if (arcRef.current) arcRef.current.visible = true;
    if (labelRef.current) labelRef.current.style.opacity = "1";

    // Determine rotation axis for the arc (cross product gives the axis)
    const axis = new THREE.Vector3().crossVectors(xU, xB).normalize();
    // If deviation is very small or cross product is zero, default to Z axis
    if (axis.length() < 1e-6) {
      axis.set(0, 0, 1);
    }

    // Build quaternion that rotates X_U towards X_B
    const rotQ = new THREE.Quaternion().setFromAxisAngle(axis, angleRad);

    // Build arc points: start from world X direction, rotate step by step
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

    // Position the HTML label at midpoint of arc
    const midQ = new THREE.Quaternion().setFromAxisAngle(axis, angleRad * 0.5);
    const midPt = startDir.clone().applyQuaternion(midQ);
    if (labelRef.current) {
      labelRef.current.style.transform = `translate(-50%, -50%)`;
    }
  });

  return (
    <group>
      <primitive
        object={arcLine}
        ref={(l: THREE.Line) => {
          arcRef.current = l;
        }}
      />
      {/* Arcs at tip positions for better visibility */}
      <Html position={[0, 0, 0]} center distanceFactor={6} occlude={false} style={{ pointerEvents: "none" }}>
        <div
          ref={labelRef}
          className="rounded-full bg-orange-500/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-md backdrop-blur transition-opacity"
          style={{ opacity: 0 }}
        >
          ∠ {angleRef.current.toFixed(0)}°
        </div>
      </Html>
    </group>
  );
}

/** Rotating B coordinate frame — attached to the cube, follows orientation */
function BFrameAxes({ orientationRef }: { orientationRef: OrientationRef }) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.quaternion.copy(orientationRef.current);
    }
  });

  return (
    <group ref={groupRef}>
      {/* X_B axis arrow */}
      <arrowHelper args={[new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), CUBE_AXIS_LENGTH, "#ef4444", 0.15, 0.08]} />
      {/* Y_B axis arrow */}
      <arrowHelper args={[new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), CUBE_AXIS_LENGTH, "#22c55e", 0.15, 0.08]} />
      {/* Z_B axis arrow */}
      <arrowHelper args={[new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), CUBE_AXIS_LENGTH, "#3b82f6", 0.15, 0.08]} />
      {/* B labels */}
      <HtmlLabel position={[CUBE_AXIS_LENGTH + 0.25, 0.06, 0]} className="text-red-600 ring-red-200">X_B</HtmlLabel>
      <HtmlLabel position={[0, CUBE_AXIS_LENGTH + 0.25, 0]} className="text-green-600 ring-green-200">Y_B</HtmlLabel>
      <HtmlLabel position={[0, 0.06, CUBE_AXIS_LENGTH + 0.25]} className="text-blue-600 ring-blue-200">Z_B</HtmlLabel>
    </group>
  );
}

function SyncCube({ orientationRef }: { orientationRef: OrientationRef }) {
  const cubeRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (cubeRef.current) {
      cubeRef.current.quaternion.copy(orientationRef.current);
    }
  });

  return (
    <mesh ref={cubeRef}>
      <boxGeometry args={[1.2, 1.2, 1.2]} />
      <meshStandardMaterial color="#38bdf8" roughness={0.42} metalness={0.08} transparent opacity={0.35} />
    </mesh>
  );
}

function CubeScene({ orientationRef }: { orientationRef: OrientationRef }) {
  return (
    <Canvas camera={{ position: [3.8, 3.2, 5.2], fov: 42 }} gl={{ antialias: true }}>
      <ambientLight intensity={0.75} />
      <directionalLight position={[5, 6, 4]} intensity={1.15} />
      {/* Fixed U frame (thin helper axes) */}
      <UReferenceFrame />
      {/* Angle arc between X_U and X_B */}
      <UBAngleIndicator orientationRef={orientationRef} />
      {/* Rotating cube with B frame */}
      <group>
        <SyncCube orientationRef={orientationRef} />
        <BFrameAxes orientationRef={orientationRef} />
      </group>
      <OrbitControls target={[0, 0, 0]} enablePan={false} />
    </Canvas>
  );
}

function RotationMatrixPanel({ matrixRef }: { matrixRef: MatrixRef }) {
  const valueRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    let rafId: number;
    const tick = () => {
      matrixRef.current.forEach((value, index) => {
        const el = valueRefs.current[index];
        if (el) el.textContent = value.toFixed(2);
      });
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [matrixRef]);

  return (
    <div className="absolute bottom-4 left-4 right-4 z-10 rounded-lg bg-white/92 p-4 shadow-lg backdrop-blur">
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold text-gray-900">Rotation Matrix R</h2>
        <span className="text-xs text-gray-500">Character pose = cube pose</span>
      </div>
      <div className="grid grid-cols-3 gap-2 font-mono text-sm tabular-nums text-gray-800">
        {INITIAL_ROTATION_MATRIX.map((value, index) => (
          <span
            key={index}
            ref={(el) => {
              valueRefs.current[index] = el;
            }}
            className="rounded bg-gray-100 px-2 py-1 text-center"
          >
            {value.toFixed(2)}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function BackflipViewer() {
  const orientationRef = useRef(new THREE.Quaternion());
  const matrixRef = useRef([...INITIAL_ROTATION_MATRIX]);

  return (
    <div className="relative min-h-[420px] w-full flex-1 lg:min-h-0">
      <div className="flex h-full w-full">
        <div className="relative h-full w-1/2 bg-slate-50">
          <Canvas>
            <CameraSetup position={[0, 2.8, 8]} target={[0, 1.7, 0]} />
            <ambientLight intensity={0.65} />
            <directionalLight position={[6, 10, 6]} intensity={1.1} />
            <BackflipModel orientationRef={orientationRef} matrixRef={matrixRef} />
            <OrbitControls target={[0, 1.7, 0]} />
          </Canvas>
        </div>

        <div className="relative h-full w-1/2 border-l-2 border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100">
          <CubeScene orientationRef={orientationRef} />
          <div className="absolute left-4 top-4 z-10 rounded-lg bg-white/90 px-3 py-2 shadow-lg backdrop-blur">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Orientation</p>
            <p className="mt-1 text-sm text-gray-700">Watch the character flip, cube rotation, and matrix values change together.</p>
          </div>
          <RotationMatrixPanel matrixRef={matrixRef} />
        </div>
      </div>
    </div>
  );
}