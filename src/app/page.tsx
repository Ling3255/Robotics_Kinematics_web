<<<<<<< HEAD
"use client";

import { Canvas } from "@react-three/fiber";
import Character3D from "@/components/Character3D";

export default function HomePage() {
  return (
    <>
      {/* 3D background — fixed, full-screen, behind everything */}
      <div className="fixed inset-0 w-screen h-screen z-0">
        <Canvas
          camera={{ position: [0, 5, 10], fov: 45 }}
          gl={{ antialias: true }}
        >
          <ambientLight intensity={0.6} />
          <directionalLight position={[5, 10, 5]} intensity={1} />
          <Character3D />
        </Canvas>
      </div>

      {/* Foreground content placeholder — sits above the 3D canvas */}
      <div className="relative z-10 p-8" />
    </>
  );
=======
import FbxViewer from './robot-basics/FbxViewer';

export default function HomePage() {
  return <FbxViewer />;
>>>>>>> 9ad57a4056c5a1a97cf3058fbfd2edd08c21ff58
}
