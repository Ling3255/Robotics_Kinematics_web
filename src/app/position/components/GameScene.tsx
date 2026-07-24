"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls, useProgress, useTexture, useGLTF } from "@react-three/drei";
import { FBXLoader } from "three-stdlib";
import {
  Physics,
  RigidBody,
  CuboidCollider,
  BallCollider,
  type RapierRigidBody,
} from "@react-three/rapier";
import HintBox from "@/components/ui/HintBox";

// ============================================================
// Constants
// ============================================================
const MAP_BOUNDARY = 15;
const WALK_SPEED = 4.5;
const SPRINT_MULTIPLIER = 2.0;
const JUMP_FORCE = 5.0;
const COIN_COUNT = 20;
const COIN_RADIUS = 0.4;
const COLLECT_DISTANCE = 0.8;

// ============================================================
// Types
// ============================================================
interface CoinData {
  id: number;
  position: [number, number, number];
  collected: boolean;
}

// ============================================================
// Skybox (equirectangular panorama)
// ============================================================
function Skybox() {
  const texture = useTexture("/skyboxes/skybox-morning.png");
  const { scene } = useThree();

  useEffect(() => {
    const prev = scene.background;
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = texture;
    scene.environment = texture;
    return () => {
      scene.background = prev;
      scene.environment = null;
    };
  }, [texture, scene]);

  return null;
}

// ============================================================
// Loading overlay
// ============================================================
function LoadingOverlay() {
  const { active, progress } = useProgress();
  if (!active || progress >= 100) return null;
  const displayProgress = isFinite(progress) ? progress.toFixed(0) : "0";
  return (
    <div className="absolute inset-0 z-[6] flex items-center justify-center bg-gray-50/60 text-sm text-gray-400">
      Loading world... {displayProgress}%
    </div>
  );
}

// ============================================================
// Coin display
// ============================================================
function Coin({ position, collected }: { position: [number, number, number]; collected: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    if (meshRef.current && !collected) {
      meshRef.current.rotation.y += delta * 2;
      meshRef.current.position.y = position[1] + Math.sin(Date.now() / 300) * 0.1;
    }
  });

  if (collected) return null;

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <cylinderGeometry args={[COIN_RADIUS, COIN_RADIUS, 0.08, 16]} />
      <meshStandardMaterial
        color="#fbbf24"
        roughness={0.3}
        metalness={0.8}
        emissive="#fbbf24"
        emissiveIntensity={0.15}
      />
    </mesh>
  );
}

// ============================================================
// Coin collider for physics-based collection detection
// ============================================================
function CoinCollider({
  coin,
  onCollect,
  collectedSet,
}: {
  coin: CoinData;
  onCollect: (id: number) => void;
  collectedSet: React.MutableRefObject<Set<number>>;
}) {
  const bodyRef = useRef<RapierRigidBody>(null);

  const handleIntersection = useCallback(() => {
    // Use the ref-based set to prevent duplicate triggers
    if (collectedSet.current.has(coin.id)) return;
    collectedSet.current.add(coin.id);
    onCollect(coin.id);
  }, [coin.id, onCollect, collectedSet]);

  return (
    <RigidBody
      ref={bodyRef}
      position={coin.position}
      type="fixed"
      sensor
      onIntersectionEnter={handleIntersection}
    >
      <BallCollider args={[COLLECT_DISTANCE]} />
    </RigidBody>
  );
}

