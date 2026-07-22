"use client";

import { useRef, useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useGLTF, Html } from "@react-three/drei";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as THREE from "three";

// ============================================================
// [可修改配置]
// ============================================================
const CFG = {
  // θ₀:骨骼001绕Y=底座上方转 | θ₁₂₃:Z=关节折叠 | θ₄:骨骼003绕X=爪子轴向自转(不分离)
  boneNames: ["骨骼001", "骨骼001", "骨骼002", "骨骼003", "骨骼003"],
  // θ₄ Wrist也和arm一样在XY平面上下扭动（绕Z轴）
  // θ₃=Z手腕上下 | θ₄=X爪子自转
  rotationAxes: ["Y", "Z", "Z", "Z", "X"] as const,
  rotationSigns: [1, 1, 1, 1, 1],
  angleMin: [-180, -90, -90, -90, -180],
  angleMax: [180, 90, 90, 90, 180],
  angleDefault: [0, 30, 45, 0, 0],
  // 2D 正交视图缩放
  orthoZoom: 4,
};

useGLTF.preload("/models/Forward.glb");

// ============================================================
// [核心换算] 连杆间夹角(度) → 骨骼局部旋转(弧度)
// ============================================================
function linkAngleToBoneRotation(thetaDeg: number, jointIndex: number): number {
  return CFG.rotationSigns[jointIndex] * THREE.MathUtils.degToRad(thetaDeg);
}

interface SceneProps {
  angles: number[];
  cameraMode: "3d" | "top" | "side";
  onReady?: (ok: boolean) => void;
}

// ============================================================
// 2D vertical grid (XY plane) — visible in side view
// ============================================================
function VerticalGrid() {
  return (
    <group rotation={[0, Math.PI / 2, 0]}>
      <gridHelper args={[30, 30, "#cbd5e1", "#cbd5e1"]} position={[0, 8, 0]} />
    </group>
  );
}

// ============================================================
// Near-infinite workspace grid
// ============================================================
function Ground() {
  return (
    <>
      {/* Massive ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]} receiveShadow>
        <planeGeometry args={[2000, 2000]} />
        <meshStandardMaterial color="#f8fafc" roughness={1} metalness={0} transparent opacity={0.45} />
      </mesh>

      {/* Single uniform grid — 10m cells across 2000m */}
      <gridHelper args={[2000, 200, "#94a3b8", "#94a3b8"]} position={[0, 0.003, 0]} />
    </>
  );
}

// ============================================================
// Infinite axes matching Blender convention:
//   glTF export converts Blender Z-up → Three.js Y-up
//   Blender X(红) → Three.js X / Blender Y(绿) → Three.js Z / Blender Z(蓝) → Three.js Y
//   Result: Red(X) & Green(Z) on ground plane, Blue(Y) pointing up
// ============================================================
function BaseAxes() {
  const L = 60;

  function line(from: [number, number, number], to: [number, number, number], color: string) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(...from), new THREE.Vector3(...to),
    ]);
    return (
      <lineSegments key={color}>
        <primitive object={geo} attach="geometry" />
        <lineBasicMaterial color={color} transparent opacity={0.5} depthTest={false} />
      </lineSegments>
    );
  }

  function arrow(pos: [number, number, number], dir: [number, number, number], color: string) {
    const quat = new THREE.Quaternion().setFromUnitVectors(
      new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dir).normalize()
    );
    return (
      <mesh key={`arrow-${color}`} position={pos} quaternion={quat}>
        <coneGeometry args={[0.25, 0.7, 8]} />
        <meshBasicMaterial color={color} depthTest={false} />
      </mesh>
    );
  }

  return (
    <group position={[0, 0.03, 0]}>
      {line([-L, 0, 0], [L, 0, 0], "#ef4444")}
      {arrow([L, 0, 0], [1, 0, 0], "#ef4444")}
      <Html position={[L + 0.8, 0, 0]} center style={{ color: "#ef4444", fontSize: 12, fontWeight: 700, pointerEvents: "none" }}>
        X
      </Html>

      {line([0, 0, -L], [0, 0, L], "#22c55e")}
      {arrow([0, 0, L], [0, 0, 1], "#22c55e")}
      <Html position={[0, 0, L + 0.8]} center style={{ color: "#22c55e", fontSize: 12, fontWeight: 700, pointerEvents: "none" }}>
        Y
      </Html>

      {line([0, -L, 0], [0, L, 0], "#3b82f6")}
      {arrow([0, L, 0], [0, 1, 0], "#3b82f6")}
      <Html position={[0, L + 0.8, 0]} center style={{ color: "#3b82f6", fontSize: 12, fontWeight: 700, pointerEvents: "none" }}>
        Z
      </Html>
    </group>
  );
}

