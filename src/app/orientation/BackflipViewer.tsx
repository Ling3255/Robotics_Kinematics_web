"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { FBXLoader, SkeletonUtils } from "three-stdlib";
import * as THREE from "three";
import HintBox from "@/components/ui/HintBox";

const MODEL_URL = "/models/Backflip.fbx";
const INITIAL_ROTATION_MATRIX = [1, 0, 0, 0, 1, 0, 0, 0, 1];
// Slow the character down so students can follow the orientation change
const ANIMATION_SPEED = 0.2;
// Simplify the demo to a single-axis spin: the cube and the matrix only keep
// the twist around this axis (world X = the character's lateral/flip axis)
const FLIP_AXIS = new THREE.Vector3(1, 0, 0);

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
  const actionRef = useRef<THREE.AnimationAction | null>(null);
  const orientationSourceRef = useRef<THREE.Object3D | null>(null);
  const worldQuaternionRef = useRef(new THREE.Quaternion());
  // First animation frame becomes the reference pose, so the cube starts at
  // the identity orientation and returns to it on every loop
  const refQuaternionRef = useRef<THREE.Quaternion | null>(null);
  const relQuaternionRef = useRef(new THREE.Quaternion());
  // Continuous angle tracking — lets the cube spin one way only, so the
  // wind-up lean (a small reverse swing) never shows on the cube
  const prevActionTimeRef = useRef(0);
  const prevSignedAngleRef = useRef(0);
  const continuousAngleRef = useRef(0);
  // Offline calibration of the clip: spin direction + scale so the cube
  // starts exactly at the origin and lands exactly back on it each loop
  const calibrationRef = useRef<{ dir: 1 | -1; scale: number } | null>(null);

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
      action.timeScale = ANIMATION_SPEED;
      action.reset().play();
      actionRef.current = action;

      // Offline pass: sample the whole clip once to measure the spin path —
      // which direction the flip goes, and how far that side actually reaches
      const source = orientationSourceRef.current;
      if (source) {
        const SAMPLES = 120;
        const q0 = new THREE.Quaternion();
        const qr = new THREE.Quaternion();
        const qw = new THREE.Quaternion();
        let prevSigned = 0;
        let continuous = 0;
        let max = 0;
        let min = 0;
        for (let i = 0; i <= SAMPLES; i++) {
          action.time = (clip.duration * i) / SAMPLES;
          mixer.update(0);
          source.getWorldQuaternion(qw);
          if (i === 0) q0.copy(qw);
          qr.copy(q0).invert().multiply(qw);
          const s = qr.x * FLIP_AXIS.x + qr.y * FLIP_AXIS.y + qr.z * FLIP_AXIS.z;
          const signed = 2 * Math.atan2(s, qr.w);
          if (i === 0) prevSigned = signed;
          let d = signed - prevSigned;
          d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2;
          prevSigned = signed;
          continuous += d;
          max = Math.max(max, continuous);
          min = Math.min(min, continuous);
        }
        action.reset().play();
        const dir = max >= -min ? 1 : -1;
        const extreme = dir > 0 ? max : -min;
        calibrationRef.current = {
          dir,
          scale: extreme > Math.PI / 2 ? (Math.PI * 2) / extreme : 1,
        };
      }
    }

    return () => {
      mixer.stopAllAction();
      mixerRef.current = null;
      actionRef.current = null;
      orientationSourceRef.current = null;
      refQuaternionRef.current = null;
      prevActionTimeRef.current = 0;
      prevSignedAngleRef.current = 0;
      continuousAngleRef.current = 0;
      calibrationRef.current = null;
    };
  }, [model]);

  useFrame((_, delta) => {
    mixerRef.current?.update(delta);

    const source = orientationSourceRef.current;
    if (!source) return;

    source.getWorldQuaternion(worldQuaternionRef.current);

    // Rotation relative to the first frame — the cube starts upright
    if (!refQuaternionRef.current) {
      refQuaternionRef.current = worldQuaternionRef.current.clone();
    }
    relQuaternionRef.current
      .copy(refQuaternionRef.current)
      .invert()
      .multiply(worldQuaternionRef.current);

    // Signed angle of the relative rotation around FLIP_AXIS, in (-π, π]
    const q = relQuaternionRef.current;
    const s = q.x * FLIP_AXIS.x + q.y * FLIP_AXIS.y + q.z * FLIP_AXIS.z;
    const signed = 2 * Math.atan2(s, q.w);

    // Restart accumulation every time the animation loop wraps
    const actionTime = actionRef.current?.time ?? 0;
    if (actionTime < prevActionTimeRef.current - 1e-4) {
      continuousAngleRef.current = 0;
      prevSignedAngleRef.current = signed;
    }
    prevActionTimeRef.current = actionTime;

    // Unwrap to a continuous angle
    let deltaAngle = signed - prevSignedAngleRef.current;
    deltaAngle -= Math.round(deltaAngle / (Math.PI * 2)) * Math.PI * 2;
    prevSignedAngleRef.current = signed;
    continuousAngleRef.current += deltaAngle;

    // One-directional display using the offline calibration: the lean swings
    // to the opposite side of zero and is clamped away, so the cube starts
    // exactly at the origin and the scale makes it land exactly on one full
    // turn (identity) at the end of every loop
    const cal = calibrationRef.current;
    const raw = continuousAngleRef.current * (cal?.scale ?? 1);
    const displayAngle = !cal || cal.dir > 0 ? Math.max(0, raw) : Math.min(0, raw);

    orientationRef.current.setFromAxisAngle(FLIP_AXIS, displayAngle);
    writeMatrixFromQuaternion(orientationRef.current, matrixRef);
  });

  return <primitive object={model} scale={scale} position={[0, 0, 0]} />;
}

