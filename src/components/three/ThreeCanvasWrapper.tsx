"use client";

import { Canvas } from "@react-three/fiber";

export default function ThreeCanvasWrapper({
  children,
  background = "#f8fafc",
  orthographic = false,
}: {
  children: React.ReactNode;
  background?: string;
  orthographic?: boolean;
}) {
  return (
    <div style={{ width: "100%", height: "100%", touchAction: "none" }}>
      <Canvas
        key={orthographic ? "ortho" : "persp"}
        style={{ background }}
        orthographic={orthographic}
        camera={
          orthographic
            ? {
                position: [0, 8, 40],
                near: 0.1,
                far: 200,
                left: -10 * (typeof window !== "undefined" ? window.innerWidth / Math.max(window.innerHeight, 1) : 1.5),
                right: 10 * (typeof window !== "undefined" ? window.innerWidth / Math.max(window.innerHeight, 1) : 1.5),
                top: 10,
                bottom: -10,
              }
            : { position: [8, 6, 12], fov: 45, near: 0.01, far: 10000 }
        }
        gl={{ antialias: true }}
      >
        {children}
      </Canvas>
    </div>
  );
}