// ============================================================
// Lights — clean studio setup
// ============================================================
function Lights() {
  return (
    <>
      <ambientLight intensity={1.2} />
      <directionalLight position={[6, 10, 4]} intensity={2} castShadow
        shadow-mapSize={[1024, 1024]} shadow-camera-far={40}
        shadow-camera-left={-8} shadow-camera-right={8}
        shadow-camera-top={8} shadow-camera-bottom={-8}
      />
      <directionalLight position={[-4, 5, -4]} intensity={0.6} color="#bfdbfe" />
      <directionalLight position={[0, 3, -6]} intensity={0.3} />
    </>
  );
}

// ============================================================
// Camera jump — one-shot move when mode changes
// ============================================================
function CameraJump({ mode }: { mode: SceneProps["cameraMode"] }) {
  const { camera } = useThree();
  const jumpedRef = useRef<string | null>(null);

  useEffect(() => {
    if (jumpedRef.current === mode) return;
    jumpedRef.current = mode;
    console.log("[CameraJump] Switching to:", mode);

    if (mode === "top") {
      camera.position.set(0, 20, 0.01);
      camera.lookAt(0, 5, 0);
    } else if (mode === "side") {
      camera.position.set(0, 6, 40);
      camera.lookAt(0, 6, 0);
    }
    console.log("[CameraJump] Camera pos:", camera.position.toArray());
  }, [mode, camera]);

  return null;
}