// ============================================================
// Road tile paths (all .gltf files from public/models/road tiles/)
// ============================================================
const TILE_PATHS = (() => {
  // Generate all 189 tile paths
  const paths: string[] = [];
  const tiles: { prefix: string; suffix: string }[] = [
    { prefix: "roadTile_001", suffix: " (1)" },
    { prefix: "roadTile_002", suffix: " (1)" },
    { prefix: "roadTile_003", suffix: " (1)" },
    { prefix: "roadTile_004", suffix: " (1)" },
    { prefix: "roadTile_005", suffix: "" },
    { prefix: "roadTile_006", suffix: " (1)" },
    { prefix: "roadTile_007", suffix: "" },
    { prefix: "roadTile_008", suffix: "" },
    { prefix: "roadTile_009", suffix: "" },
    { prefix: "roadTile_010", suffix: " (1)" },
    { prefix: "roadTile_011", suffix: " (1)" },
    { prefix: "roadTile_012", suffix: " (2)" },
    { prefix: "roadTile_012", suffix: " (3)" },
    { prefix: "roadTile_013", suffix: " (2)" },
    { prefix: "roadTile_013", suffix: " (3)" },
    { prefix: "roadTile_014", suffix: " (2)" },
    { prefix: "roadTile_014", suffix: " (3)" },
    { prefix: "roadTile_015", suffix: " (2)" },
    { prefix: "roadTile_015", suffix: " (3)" },
    { prefix: "roadTile_016", suffix: " (2)" },
    { prefix: "roadTile_016", suffix: " (3)" },
    { prefix: "roadTile_017", suffix: " (1)" },
    { prefix: "roadTile_017", suffix: " (2)" },
    { prefix: "roadTile_018", suffix: " (1)" },
    { prefix: "roadTile_018", suffix: " (2)" },
    { prefix: "roadTile_019", suffix: " (1)" },
    { prefix: "roadTile_019", suffix: " (2)" },
    { prefix: "roadTile_020", suffix: " (1)" },
    { prefix: "roadTile_020", suffix: " (2)" },
    { prefix: "roadTile_021", suffix: " (1)" },
    { prefix: "roadTile_021", suffix: " (2)" },
    { prefix: "roadTile_022", suffix: " (1)" },
    { prefix: "roadTile_022", suffix: "" },
    { prefix: "roadTile_023", suffix: " (1)" },
    { prefix: "roadTile_024", suffix: " (1)" },
    { prefix: "roadTile_025", suffix: " (1)" },
    { prefix: "roadTile_026", suffix: " (2)" },
    { prefix: "roadTile_027", suffix: " (2)" },
    { prefix: "roadTile_028", suffix: " (1)" },
    { prefix: "roadTile_029", suffix: " (1)" },
    { prefix: "roadTile_030", suffix: "" },
    { prefix: "roadTile_031", suffix: "" },
    { prefix: "roadTile_032", suffix: "" },
    { prefix: "roadTile_033", suffix: "" },
    { prefix: "roadTile_034", suffix: "" },
    { prefix: "roadTile_035", suffix: "" },
    { prefix: "roadTile_036", suffix: "" },
    { prefix: "roadTile_037", suffix: "" },
    { prefix: "roadTile_038", suffix: "" },
    { prefix: "roadTile_039", suffix: "" },
    { prefix: "roadTile_040", suffix: "" },
    { prefix: "roadTile_041", suffix: "" },
    { prefix: "roadTile_042", suffix: "" },
    { prefix: "roadTile_043", suffix: "" },
    { prefix: "roadTile_044", suffix: "" },
    { prefix: "roadTile_045", suffix: " (1)" },
    { prefix: "roadTile_046", suffix: "" },
    { prefix: "roadTile_047", suffix: "" },
    { prefix: "roadTile_048", suffix: "" },
    { prefix: "roadTile_049", suffix: "" },
    { prefix: "roadTile_050", suffix: "" },
    { prefix: "roadTile_051", suffix: "" },
    { prefix: "roadTile_052", suffix: "" },
    { prefix: "roadTile_053", suffix: "" },
    { prefix: "roadTile_054", suffix: "" },
    { prefix: "roadTile_055", suffix: "" },
    { prefix: "roadTile_056", suffix: "" },
    { prefix: "roadTile_057", suffix: "" },
    { prefix: "roadTile_058", suffix: "" },
    { prefix: "roadTile_059", suffix: "" },
    { prefix: "roadTile_060", suffix: "" },
    { prefix: "roadTile_061", suffix: "" },
    { prefix: "roadTile_062", suffix: "" },
    { prefix: "roadTile_063", suffix: "" },
    { prefix: "roadTile_064", suffix: "" },
    { prefix: "roadTile_065", suffix: "" },
    { prefix: "roadTile_066", suffix: "" },
    { prefix: "roadTile_067", suffix: "" },
    { prefix: "roadTile_068", suffix: "" },
    { prefix: "roadTile_069", suffix: "" },
    { prefix: "roadTile_070", suffix: "" },
    { prefix: "roadTile_071", suffix: "" },
    { prefix: "roadTile_072", suffix: "" },
    { prefix: "roadTile_073", suffix: "" },
    { prefix: "roadTile_074", suffix: "" },
    { prefix: "roadTile_075", suffix: "" },
    { prefix: "roadTile_076", suffix: "" },
    { prefix: "roadTile_077", suffix: "" },
    { prefix: "roadTile_078", suffix: "" },
    { prefix: "roadTile_079", suffix: "" },
    { prefix: "roadTile_080", suffix: "" },
    { prefix: "roadTile_081", suffix: "" },
    { prefix: "roadTile_082", suffix: "" },
    { prefix: "roadTile_083", suffix: "" },
    { prefix: "roadTile_084", suffix: "" },
    { prefix: "roadTile_085", suffix: "" },
    { prefix: "roadTile_086", suffix: "" },
    { prefix: "roadTile_087", suffix: "" },
    { prefix: "roadTile_088", suffix: "" },
    { prefix: "roadTile_089", suffix: "" },
    { prefix: "roadTile_090", suffix: "" },
    { prefix: "roadTile_091", suffix: "" },
    { prefix: "roadTile_092", suffix: "" },
    { prefix: "roadTile_093", suffix: "" },
    { prefix: "roadTile_094", suffix: "" },
    { prefix: "roadTile_095", suffix: "" },
    { prefix: "roadTile_096", suffix: "" },
    { prefix: "roadTile_097", suffix: "" },
    { prefix: "roadTile_098", suffix: "" },
    { prefix: "roadTile_099", suffix: "" },
    { prefix: "roadTile_100", suffix: "" },
    { prefix: "roadTile_101", suffix: "" },
    { prefix: "roadTile_102", suffix: "" },
    { prefix: "roadTile_103", suffix: "" },
    { prefix: "roadTile_104", suffix: "" },
    { prefix: "roadTile_105", suffix: "" },
    { prefix: "roadTile_106", suffix: "" },
    { prefix: "roadTile_107", suffix: "" },
    { prefix: "roadTile_108", suffix: "" },
    { prefix: "roadTile_109", suffix: "" },
    { prefix: "roadTile_110", suffix: "" },
    { prefix: "roadTile_111", suffix: "" },
    { prefix: "roadTile_112", suffix: "" },
    { prefix: "roadTile_113", suffix: "" },
    { prefix: "roadTile_114", suffix: "" },
    { prefix: "roadTile_115", suffix: "" },
    { prefix: "roadTile_116", suffix: "" },
    { prefix: "roadTile_117", suffix: "" },
    { prefix: "roadTile_118", suffix: "" },
    { prefix: "roadTile_119", suffix: "" },
    { prefix: "roadTile_120", suffix: "" },
    { prefix: "roadTile_121", suffix: "" },
    { prefix: "roadTile_122", suffix: "" },
    { prefix: "roadTile_123", suffix: "" },
    { prefix: "roadTile_124", suffix: "" },
    { prefix: "roadTile_125", suffix: "" },
    { prefix: "roadTile_126", suffix: "" },
    { prefix: "roadTile_127", suffix: "" },
    { prefix: "roadTile_128", suffix: "" },
    { prefix: "roadTile_129", suffix: "" },
    { prefix: "roadTile_130", suffix: "" },
    { prefix: "roadTile_131", suffix: "" },
    { prefix: "roadTile_132", suffix: "" },
    { prefix: "roadTile_133", suffix: "" },
    { prefix: "roadTile_134", suffix: "" },
    { prefix: "roadTile_135", suffix: "" },
    { prefix: "roadTile_136", suffix: "" },
    { prefix: "roadTile_137", suffix: "" },
    { prefix: "roadTile_138", suffix: "" },
    { prefix: "roadTile_139", suffix: "" },
    { prefix: "roadTile_140", suffix: "" },
    { prefix: "roadTile_141", suffix: "" },
    { prefix: "roadTile_142", suffix: "" },
    { prefix: "roadTile_143", suffix: "" },
    { prefix: "roadTile_144", suffix: "" },
    { prefix: "roadTile_145", suffix: "" },
    { prefix: "roadTile_146", suffix: "" },
    { prefix: "roadTile_147", suffix: "" },
    { prefix: "roadTile_148", suffix: "" },
    { prefix: "roadTile_149", suffix: "" },
    { prefix: "roadTile_150", suffix: "" },
    { prefix: "roadTile_151", suffix: "" },
    { prefix: "roadTile_152", suffix: "" },
    { prefix: "roadTile_153", suffix: "" },
    { prefix: "roadTile_154", suffix: "" },
    { prefix: "roadTile_155", suffix: "" },
    { prefix: "roadTile_156", suffix: "" },
    { prefix: "roadTile_157", suffix: "" },
    { prefix: "roadTile_158", suffix: "" },
    { prefix: "roadTile_159", suffix: "" },
    { prefix: "roadTile_160", suffix: "" },
    { prefix: "roadTile_161", suffix: "" },
    { prefix: "roadTile_162", suffix: "" },
    { prefix: "roadTile_163", suffix: "" },
    { prefix: "roadTile_164", suffix: "" },
    { prefix: "roadTile_165", suffix: "" },
    { prefix: "roadTile_166", suffix: "" },
    { prefix: "roadTile_167", suffix: "" },
    { prefix: "roadTile_168", suffix: "" },
    { prefix: "roadTile_169", suffix: "" },
    { prefix: "roadTile_170", suffix: "" },
    { prefix: "roadTile_171", suffix: "" },
    { prefix: "roadTile_172", suffix: "" },
    { prefix: "roadTile_173", suffix: "" },
    { prefix: "roadTile_174", suffix: "" },
    { prefix: "roadTile_175", suffix: "" },
    { prefix: "roadTile_176", suffix: "" },
    { prefix: "roadTile_177", suffix: "" },
    { prefix: "roadTile_178", suffix: "" },
    { prefix: "roadTile_179", suffix: "" },
    { prefix: "roadTile_180", suffix: "" },
    { prefix: "roadTile_181", suffix: "" },
    { prefix: "roadTile_182", suffix: "" },
    { prefix: "roadTile_183", suffix: "" },
    { prefix: "roadTile_184", suffix: "" },
    { prefix: "roadTile_185", suffix: "" },
    { prefix: "roadTile_186", suffix: "" },
    { prefix: "roadTile_187", suffix: "" },
    { prefix: "roadTile_188", suffix: "" },
    { prefix: "roadTile_189", suffix: "" },
  ];
  for (const t of tiles) {
    paths.push(`/models/road tiles/${t.prefix}${t.suffix}.gltf`);
  }
  return paths;
})();

