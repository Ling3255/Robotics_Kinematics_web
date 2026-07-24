"use client";

import { Suspense, useEffect } from "react";
import { useGLTF, OrbitControls, Bounds } from "@react-three/drei";
import * as THREE from "three";

// ============================================================
// Blender-style coordinate axes (X red, Y green, Z blue)
// ============================================================
function BlenderAxes({ length = 3 }: { length?: number }) {
  return (
    <group>
      {[
        { axis: "X", color: "#ef4444", rot: [0, 0, -Math.PI / 2] as const },
        { axis: "Y", color: "#22c55e", rot: [0, 0, 0] as const },
        { axis: "Z", color: "#3b82f6", rot: [Math.PI / 2, 0, 0] as const },
      ].map(({ axis, color, rot }) => (
        <group key={axis}>
          <mesh position={[0, length / 2, 0]} rotation={rot}>
            <cylinderGeometry args={[0.03, 0.03, length, 6]} />
            <meshBasicMaterial color={color} />
          </mesh>
          <mesh position={[0, length, 0]} rotation={rot}>
            <coneGeometry args={[0.1, 0.3, 8]} />
            <meshBasicMaterial color={color} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ============================================================
// Auto-centered model
// ============================================================
function Model() {
  const gltf = useGLTF("/models/robot-arm.glb");

  useEffect(() => {
    const box = new THREE.Box3().setFromObject(gltf.scene);
    const c = box.getCenter(new THREE.Vector3());
    const s = box.getSize(new THREE.Vector3());
    console.log(
      `[RobotArm] Loaded | center: (${c.x.toFixed(2)}, ${c.y.toFixed(2)}, ${c.z.toFixed(2)}) | ` +
      `size: (${s.x.toFixed(2)}, ${s.y.toFixed(2)}, ${s.z.toFixed(2)})`
    );
    // Center model on ground
    gltf.scene.position.set(-c.x, -box.min.y, -c.z);
  }, [gltf.scene]);

  return (
    <Bounds fit clip observe margin={1.5}>
      <primitive object={gltf.scene} />
    </Bounds>
  );
}

useGLTF.preload("/models/robot-arm.glb");

// ============================================================
// Scene
// ============================================================
function Ground() {
  return (
    <>
      <gridHelper args={[8, 20, "#94a3b8", "#e2e8f0"]} position={[0, 0, 0]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <shadowMaterial transparent opacity={0.15} />
      </mesh>
    </>
  );
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
      <directionalLight position={[-5, 3, -3]} intensity={0.3} />
    </>
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

export default function RobotArmScene() {
  return (
    <>
      <Lights />
      <Ground />
      <BlenderAxes length={2.5} />

      <Suspense fallback={<Loading />}>
        <Model />
      </Suspense>

      <OrbitControls
        makeDefault
        enablePan enableZoom enableRotate
        minDistance={0.5}
        maxDistance={20}
      />
    </>
  );
}