// ============================================================
// Arm model — uses original scene (no clone), bones found & driven directly
// ============================================================
function ArmModel({ anglesRef, onReady }: {
  anglesRef: React.MutableRefObject<number[]>;
  onReady?: (ok: boolean) => void;
}) {
  const gltf = useGLTF("/models/Forward.glb");
  const bonesRef = useRef<(THREE.Object3D | null)[]>([]);
  const done = useRef(false);

  // Compute scale & offset once (cached scene untouched)
  const { scale, offsetY } = useMemo(() => {
    // Temp reset to measure original size
    const prevS = gltf.scene.scale.clone();
    const prevP = gltf.scene.position.clone();
    const prevR = gltf.scene.rotation.clone();
    gltf.scene.scale.setScalar(1);
    gltf.scene.position.set(0, 0, 0);
    gltf.scene.rotation.set(0, 0, 0); // straighten the arm
    gltf.scene.updateMatrixWorld();

    const box = new THREE.Box3().setFromObject(gltf.scene);
    const maxDim = Math.max(
      box.getSize(new THREE.Vector3()).x,
      box.getSize(new THREE.Vector3()).y,
      box.getSize(new THREE.Vector3()).z
    );
    const s = maxDim > 0 ? 16 / maxDim : 1;

    // Restore cached scene
    gltf.scene.scale.copy(prevS);
    gltf.scene.position.copy(prevP);
    gltf.scene.rotation.copy(prevR);
    gltf.scene.updateMatrixWorld();

    console.log(`[FK] Original size: ${maxDim.toFixed(3)} → Scale: ${s.toFixed(3)}x → Target: 10`);
    return { scale: s, offsetY: -box.min.y * s };
  }, [gltf.scene]);

  // Find bones + log full hierarchy
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    console.log("[FK] === Scene Hierarchy ===");
    gltf.scene.traverse((o) => {
      const type = (o as THREE.Bone).isBone ? "BONE" : (o as THREE.SkinnedMesh).isSkinnedMesh ? "SKINNED_MESH" : (o as THREE.Mesh).isMesh ? "MESH" : o.type;
      const parent = o.parent ? o.parent.name : "ROOT";
      console.log(`  [${type}] "${o.name}"  parent="${parent}"`);
    });
    const found: (THREE.Object3D | null)[] = [];
    for (const name of CFG.boneNames) {
      let obj: THREE.Object3D | null = null;
      gltf.scene.traverse((o) => {
        if (o.name === name) obj = o;
      });
      found.push(obj);
      if (obj) console.log(`[FK] Found: "${name}"`);
      else console.warn(`[FK] NOT found: "${name}"`);
    }
    console.log(`[FK] Configured bones: ${found.map((b,i)=>`${i}=${b?.name||'MISSING'}`).join(', ')}`);
    bonesRef.current = found;

    // Color by mesh name — clone material to avoid shared references
    const meshColors: Record<string, string> = {
      "base": "#3b82f6", "links-1": "#fde047", "links-2": "#fde047",
      "joints-1": "#f97316", "joints-2": "#f97316", "joints-3": "#f97316",
      "End_effort-1": "#ef4444",
    };
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const c = meshColors[mesh.name];
      if (!c) return;
      // Clone material so each mesh gets its own
      if (Array.isArray(mesh.material)) {
        mesh.material = mesh.material.map(m => {
          const clone = (m as THREE.MeshStandardMaterial).clone();
          clone.color.set(c);
          return clone;
        });
      } else {
        mesh.material = (mesh.material as THREE.MeshStandardMaterial).clone();
        mesh.material.color.set(c);
      }
    });

    onReady?.(found.filter(Boolean).length >= 1);
  }, [gltf, onReady]);

  // Drive bones — cumulatively apply all configured axes
  useFrame(() => {
    const a = anglesRef.current;
    const bones = bonesRef.current;
    // Reset each unique object once
    const unique = [...new Set(bones.filter(Boolean) as THREE.Object3D[])];
    for (const obj of unique) obj.rotation.set(0, 0, 0);
    // Apply all rotations
    for (let i = 0; i < bones.length; i++) {
      const bone = bones[i];
      if (!bone) continue;
      const rad = linkAngleToBoneRotation(a[i] ?? 0, i);
      const axis = CFG.rotationAxes[i];
      if (axis === "X") bone.rotation.x += rad;
      if (axis === "Y") bone.rotation.y += rad;
      if (axis === "Z") bone.rotation.z += rad;
    }
  });

  return (
    <group scale={scale} position={[0, offsetY, 0]}>
      <primitive object={gltf.scene} castShadow receiveShadow />
    </group>
  );
}

// ============================================================
// Imperative OrbitControls — avoids R3F wrapper event issues
// ============================================================
function OrbitController({ mode }: { mode: SceneProps["cameraMode"] }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  const is2D = mode !== "3d";

  useEffect(() => {
    const domElement = gl.domElement;
    const controls = new OrbitControls(camera, domElement);
    controls.enableRotate = !is2D;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 0.1;
    controls.maxDistance = 500;
    controls.target.set(0, 8, 0);
    controls.update();
    controlsRef.current = controls;

    return () => { controls.dispose(); };
  }, [camera, gl, is2D]);

  useFrame(() => { controlsRef.current?.update(); });
  return null;
}

// ============================================================
// Export
// ============================================================
export default function ForwardKinematicsScene({ angles, cameraMode, onReady }: SceneProps) {
  const anglesRef = useRef(angles);
  useEffect(() => { anglesRef.current = angles; }, [angles]);

  // 2D mode: vertical XY-plane grid for side view
  const show2DGrid = cameraMode === "side";

  return (
    <>
      <Lights />
      <Ground />
      {show2DGrid && <VerticalGrid />}
      <BaseAxes />
      <ArmModel anglesRef={anglesRef} onReady={onReady} />
      <OrbitController mode={cameraMode} />
    </>
  );
}

export { CFG };