const TILE_SIZE = 3; // each tile is 3x3 units
const GRID_COLS = Math.ceil((MAP_BOUNDARY * 2) / TILE_SIZE); // 10
const GRID_ROWS = GRID_COLS;

// ============================================================
// Single road tile instance
// ============================================================
function RoadTile({ path, position }: { path: string; position: [number, number, number] }) {
  const { scene } = useGLTF(path);
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={clonedScene} position={position} rotation={[-Math.PI / 2, 0, 0]} />;
}

// ============================================================
// Ground / Road tile ground
// ============================================================
function RoadTileGround() {
  // Generate grid layout with random tile selection
  const tiles = useMemo(() => {
    const result: { path: string; position: [number, number, number] }[] = [];
    const halfMap = MAP_BOUNDARY;
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const x = -halfMap + col * TILE_SIZE + TILE_SIZE / 2;
        const z = -halfMap + row * TILE_SIZE + TILE_SIZE / 2;
        const randomIndex = Math.floor(Math.random() * TILE_PATHS.length);
        result.push({
          path: TILE_PATHS[randomIndex],
          position: [x, 0, z],
        });
      }
    }
    return result;
  }, []);

  return (
    <RigidBody type="fixed" colliders={false}>
      {tiles.map((tile, i) => (
        <RoadTile key={i} path={tile.path} position={tile.position} />
      ))}
      {/* Ground collider */}
      <CuboidCollider
        position={[0, -0.5, 0]}
        args={[MAP_BOUNDARY, 0.5, MAP_BOUNDARY]}
      />
      {/* Boundary walls */}
      <CuboidCollider position={[0, 2, -MAP_BOUNDARY]} args={[MAP_BOUNDARY, 4, 0.5]} />
      <CuboidCollider position={[0, 2, MAP_BOUNDARY]} args={[MAP_BOUNDARY, 4, 0.5]} />
      <CuboidCollider position={[-MAP_BOUNDARY, 2, 0]} args={[0.5, 4, MAP_BOUNDARY]} />
      <CuboidCollider position={[MAP_BOUNDARY, 2, 0]} args={[0.5, 4, MAP_BOUNDARY]} />
    </RigidBody>
  );
}

