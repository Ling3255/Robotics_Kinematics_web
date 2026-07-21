"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useLoader } from "@react-three/fiber";
import { GizmoHelper, GizmoViewport, OrbitControls, TransformControls, useProgress } from "@react-three/drei";
import { FBXLoader, SkeletonUtils } from "three-stdlib";
import { useBottomPanelStore } from "@/store/useBottomPanelStore";
import Character3D, { type CharacterPos } from "@/components/Character3D";

const DRAG_MODEL_URL = "/models/drag.fbx";

function LoadingOverlay() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="absolute inset-0 z-[6] flex items-center justify-center bg-gray-50/60 text-sm text-gray-400">
      Loading model... {progress.toFixed(0)}%
    </div>
  );
}

function DragBallModel() {
  const fbx = useLoader(FBXLoader, DRAG_MODEL_URL);
  const model = useMemo(() => {
    const cloned = SkeletonUtils.clone(fbx);

    cloned.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;

      mesh.material = new THREE.MeshStandardMaterial({
        color: "#d1d5db",
        roughness: 0.72,
        metalness: 0.04,
      });
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });

    return cloned;
  }, [fbx]);

  return <primitive object={model} scale={0.018} />;
}

function DragBallScene({ resetKey }: { resetKey: number }) {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div className="relative h-full w-full bg-slate-50">
      <Canvas camera={{ position: [0, 2.5, 6], fov: 40 }} gl={{ antialias: true }} shadows>
        <ambientLight intensity={0.85} />
        <directionalLight position={[4, 7, 5]} intensity={1.2} castShadow />
        <gridHelper args={[6, 12, "#d1d5db", "#e5e7eb"]} position={[0, -1.02, 0]} />
        <Suspense fallback={null}>
          <TransformControls
            key={resetKey}
            mode="translate"
            showX
            showY
            showZ
            size={1.1}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
          >
            <group position={[0, -0.9, 0]}>
              <DragBallModel />
            </group>
          </TransformControls>
        </Suspense>
        <OrbitControls enablePan={false} enabled={!isDragging} />
      </Canvas>
      <LoadingOverlay />

      <div className="absolute left-4 top-4 z-10 rounded-lg bg-white/90 px-3 py-2 text-xs leading-5 text-gray-600 shadow-lg backdrop-blur">
        <p>Drag the X, Y, or Z axis handle to move the sphere.</p>
        <p>The sphere itself stays locked; movement happens through the axes.</p>
      </div>
    </div>
  );
}

function CoordinateOverlay({ posRef }: { posRef: { current: CharacterPos } }) {
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let rafId: number;
    const tick = () => {
      if (textRef.current) {
        const p = posRef.current;
        textRef.current.textContent = `X ${p.x.toFixed(2)}  Y ${p.y.toFixed(2)}  Z ${p.z.toFixed(2)}`;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [posRef]);

  return (
    <div className="absolute right-4 top-4 z-10 rounded-lg bg-white/90 px-3 py-2 shadow-lg backdrop-blur">
      <span ref={textRef} className="font-mono text-xs tabular-nums text-gray-700">
        X 0.00 Y 0.00 Z 0.00
      </span>
    </div>
  );
}

function PositionScene() {
  const posRef = useRef<CharacterPos>({ x: 0, y: 0, z: 0 });

  return (
    <div className="relative h-full w-full">
      <Canvas camera={{ position: [0, 5, 10], fov: 45 }} gl={{ antialias: true }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1} />
        <Suspense fallback={null}>
          <Character3D posRef={posRef} />
        </Suspense>
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport
            disabled
            hideNegativeAxes
            labels={["X", "Z", "Y"]}
            axisColors={["#ef4444", "#22c55e", "#3b82f6"]}
            labelColor="#111827"
          />
        </GizmoHelper>
      </Canvas>

      <LoadingOverlay />
      <CoordinateOverlay posRef={posRef} />

      <div className="absolute left-4 top-4 z-10 rounded-lg bg-white/90 px-3 py-2 text-xs leading-5 text-gray-600 shadow-lg backdrop-blur">
        <p>WASD / arrow keys: move on the X-Y plane</p>
        <p>Hold Space: move upward along +Z</p>
        <p>Hold Shift: move downward along -Z</p>
      </div>
    </div>
  );
}

export default function PositionPage() {
  const [page, setPage] = useState(1);
  const [dragSceneKey, setDragSceneKey] = useState(0);
  const setBottomPanel = useBottomPanelStore((state) => state.setConfig);
  const resetBottomPanel = useBottomPanelStore((state) => state.resetConfig);

  useEffect(() => {
    const resetLesson = () => {
      setPage(1);
      setDragSceneKey((key) => key + 1);
    };

    if (page === 1) {
      setBottomPanel({
        hint: "Drag the sphere by using the X, Y, and Z axis handles, then click Next for the coordinate demo.",
        checkDisabled: true,
        checkLabel: "Previous",
        nextDisabled: false,
        resetDisabled: false,
        onReset: resetLesson,
        onNext: () => setPage(2),
      });
      return;
    }

    setBottomPanel({
      hint: "Use the keyboard controls and watch the live X, Y, Z position values.",
      checkDisabled: false,
      checkLabel: "Previous",
      onCheck: () => setPage(1),
      nextDisabled: true,
      resetDisabled: false,
      onReset: resetLesson,
    });
  }, [page, setBottomPanel]);

  useEffect(() => resetBottomPanel, [resetBottomPanel]);

  if (page === 1) {
    return <DragBallScene resetKey={dragSceneKey} />;
  }

  return <PositionScene />;
}