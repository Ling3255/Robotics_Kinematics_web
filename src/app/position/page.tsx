"use client";

import { Suspense, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { useProgress } from "@react-three/drei";
import Character3D, { type CharacterPos } from "@/components/Character3D";

function LoadingOverlay() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="absolute inset-0 z-[6] flex items-center justify-center bg-gray-50/60 text-sm text-gray-400">
      模型加载中... {progress.toFixed(0)}%
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

export default function PositionPage() {
  const posRef = useRef<CharacterPos>({ x: 0, y: 0, z: 0 });

  return (
    <div className="relative h-[calc(100vh-112px)] w-full">
      <Canvas camera={{ position: [0, 5, 10], fov: 45 }} gl={{ antialias: true }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1} />
        <Suspense fallback={null}>
          <Character3D posRef={posRef} />
        </Suspense>
      </Canvas>

      <LoadingOverlay />
      <CoordinateOverlay posRef={posRef} />

      <div className="absolute left-4 top-4 z-10 rounded-lg bg-white/90 px-3 py-2 text-xs leading-5 text-gray-600 shadow-lg backdrop-blur">
        <p>WASD / 方向键：控制 X-Y 平面移动</p>
        <p>按住空格：沿 Z 轴正方向上升</p>
        <p>按住 Shift：沿 Z 轴负方向下降</p>
      </div>
    </div>
  );
}