// ============================================================
// Decorative trees (no collision)
// ============================================================
function Tree({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      {/* Trunk */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 1, 8]} />
        <meshStandardMaterial color="#92400e" roughness={0.7} metalness={0.1} />
      </mesh>
      {/* Foliage layers */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <sphereGeometry args={[0.6, 8, 8]} />
        <meshStandardMaterial color="#22c55e" roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh position={[0, 1.7, 0]} castShadow>
        <sphereGeometry args={[0.45, 8, 8]} />
        <meshStandardMaterial color="#16a34a" roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh position={[0, 2.1, 0]} castShadow>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshStandardMaterial color="#15803d" roughness={0.6} metalness={0.1} />
      </mesh>
    </group>
  );
}

// ============================================================
// Platforms (with collision)
// ============================================================
function Platform({
  position,
  size,
  color = "#fbbf24",
}: {
  position: [number, number, number];
  size: [number, number, number];
  color?: string;
}) {
  return (
    <RigidBody type="fixed" position={position}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={color}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>
      <CuboidCollider args={[size[0] / 2, size[1] / 2, size[2] / 2]} />
    </RigidBody>
  );
}

// ============================================================
// Bridge (a series of platforms)
// ============================================================
function Bridge({
  start,
  end,
  color = "#f87171",
}: {
  start: [number, number, number];
  end: [number, number, number];
  color?: string;
}) {
  const dx = end[0] - start[0];
  const dz = end[2] - start[2];
  const length = Math.sqrt(dx * dx + dz * dz);
  const segments = Math.ceil(length / 1.2);
  const platforms = useMemo(() => {
    const result: { position: [number, number, number] }[] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      result.push({
        position: [
          start[0] + dx * t,
          start[1] + (end[1] - start[1]) * t + 0.15,
          start[2] + dz * t,
        ],
      });
    }
    return result;
  }, [start, end, dx, dz, segments]);

  return (
    <>
      {platforms.map((p, i) => (
        <RigidBody key={i} type="fixed" position={p.position}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.8, 0.3, 0.8]} />
            <meshStandardMaterial
              color={color}
              roughness={0.6}
              metalness={0.1}
            />
          </mesh>
          <CuboidCollider args={[0.4, 0.15, 0.4]} />
        </RigidBody>
      ))}
    </>
  );
}

