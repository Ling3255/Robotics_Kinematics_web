"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { FBXLoader, SkeletonUtils } from "three-stdlib";
import * as THREE from "three";

const MODEL_URL = "/models/Backflip.fbx";
const INITIAL_ROTATION_MATRIX = [1, 0, 0, 0, 1, 0, 0, 0, 1];

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
    <div className="relative h-[calc(100vh-112px)] w-full">
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