function SyncCube({ orientationRef }: { orientationRef: OrientationRef }) {
  const cubeRef = useRef<THREE.Mesh | null>(null);

  useFrame(() => {
    cubeRef.current?.quaternion.copy(orientationRef.current);
  });

  return (
    <mesh ref={cubeRef}>
      <boxGeometry args={[1.2, 1.2, 1.2]} />
      <meshStandardMaterial color="#38bdf8" roughness={0.42} metalness={0.08} />
    </mesh>
  );
}

function CubeScene({ orientationRef }: { orientationRef: OrientationRef }) {
  return (
    <Canvas camera={{ position: [3.8, 3.2, 5.2], fov: 42 }} gl={{ antialias: true }}>
      <ambientLight intensity={0.75} />
      <directionalLight position={[5, 6, 4]} intensity={1.15} />
      <SyncCube orientationRef={orientationRef} />
      <axesHelper args={[2.4]} />
      <OrbitControls target={[0, 0, 0]} enableRotate={false} />
    </Canvas>
  );
}

function AxisSymbol({ axis, color }: { axis: "X" | "Y" | "Z"; color: string }) {
  return (
    <span className={`font-semibold italic ${color}`}>
      <sup className="text-[9px] not-italic text-slate-400">U</sup>
      {axis}&#770;<sub className="text-[9px] not-italic text-slate-400">B</sub>
    </span>
  );
}