// ============================================================
// Character (FBX girl model)
// ============================================================
function Character({
  posRef,
  frozen,
}: {
  posRef: React.MutableRefObject<THREE.Vector3>;
  frozen: boolean;
}) {
  const fbx = useLoader(FBXLoader, "/Silly Dancing.fbx");
  const clonedFbx = useMemo(() => fbx.clone(true), [fbx]);
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const characterRef = useRef<THREE.Group>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const cameraTarget = useRef(new THREE.Vector3());
  const { camera } = useThree();

  // Scale the model to appropriate size
  const scale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedFbx);
    const size = box.getSize(new THREE.Vector3());
    return size.y > 0 ? 1.8 / size.y : 1;
  }, [clonedFbx]);

  // Keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (frozen) return;
      keysRef.current[e.code] = true;
      if (e.code === "Space") e.preventDefault();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.code] = false;
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [frozen]);

  // Movement and camera
  useFrame((_, delta) => {
    if (!rigidBodyRef.current || !characterRef.current) return;

    const keys = keysRef.current;
    const body = rigidBodyRef.current;
    const pos = body.translation();

    // Movement direction
    const moveDir = new THREE.Vector3();
    if (keys["KeyW"] || keys["ArrowUp"]) moveDir.z -= 1;
    if (keys["KeyS"] || keys["ArrowDown"]) moveDir.z += 1;
    if (keys["KeyA"] || keys["ArrowLeft"]) moveDir.x -= 1;
    if (keys["KeyD"] || keys["ArrowRight"]) moveDir.x += 1;

    if (moveDir.length() > 0) {
      moveDir.normalize();
      const speed = keys["ShiftLeft"] || keys["ShiftRight"]
        ? WALK_SPEED * SPRINT_MULTIPLIER
        : WALK_SPEED;
      const vel = body.linvel();
      body.setLinvel(
        {
          x: moveDir.x * speed,
          y: vel.y,
          z: moveDir.z * speed,
        },
        true,
      );

      // Rotate character to face movement direction
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      let currentAngle = characterRef.current.rotation.y;
      let diff = targetAngle - currentAngle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      characterRef.current.rotation.y += diff * 0.1;
    } else {
      // Slow down
      const vel = body.linvel();
      body.setLinvel({ x: vel.x * 0.85, y: vel.y, z: vel.z * 0.85 }, true);
    }

    // Jump
    if (keys["Space"]) {
      const vel = body.linvel();
      if (Math.abs(vel.y) < 0.1) {
        body.setLinvel({ x: vel.x, y: JUMP_FORCE, z: vel.z }, true);
      }
    }

    // Update position ref for coin collection
    posRef.current.set(pos.x, pos.y, pos.z);

    // Third-person camera follow
    const camOffset = new THREE.Vector3(0, 4, 6);
    const targetPos = new THREE.Vector3(pos.x, pos.y + 1.5, pos.z);
    cameraTarget.current.lerp(targetPos, 0.05);
    const desiredCamPos = cameraTarget.current.clone().add(camOffset);
    camera.position.lerp(desiredCamPos, 0.05);
    camera.lookAt(cameraTarget.current);
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={[0, 1, 0]}
      colliders={false}
      enabledRotations={[false, false, false]}
      mass={1}
      friction={0.5}
    >
      <group ref={characterRef} scale={scale}>
        <primitive object={clonedFbx} />
      </group>
      <CuboidCollider args={[0.3, 0.8, 0.3]} position={[0, 0.8, 0]} />
      {/* Origin marker - small glowing ball at feet */}
      <mesh position={[0, 0.05, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#fbbf24" />
      </mesh>
      <pointLight position={[0, 0.1, 0]} color="#fbbf24" intensity={0.5} distance={1} />
    </RigidBody>
  );
}

// ============================================================
// Win overlay
// ============================================================
function WinOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
      <div className="animate-bounce rounded-2xl bg-white px-12 py-8 shadow-2xl">
        <h1 className="text-6xl font-black text-yellow-400 drop-shadow-lg" style={{ textShadow: "2px 2px 0 #ca8a04" }}>
          WIN!
        </h1>
        <p className="mt-3 text-center text-sm font-medium text-slate-500">
          All coins collected!
        </p>
      </div>
    </div>
  );
}

