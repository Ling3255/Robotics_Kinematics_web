'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import HintBox from '@/components/ui/HintBox';

// ============================================================
// Joint config — same convention as chapter 5 (Forward Kinematics)
// Bone chain: 骨骼.001 → 骨骼.002 → 骨骼.003 (base stays fixed)
// ============================================================
const CFG = {
  // NOTE: GLTFLoader sanitizes node names ("." is stripped), so
  // Blender's "骨骼.001" arrives in three.js as "骨骼001"
  boneNames: ['骨骼001', '骨骼001', '骨骼002', '骨骼003', '骨骼003'],
  rotationAxes: ['Y', 'Z', 'Z', 'Z', 'X'] as const,
  angleMin: [-180, -90, -90, -90, -180],
  angleMax: [180, 90, 90, 90, 180],
  angleDefault: [0, 30, 45, 0, 0],
};

const SLIDER_LABELS = [
  'θ₀  Base Spin',
  'θ₁  Upper Arm',
  'θ₂  Forearm',
  'θ₃  Wrist',
  'θ₄  Wrist Twist',
];

const PRESETS = [
  { label: 'Home', v: [0, 0, 0, 0, 0] },
  { label: 'Reach', v: [0, 45, 30, 15, 0] },
  { label: 'Fold', v: [0, 90, -60, -30, 0] },
  { label: 'Twist', v: [45, 30, 45, 0, 90] },
];

useGLTF.preload('/models/robo.glb');

interface BoneEntry {
  bone: THREE.Object3D;
  init: THREE.Euler;
}

function RoboModel({ anglesRef }: { anglesRef: React.MutableRefObject<number[]> }) {
  const gltf = useGLTF('/models/robo.glb');

  // Clone so the cached scene is never mutated, then normalize scale & ground the model
  const { scene, scale, offsetY } = useMemo(() => {
    const cloned = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const s = maxDim > 0 ? 6 / maxDim : 1;
    return { scene: cloned, scale: s, offsetY: -box.min.y * s };
  }, [gltf.scene]);

  // Find the joint bones once; base ("base" / 骨骼 root) is never touched
  const bonesRef = useRef<(BoneEntry | null)[]>([]);
  useEffect(() => {
    const found: (BoneEntry | null)[] = [];
    for (const name of CFG.boneNames) {
      let obj: THREE.Object3D | null = null;
      scene.traverse((o) => {
        if (o.name === name) obj = o;
      });
      if (obj) {
        const bone: THREE.Object3D = obj;
        found.push({ bone, init: bone.rotation.clone() });
      } else {
        console.warn(`[Robo] Joint NOT found: "${name}"`);
        found.push(null);
      }
    }
    bonesRef.current = found;
    console.log(
      `[Robo] Joints: ${found.map((b, i) => `${i}=${b?.bone.name || 'MISSING'}`).join(', ')}`,
    );
  }, [scene]);

  useEffect(() => {
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
  }, [scene]);

  // Drive joints — same cumulative-axes approach as chapter 5
  useFrame(() => {
    const a = anglesRef.current;
    const bones = bonesRef.current;
    // Reset each unique bone once to its initial rotation
    const unique = [...new Set(bones.filter(Boolean) as BoneEntry[])];
    for (const entry of unique) entry.bone.rotation.copy(entry.init);
    // Apply joint angles
    for (let i = 0; i < bones.length; i++) {
      const entry = bones[i];
      if (!entry) continue;
      const rad = THREE.MathUtils.degToRad(a[i] ?? 0);
      const axis = CFG.rotationAxes[i];
      if (axis === 'X') entry.bone.rotation.x += rad;
      if (axis === 'Y') entry.bone.rotation.y += rad;
      if (axis === 'Z') entry.bone.rotation.z += rad;
    }
  });

  return (
    <group scale={scale} position={[0, offsetY, 0]}>
      <primitive object={scene} />
    </group>
  );
}

function Loading() {
  return (
    <mesh position={[0, 1.5, 0]}>
      <boxGeometry args={[1, 2, 1]} />
      <meshStandardMaterial color="#93c5fd" wireframe transparent opacity={0.5} />
    </mesh>
  );
}

function AngleSlider({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div className="mb-4">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="text-slate-800 font-bold tabular-nums">{value.toFixed(1)}°</span>
      </div>
      <input type="range" min={min} max={max} step={0.5} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none bg-slate-200 outline-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:shadow-md" />
      <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
        <span>{min}°</span><span>{max}°</span>
      </div>
    </div>
  );
}

export default function RoboViewer() {
  const [angles, setAngles] = useState<number[]>([...CFG.angleDefault]);
  const anglesRef = useRef(angles);
  useEffect(() => { anglesRef.current = angles; }, [angles]);

  const setAngle = (i: number) => (v: number) =>
    setAngles((prev) => prev.map((x, idx) => (idx === i ? v : x)));

  return (
    <div className="flex h-[calc(100vh-112px)] w-full gap-5 bg-slate-50 p-5">
      {/* 3D Canvas */}
      <div className="relative flex-1 min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <Canvas shadows camera={{ position: [6, 5, 8], fov: 45 }}>
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 8, 5]} intensity={1.2} castShadow />
          <directionalLight position={[-4, 4, -4]} intensity={0.4} />

          <gridHelper args={[20, 20, '#94a3b8', '#e2e8f0']} />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
            <planeGeometry args={[24, 24]} />
            <shadowMaterial transparent opacity={0.15} />
          </mesh>

          <Suspense fallback={<Loading />}>
            <RoboModel anglesRef={anglesRef} />
          </Suspense>

          <OrbitControls
            makeDefault
            enablePan
            enableZoom
            enableRotate
            enableDamping
            dampingFactor={0.08}
            minDistance={2}
            maxDistance={30}
            target={[0, 2.5, 0]}
          />
        </Canvas>

        <HintBox hintLabel="Controls">
          <p>Drag with left mouse button: rotate view</p>
          <p>Scroll: zoom in / out</p>
          <p>Right-drag: pan view</p>
          <p>Adjust the joint angle sliders to move the arm — the base stays fixed</p>
        </HintBox>
      </div>

      {/* Joint angle panel — mirrors chapter 5 (Forward Kinematics) */}
      <div className="w-[240px] shrink-0 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Joint Angles
        </p>

        <div>
          {angles.map((v, i) => (
            <AngleSlider
              key={i}
              label={SLIDER_LABELS[i]}
              value={v}
              min={CFG.angleMin[i]}
              max={CFG.angleMax[i]}
              onChange={setAngle(i)}
            />
          ))}
        </div>

        <div className="pt-3 border-t border-slate-100">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Values</p>
          {angles.map((v, i) => (
            <div key={i} className="flex justify-between px-2 py-1">
              <span className="text-xs text-slate-500 font-mono">θ<sub>{i}</sub></span>
              <span className="text-xs font-bold text-slate-800 font-mono">{v.toFixed(1)}°</span>
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-slate-100">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Presets</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => (
              <button key={p.label}
                onClick={() => setAngles([...p.v])}
                className="cursor-pointer rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1
                  text-[11px] font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-800">
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