function RotationMatrixPanel({ matrixRef }: { matrixRef: MatrixRef }) {
  const valueRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    // Column base colors matching the axes (X red, Y green, Z blue)
    const COLUMN_RGB = [
      [220, 38, 38],
      [22, 163, 74],
      [37, 99, 235],
    ] as const;

    let rafId: number;
    const tick = () => {
      matrixRef.current.forEach((value, index) => {
        const el = valueRefs.current[index];
        if (!el) return;
        el.textContent = value.toFixed(2);
        // Color depth follows |value|: 0 → faint wash, ±1 → saturated
        const strength = Math.min(Math.abs(value), 1);
        const [r, g, b] = COLUMN_RGB[index % 3];
        el.style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${(0.07 + 0.5 * strength).toFixed(3)})`;
        el.style.color = strength > 0.65 ? "#ffffff" : "#1f2937";
      });
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [matrixRef]);

  return (
    <div className="absolute bottom-4 left-4 right-4 z-10 rounded-lg bg-white/92 p-4 shadow-lg backdrop-blur">
      {/* Orientation equation — ᵁ_B R = [ ᵁX̂_B  ᵁŶ_B  ᵁẐ_B ] */}
      <div className="mb-3 flex items-baseline justify-between gap-4">
        <h2 className="text-sm font-semibold text-gray-900">
          <sup className="text-[10px] text-slate-400">U</sup>
          <sub className="text-[10px] text-slate-400">B</sub>R
          <span className="mx-1.5 font-normal">=</span>[
          <AxisSymbol axis="X" color="text-red-600" />{" "}
          <AxisSymbol axis="Y" color="text-green-600" />{" "}
          <AxisSymbol axis="Z" color="text-blue-600" />]
        </h2>
        <span className="text-xs text-gray-500">3 × 3 rotation matrix</span>
      </div>

      {/* Live matrix — each column is one of B's axes seen from U */}
      <div className="grid grid-cols-3 gap-2 font-mono text-sm tabular-nums text-gray-800">
        {INITIAL_ROTATION_MATRIX.map((value, index) => (
          <span
            key={index}
            ref={(el) => {
              valueRefs.current[index] = el;
            }}
            className={`rounded px-2 py-1 text-center ${
              index % 3 === 0 ? "bg-red-50" : index % 3 === 1 ? "bg-green-50" : "bg-blue-50"
            }`}
          >
            {value.toFixed(2)}
          </span>
        ))}
      </div>

      {/* Column labels aligned with the grid above */}
      <div className="mt-1.5 grid grid-cols-3 gap-2 text-center text-xs">
        <AxisSymbol axis="X" color="text-red-600" />
        <AxisSymbol axis="Y" color="text-green-600" />
        <AxisSymbol axis="Z" color="text-blue-600" />
      </div>

      {/* Symbol explanation */}
      <dl className="mt-3 space-y-1 border-t border-slate-100 pt-2.5 text-[11px] leading-4 text-slate-500">
        <div className="flex gap-2">
          <dt className="shrink-0 font-bold text-slate-700">U</dt>
          <dd>Fixed reference frame. It never changes.</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 font-bold text-slate-700">B</dt>
          <dd>Object frame attached to the moving body (the person&apos;s hips).</dd>
        </div>
        <div className="flex gap-2">
          <dt className="shrink-0 font-bold text-slate-700">Columns</dt>
          <dd>Each column shows where one of B&apos;s axes points as seen from U. The motion is simplified to a single-axis spin (X, red) — the first column stays fixed at (1, 0, 0).</dd>
        </div>
      </dl>
    </div>
  );
}

export default function BackflipViewer() {
  const orientationRef = useRef(new THREE.Quaternion());
  const matrixRef = useRef([...INITIAL_ROTATION_MATRIX]);

  return (
    <div className="relative h-[calc(100vh-112px)] w-full">
      <div className="flex h-full w-full">
        <div className="relative h-full w-1/2 bg-slate-50">
          <Canvas>
            <CameraSetup position={[0, 2.8, 8]} target={[0, 1.7, 0]} />
            <ambientLight intensity={0.65} />
            <directionalLight position={[6, 10, 6]} intensity={1.1} />
            <BackflipModel orientationRef={orientationRef} matrixRef={matrixRef} />
            <OrbitControls target={[0, 1.7, 0]} enableRotate={false} />
          </Canvas>
        </div>

        <div className="relative h-full w-1/2 border-l-2 border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100">
          <CubeScene orientationRef={orientationRef} />
          <HintBox hintLabel="Orientation Info">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Orientation</p>
            <p className="mt-1 text-sm text-gray-700">The cube keeps only the single-axis (X) spin of the character — the matrix updates with it.</p>
            <p className="mt-1 text-xs text-gray-500">Drag to pan · Scroll to zoom (view rotation is locked)</p>
          </HintBox>
          <RotationMatrixPanel matrixRef={matrixRef} />
        </div>
      </div>
    </div>
  );
}