// ============================================================
// Coin counter HUD
// ============================================================
function CoinCounter({ remaining }: { remaining: number }) {
  return (
    <div className="absolute left-4 top-4 z-10 rounded-xl bg-white/90 px-4 py-2 shadow-lg backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="h-3 w-3 rounded-full bg-yellow-400 shadow-sm" />
        <span className="font-mono text-sm font-bold text-slate-700">
          Coins: {remaining}
        </span>
      </div>
    </div>
  );
}

// ============================================================
// Scene content (inside Canvas + Physics)
// ============================================================
function SceneContent({
  posRef,
  frozen,
  coins,
  onCollectCoin,
  collectedSet,
}: {
  posRef: React.MutableRefObject<THREE.Vector3>;
  frozen: boolean;
  coins: CoinData[];
  onCollectCoin: (id: number) => void;
  collectedSet: React.MutableRefObject<Set<number>>;
}) {
  return (
    <>
      {/* Lighting - bright noon outdoor */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-5, 10, -5]} intensity={0.3} />
      <hemisphereLight
        args={["#87ceeb", "#90ee90", 0.6]}
      />

      {/* Ground */}
      <RoadTileGround />

      {/* Decorative trees around edges */}
      {[
        [-12, 0, -12],
        [-12, 0, 12],
        [12, 0, -12],
        [12, 0, 12],
        [-10, 0, -14],
        [10, 0, -14],
        [-14, 0, 10],
        [14, 0, -10],
        [-14, 0, -8],
        [14, 0, 8],
      ].map((pos, i) => (
        <Tree key={`tree-${i}`} position={pos as [number, number, number]} scale={0.8 + Math.random() * 0.4} />
      ))}

      {/* Platforms */}
      <Platform position={[-5, 0.5, -5]} size={[2, 1, 2]} color="#fbbf24" />
      <Platform position={[5, 0.5, -5]} size={[2, 1, 2]} color="#f87171" />
      <Platform position={[-5, 0.5, 5]} size={[2, 1, 2]} color="#60a5fa" />
      <Platform position={[5, 0.5, 5]} size={[2, 1, 2]} color="#a78bfa" />
      <Platform position={[0, 1, 0]} size={[3, 0.5, 3]} color="#34d399" />
      <Platform position={[-8, 1.5, 0]} size={[1.5, 0.5, 1.5]} color="#f472b6" />
      <Platform position={[8, 1.5, 0]} size={[1.5, 0.5, 1.5]} color="#f472b6" />
      <Platform position={[0, 2, -8]} size={[2, 0.5, 2]} color="#fb923c" />
      <Platform position={[0, 2, 8]} size={[2, 0.5, 2]} color="#fb923c" />

      {/* Bridges */}
      <Bridge
        start={[-5, 0.5, -5]}
        end={[5, 0.5, -5]}
        color="#f87171"
      />
      <Bridge
        start={[-5, 0.5, 5]}
        end={[5, 0.5, 5]}
        color="#60a5fa"
      />

      {/* Coins */}
      {coins.map((coin) => (
        <CoinCollider key={coin.id} coin={coin} onCollect={onCollectCoin} collectedSet={collectedSet} />
      ))}
      {coins.map((coin) => (
        <Coin key={`vis-${coin.id}`} position={coin.position} collected={coin.collected} />
      ))}

      {/* Character */}
      <Suspense fallback={null}>
        <Character posRef={posRef} frozen={frozen} />
      </Suspense>
    </>
  );
}

