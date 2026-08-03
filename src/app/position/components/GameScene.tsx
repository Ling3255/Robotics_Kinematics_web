"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import {
  Physics,
  RigidBody,
  CuboidCollider,
  BallCollider,
  type RapierRigidBody,
} from "@react-three/rapier";
import HintBox from "@/components/ui/HintBox";
import tileCategories from "@/data/tile-categories.json";

// ============================================================
// Constants
// ============================================================
const MAP_BOUNDARY = 15;
const WALK_SPEED = 4.5;
const SPRINT_MULTIPLIER = 2.0;
const JUMP_FORCE = 5.0;
const COIN_COUNT = 8;
const COIN_RADIUS = 0.4;
const COLLECT_DISTANCE = 0.8;
const TILE_SIZE = 3;

// ============================================================
// Types
// ============================================================
interface CoinData {
  id: number;
  position: [number, number, number];
  collected: boolean;
}

type TileCategory = keyof typeof tileCategories;

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
// Loading overlay — controlled by parent via `visible` prop
// ============================================================
function LoadingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 z-[6] flex items-center justify-center bg-gray-50/60 text-sm text-gray-400">
      Loading world...
    </div>
  );
}

// ============================================================
// Coin display
// ============================================================
function Coin({ position, collected }: { position: [number, number, number]; collected: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current && !collected) {
      meshRef.current.rotation.y += 0.03;
      meshRef.current.position.y = position[1] + Math.sin(Date.now() / 300) * 0.1;
    }
  });

  if (collected) return null;

  return (
    <group position={position}>
      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[COIN_RADIUS, COIN_RADIUS, 0.08, 16]} />
        <meshStandardMaterial
          color="#fbbf24"
          roughness={0.3}
          metalness={0.8}
          emissive="#fbbf24"
          emissiveIntensity={0.15}
        />
      </mesh>
    </group>
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
  const handleIntersection = useCallback(() => {
    if (coin.collected) return;
    if (collectedSet.current.has(coin.id)) return;
    collectedSet.current.add(coin.id);
    onCollect(coin.id);
  }, [coin.id, coin.collected, onCollect, collectedSet]);

  const pos: [number, number, number] = coin.collected
    ? [9999, 9999, 9999]
    : coin.position;

  return (
    <RigidBody
      position={pos}
      type="fixed"
      sensor
      onIntersectionEnter={handleIntersection}
    >
      <BallCollider args={[COLLECT_DISTANCE]} />
    </RigidBody>
  );
}

// ============================================================
// Tile helpers (no longer used — kept for reference)
// ============================================================
// ============================================================
// Ground — flat base floor at Y=0 + boundary walls
// ============================================================
function RoadTileGround() {
  return (
    <RigidBody type="fixed" colliders={false}>
      {/* Flat base ground at Y=0 */}
      <mesh position={[0, -0.5, 0]} receiveShadow>
        <boxGeometry args={[MAP_BOUNDARY * 2, 1, MAP_BOUNDARY * 2]} />
        <meshStandardMaterial color="#a3e635" roughness={0.8} metalness={0} />
      </mesh>
      <CuboidCollider position={[0, -0.5, 0]} args={[MAP_BOUNDARY, 0.5, MAP_BOUNDARY]} />
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
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.2, 1, 8]} />
        <meshStandardMaterial color="#92400e" roughness={0.7} metalness={0.1} />
      </mesh>
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
// Player — simple sphere (no run2.glb model)
// ============================================================
function Player({
  posRef,
  frozen,
}: {
  posRef: React.MutableRefObject<THREE.Vector3>;
  frozen: boolean;
}) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const playerRef = useRef<THREE.Mesh>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const cameraTarget = useRef(new THREE.Vector3());
  const { camera } = useThree();

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

  useFrame(() => {
    if (!rigidBodyRef.current || !playerRef.current) return;

    const keys = keysRef.current;
    const body = rigidBodyRef.current;
    const pos = body.translation();

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
    } else {
      const vel = body.linvel();
      body.setLinvel({ x: vel.x * 0.85, y: vel.y, z: vel.z * 0.85 }, true);
    }

    if (keys["Space"]) {
      const vel = body.linvel();
      if (Math.abs(vel.y) < 0.1) {
        body.setLinvel({ x: vel.x, y: JUMP_FORCE, z: vel.z }, true);
      }
    }

    // Displayed coordinates follow the lesson's Z-up convention:
    // display X = world x, display Y = -world z (ground plane),
    // display Z = height above ground (ball radius 0.4 rests at world y = 0.4 → display Z = 0).
    posRef.current.set(pos.x, -pos.z, pos.y - 0.4);

    const camOffset = new THREE.Vector3(0, 4, 6);
    const targetPos = new THREE.Vector3(pos.x, pos.y + 1.5, pos.z);
    cameraTarget.current.lerp(targetPos, 0.05);
    const desiredCamPos = cameraTarget.current.clone().add(camOffset);
    camera.position.lerp(desiredCamPos, 0.05);
    camera.lookAt(cameraTarget.current);
  });

  // Spawn resting on the ground (ball radius 0.4) so the initial displayed position is (0, 0, 0)
  return (
    <RigidBody
      ref={rigidBodyRef}
      position={[0, 0.4, 0]}
      type="dynamic"
      colliders={false}
      enabledRotations={[false, false, false]}
      mass={1}
      friction={0.5}
      canSleep={false}
    >
      <mesh ref={playerRef} castShadow>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial
          color="#3b82f6"
          roughness={0.3}
          metalness={0.4}
          emissive="#3b82f6"
          emissiveIntensity={0.1}
        />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <ringGeometry args={[0.3, 0.5, 16]} />
        <meshBasicMaterial color="#60a5fa" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
      <BallCollider args={[0.4]} position={[0, 0, 0]} />
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
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-5, 10, -5]} intensity={0.3} />
      <hemisphereLight args={["#87ceeb", "#90ee90", 0.6]} />

      {/* Core assets: ground + coins + player — loaded immediately */}
      <RoadTileGround />

      {coins.map((coin) => (
        <CoinCollider key={coin.id} coin={coin} onCollect={onCollectCoin} collectedSet={collectedSet} />
      ))}
      {coins.map((coin) => (
        <Coin key={`vis-${coin.id}`} position={coin.position} collected={coin.collected} />
      ))}

      <Player posRef={posRef} frozen={frozen} />
    </>
  );
}