// ============================================================
// Generate random coin positions
// ============================================================
function generateCoins(count: number): CoinData[] {
  const positions: [number, number, number][] = [
    // On ground
    [-3, 0.2, -3],
    [3, 0.2, -3],
    [-3, 0.2, 3],
    [3, 0.2, 3],
    [0, 0.2, -5],
    [0, 0.2, 5],
    [-7, 0.2, -2],
    [7, 0.2, -2],
    [-7, 0.2, 2],
    [7, 0.2, 2],
    // On platforms
    [-5, 1.2, -5],
    [5, 1.2, -5],
    [-5, 1.2, 5],
    [5, 1.2, 5],
    [0, 1.7, 0],
    [-8, 2.2, 0],
    [8, 2.2, 0],
    [0, 2.7, -8],
    [0, 2.7, 8],
    // Extra
    [-10, 0.2, -6],
  ];

  // Fill remaining with random positions
  while (positions.length < count) {
    const x = (Math.random() - 0.5) * 26;
    const z = (Math.random() - 0.5) * 26;
    positions.push([x, 0.2, z]);
  }

  return positions.slice(0, count).map((pos, i) => ({
    id: i,
    position: pos,
    collected: false,
  }));
}

// ============================================================
// Main GameScene component
// ============================================================
export default function GameScene() {
  const [coins, setCoins] = useState<CoinData[]>([]);
  const [frozen, setFrozen] = useState(false);
  const [won, setWon] = useState(false);
  const posRef = useRef(new THREE.Vector3(0, 0, 0));
  const initialized = useRef(false);
  const collectedSet = useRef(new Set<number>());

  // Initialize coins
  useEffect(() => {
    if (!initialized.current) {
      setCoins(generateCoins(COIN_COUNT));
      initialized.current = true;
    }
  }, []);

  const remaining = coins.filter((c) => !c.collected).length;

  const handleCollectCoin = useCallback(
    (id: number) => {
      if (frozen) return;

      setCoins((prev) => {
        const updated = prev.map((c) =>
          c.id === id ? { ...c, collected: true } : c
        );
        const newRemaining = updated.filter((c) => !c.collected).length;

        // Play sound
        try {
          const audio = new Audio("/sounds/coin.mp3");
          audio.volume = 0.5;
          audio.play().catch(() => {});
        } catch {
          // Sound file may not exist
        }

        // Check win condition
        if (newRemaining === 0) {
          setTimeout(() => {
            setFrozen(true);
            setWon(true);
          }, 300);
        }

        return updated;
      });
    },
    [frozen]
  );

  return (
    <div className="relative h-[calc(100vh-112px)] w-full">
      <Canvas
        shadows
        camera={{ position: [0, 6, 10], fov: 50 }}
        gl={{ antialias: true }}
      >
        <Skybox />
        <Physics gravity={[0, -9.81, 0]}>
          <SceneContent
            posRef={posRef}
            frozen={frozen}
            coins={coins}
            onCollectCoin={handleCollectCoin}
            collectedSet={collectedSet}
          />
        </Physics>
      </Canvas>

      <LoadingOverlay />
      <CoinCounter remaining={remaining} />
      {won && <WinOverlay />}

      <HintBox hintLabel="Controls">
        <p>WASD / Arrow keys: move</p>
        <p>Shift: sprint</p>
        <p>Space: jump</p>
        <p>Collect all {COIN_COUNT} coins to win!</p>
      </HintBox>
    </div>
  );
}