// ============================================================
// Generate coin positions
// ============================================================
function generateCoins(count: number): CoinData[] {
  // 5 coins on the flat green ground (y = 0.2)
  const groundPositions: [number, number, number][] = [
    [-3, 0.2, -3],
    [3, 0.2, -3],
    [-3, 0.2, 3],
    [3, 0.2, 3],
    [0, 0.2, 0],
  ];
  // 3 coins on top of colored platforms (yellow, blue, orange)
  const platformPositions: [number, number, number][] = [
    [-5, 1.2, -5], // yellow platform top (top y = 1.0)
    [-5, 1.2, 5], // blue platform top (top y = 1.0)
    [0, 2.45, -8], // orange platform top (top y = 2.25)
  ];

  const positions: [number, number, number][] = [
    ...groundPositions,
    ...platformPositions,
  ];

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
// Play bell sound using Web Audio API
// ============================================================
function playBellSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(1200, ctx.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.3);
  } catch {
    // Audio not available
  }
}

// ============================================================
// Coordinate overlay (top-right)
// ============================================================
function CoordinateOverlay({
  posRef,
  pulse,
}: {
  posRef: React.MutableRefObject<THREE.Vector3>;
  pulse: boolean;
}) {
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let rafId: number;
    const tick = () => {
      if (textRef.current) {
        const p = posRef.current;
        // Snap tiny values to 0 so physics jitter doesn't render as "-0.00"
        const fmt = (v: number) => (Math.abs(v) < 0.005 ? 0 : v).toFixed(2);
        textRef.current.textContent = `X ${fmt(p.x)}  Y ${fmt(p.y)}  Z ${fmt(p.z)}`;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [posRef]);

  return (
    <div className="absolute right-4 top-4 z-10 rounded-lg bg-white/90 px-4 py-3 shadow-lg backdrop-blur">
      <span
        ref={textRef}
        className={`font-mono text-base font-bold tabular-nums transition-all duration-500 ${
          pulse ? "animate-pulse text-[#00BFFF]" : "text-gray-700"
        }`}
        style={{
          transform: pulse ? "scale(3)" : "scale(1)",
          transformOrigin: "right top",
          display: "inline-block",
        }}
      >
        X 0.00  Y 0.00  Z 0.00
      </span>
    </div>
  );
}


// ============================================================
// Decorative elements data (trees, platforms, bridges)
// ============================================================
const DECORATIVE_TREES: [number, number, number][] = [
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
];

const DECORATIVE_PLATFORMS: { position: [number, number, number]; size: [number, number, number]; color: string }[] = [
  { position: [-5, 0.5, -5], size: [2, 1, 2], color: "#fbbf24" },
  { position: [5, 0.5, -5], size: [2, 1, 2], color: "#f87171" },
  { position: [-5, 0.5, 5], size: [2, 1, 2], color: "#60a5fa" },
  { position: [5, 0.5, 5], size: [2, 1, 2], color: "#a78bfa" },
  // Central raised platform removed — flattened to ground level
  // { position: [0, 1, 0], size: [3, 0.5, 3], color: "#34d399" },
  { position: [-8, 1.5, 0], size: [1.5, 0.5, 1.5], color: "#f472b6" },
  { position: [8, 1.5, 0], size: [1.5, 0.5, 1.5], color: "#f472b6" },
  { position: [0, 2, -8], size: [2, 0.5, 2], color: "#fb923c" },
  { position: [0, 2, 8], size: [2, 0.5, 2], color: "#fb923c" },
];

const DECORATIVE_BRIDGES: { start: [number, number, number]; end: [number, number, number]; color: string }[] = [
  { start: [-5, 0.5, -5], end: [5, 0.5, -5], color: "#f87171" },
  { start: [-5, 0.5, 5], end: [5, 0.5, 5], color: "#60a5fa" },
];

// ============================================================
// Decorative elements renderer (batched)
// ============================================================
function DecorativeElements({ visibleCount }: { visibleCount: number }) {
  const treeCount = Math.min(visibleCount, DECORATIVE_TREES.length);
  const platformCount = Math.min(Math.max(0, visibleCount - DECORATIVE_TREES.length), DECORATIVE_PLATFORMS.length);
  const bridgeCount = Math.min(Math.max(0, visibleCount - DECORATIVE_TREES.length - DECORATIVE_PLATFORMS.length), DECORATIVE_BRIDGES.length);

  return (
    <>
      {DECORATIVE_TREES.slice(0, treeCount).map((pos, i) => (
        <Tree key={`tree-${i}`} position={pos} scale={0.8 + Math.random() * 0.4} />
      ))}
      {DECORATIVE_PLATFORMS.slice(0, platformCount).map((p, i) => (
        <Platform key={`plat-${i}`} position={p.position} size={p.size} color={p.color} />
      ))}
      {DECORATIVE_BRIDGES.slice(0, bridgeCount).map((b, i) => (
        <Bridge key={`bridge-${i}`} start={b.start} end={b.end} color={b.color} />
      ))}
    </>
  );
}

// ============================================================
// Main GameScene component
// ============================================================
export default function GameScene({
  resetKey = 0,
  onWin,
}: {
  resetKey?: number;
  onWin?: () => void;
}) {

  const [coins, setCoins] = useState<CoinData[]>([]);
  const [frozen, setFrozen] = useState(false);
  const [won, setWon] = useState(false);
  const [coreReady, setCoreReady] = useState(false);
  const [decorativeCount, setDecorativeCount] = useState(0);
  const [pulse, setPulse] = useState(false);
  const posRef = useRef(new THREE.Vector3(0, 0, 0));
  const initialized = useRef(false);
  const collectedSet = useRef(new Set<number>());
  const pulseTimer = useRef<number | null>(null);

  // Initialize coins
  useEffect(() => {
    if (!initialized.current) {
      setCoins(generateCoins(COIN_COUNT));
      initialized.current = true;
    }
  }, []);

  // Trigger the coordinate zoom/highlight/blink effect for 2 seconds
  const triggerPulse = useCallback(() => {
    if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    setPulse(true);
    pulseTimer.current = window.setTimeout(() => setPulse(false), 2000);
  }, []);

  // Reset: restore coins to initial positions, clear collected state,
  // and immediately clear the coordinate pulse effect
  useEffect(() => {
    if (resetKey === 0) return;
    if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    setPulse(false);
    setCoins(generateCoins(COIN_COUNT));
    collectedSet.current.clear();
    setWon(false);
    setFrozen(false);
  }, [resetKey]);


  // Mark core assets as ready once coins are generated
  useEffect(() => {
    if (coins.length > 0 && !coreReady) {
      // Small delay to let the first render pass complete
      const t = setTimeout(() => setCoreReady(true), 100);
      return () => clearTimeout(t);
    }
  }, [coins, coreReady]);

  // Batch-load decorative elements: every 300ms add 3-5 items
  useEffect(() => {
    if (!coreReady) return;

    const totalDecorative =
      DECORATIVE_TREES.length + DECORATIVE_PLATFORMS.length + DECORATIVE_BRIDGES.length;

    if (decorativeCount >= totalDecorative) return;

    const interval = setInterval(() => {
      setDecorativeCount((prev) => {
        const next = prev + (3 + Math.floor(Math.random() * 3)); // 3-5 per batch
        return Math.min(next, totalDecorative);
      });
    }, 300);

    return () => clearInterval(interval);
  }, [coreReady, decorativeCount]);

  const remaining = coins.filter((c) => !c.collected).length;

  const handleCollectCoin = useCallback(
    (id: number) => {
      if (frozen) return;

      // Trigger the coordinate zoom/highlight/blink effect on pickup
      triggerPulse();

      setCoins((prev) => {
        const coin = prev.find((c) => c.id === id);
        if (!coin || coin.collected) return prev;

        const updated = prev.map((c) =>
          c.id === id ? { ...c, collected: true } : c
        );
        const newRemaining = updated.filter((c) => !c.collected).length;

        playBellSound();

        if (newRemaining === 0) {
          setTimeout(() => {
            setFrozen(true);
            setWon(true);
            onWin?.();
          }, 300);
        }

        return updated;
      });
    },
    [frozen, triggerPulse, onWin]
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
          <DecorativeElements visibleCount={decorativeCount} />
        </Physics>
      </Canvas>

      <LoadingOverlay visible={!coreReady} />
      <CoinCounter remaining={remaining} />
      <CoordinateOverlay posRef={posRef} pulse={pulse} />
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
