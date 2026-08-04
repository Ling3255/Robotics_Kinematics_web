"use client";

import { useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";

import { SHARED } from "./shared";

function Axes() {
  const E = 25, H = 20;
  function cyl(from: [number, number, number], to: [number, number, number], color: string) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
    const m = a.clone().add(b).multiplyScalar(0.5), d = b.clone().sub(a), l = d.length();
    const q = l > 0.001 ? new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()) : new THREE.Quaternion();
    return <mesh key={color} position={m} quaternion={q}><cylinderGeometry args={[0.06, 0.06, l, 8]} /><meshBasicMaterial color={color} depthTest={false} /></mesh>;
  }
  return (<group position={[0, 0.01, 0]}>
    {cyl([0, 0, 0], [0, 0, E], "#ef4444")}
    <mesh position={[0, 0, E]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[0.2, 0.5, 8]} /><meshBasicMaterial color="#ef4444" depthTest={false} /></mesh>
    <Html position={[0, 0, E + 1]} center style={{ color: "#ef4444", fontSize: 20, fontWeight: 700, pointerEvents: "none" }}>X</Html>
    {cyl([0, 0, 0], [E, 0, 0], "#1e293b")}
    <mesh position={[E, 0, 0]} rotation={[0, 0, -Math.PI / 2]}><coneGeometry args={[0.2, 0.5, 8]} /><meshBasicMaterial color="#1e293b" depthTest={false} /></mesh>
    <Html position={[E + 1, 0, 0]} center style={{ color: "#1e293b", fontSize: 20, fontWeight: 700, pointerEvents: "none" }}>Y</Html>
    {cyl([0, 0, 0], [0, H, 0], "#3b82f6")}
    <mesh position={[0, H, 0]}><coneGeometry args={[0.2, 0.5, 8]} /><meshBasicMaterial color="#3b82f6" depthTest={false} /></mesh>
    <Html position={[0, H + 1, 0]} center style={{ color: "#3b82f6", fontSize: 20, fontWeight: 700, pointerEvents: "none" }}>Z</Html>
  </group>);
}

function WallGrid({ position, size, height, axis }: {
  position: [number, number, number]; size: number; height: number; axis: "xz" | "yz";
}) {
  const ref = useRef<THREE.Group>(null!);
  useEffect(() => {
    const g = ref.current; if (!g || g.children.length > 0) return;
    const mat = new THREE.LineBasicMaterial({ color: "#94a3b8", transparent: true, opacity: 0.3, depthTest: false });
    for (let i = 0; i <= height; i++) {
      const a = axis === "xz" ? [new THREE.Vector3(0, i, 0), new THREE.Vector3(size, i, 0)] : [new THREE.Vector3(0, i, 0), new THREE.Vector3(0, i, size)];
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(a), mat));
    }
    for (let i = 0; i <= size; i++) {
      const a = axis === "xz" ? [new THREE.Vector3(i, 0, 0), new THREE.Vector3(i, height, 0)] : [new THREE.Vector3(0, 0, i), new THREE.Vector3(0, height, i)];
      g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(a), mat));
    }
  }, [axis, size, height]);
  return <group ref={ref} position={position} />;
}

function CornerPlates() {
  const W = 25, Ht = 20;
  return (<>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[W / 2, 0, W / 2]}><planeGeometry args={[W, W]} /><meshStandardMaterial color="#e2e8f0" roughness={0.7} metalness={0.05} side={THREE.DoubleSide} /></mesh>
    <gridHelper args={[W, W, "#94a3b8", "#94a3b8"]} position={[W / 2, 0.003, W / 2]} />
    <mesh position={[W / 2, Ht / 2, 0]}><planeGeometry args={[W, Ht]} /><meshStandardMaterial color="#dde1e6" roughness={0.7} metalness={0.05} side={THREE.DoubleSide} /></mesh>
    <WallGrid position={[0, 0, 0.002]} size={W} height={Ht} axis="xz" />
    <mesh position={[0, Ht / 2, W / 2]} rotation={[0, Math.PI / 2, 0]}><planeGeometry args={[W, Ht]} /><meshStandardMaterial color="#d8dde2" roughness={0.7} metalness={0.05} side={THREE.DoubleSide} /></mesh>
    <WallGrid position={[0.002, 0, 0]} size={W} height={Ht} axis="yz" />
  </>);
}

function KeyboardBall({ posRef, showLocal }: { posRef: React.MutableRefObject<THREE.Vector3>; showLocal: boolean }) {
  const grp = useRef<THREE.Group>(null!);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      let dx = 0, dy = 0, dz = 0; const step = 0.5;
      const k = e.key.toLowerCase();
      if (k === "w" || k === "arrowup") dz -= step;
      else if (k === "s" || k === "arrowdown") dz += step;
      else if (k === "a" || k === "arrowleft") dx -= step;
      else if (k === "d" || k === "arrowright") dx += step;
      else if (k === " " || k === "space") dy += step;
      else if (k === "shift") dy -= step;
      else return;
      e.preventDefault();
      SHARED.pos.x = Math.max(0, Math.min(25, SHARED.pos.x + dx));
      SHARED.pos.y = Math.max(0, Math.min(20, SHARED.pos.y + dy));
      SHARED.pos.z = Math.max(0, Math.min(25, SHARED.pos.z + dz));
      posRef.current.copy(SHARED.pos);
    };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); };
  }, [posRef]);
  useFrame(() => {
    if (grp.current) { grp.current.position.copy(SHARED.pos); grp.current.rotation.copy(SHARED.rot); }
  });
  return (<group ref={grp} position={[5, 1, 5]}>
    <mesh><sphereGeometry args={[1, 32, 32]} /><meshStandardMaterial color="#3b82f6" roughness={0.2} metalness={0.1} transparent opacity={0.3} /></mesh>
    <mesh><sphereGeometry args={[0.08, 8, 8]} /><meshBasicMaterial color="#1e40af" /></mesh>
    {showLocal && <LocalAxes />}
  </group>);
}

function LocalAxes() {
  // Local X→World X (Three.js Z, red), Local Y→World Y (Three.js X, dark), Local Z→World Z (Three.js Y, blue)
  const colors = ["#ef4444", "#1e293b", "#3b82f6"];
  const dirs: [number, number, number][] = [[0, 0, 1], [1, 0, 0], [0, 1, 0]];
  return (<>
    {dirs.map((d, i) => {
      const a = new THREE.Vector3(0, 0, 0), b = new THREE.Vector3(...d);
      const mid = a.clone().add(b).multiplyScalar(0.5);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.normalize());
      return (<group key={i}>
        <mesh position={mid} quaternion={q}>
          <cylinderGeometry args={[0.04, 0.04, 1, 8]} />
          <meshBasicMaterial color={colors[i]} depthTest={false} />
        </mesh>
        <mesh position={b}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color={colors[i]} />
        </mesh>
      </group>);
    })}
  </>);
}

function ProjectionLines({ posRef }: { posRef: React.MutableRefObject<THREE.Vector3> }) {
  const grp = useRef<THREE.Group>(null!);
  const allDash = useRef<THREE.Mesh[][]>([]);
  const dots = useRef<THREE.Mesh[]>([]);
  const MAX = 60;

  useEffect(() => {
    const g = grp.current; if (!g || allDash.current.length > 0) return;
    ["#ef4444", "#1e293b", "#3b82f6"].forEach((c) => {
      const arr: THREE.Mesh[] = [];
      for (let i = 0; i < MAX; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 6), new THREE.MeshBasicMaterial({ color: c, depthTest: false })); m.visible = false; g.add(m); arr.push(m); }
      allDash.current.push(arr);
    });
    ["#0ea5e9", "#ef4444", "#1e293b"].forEach(c => { const dot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), new THREE.MeshBasicMaterial({ color: c })); g.add(dot); dots.current.push(dot); });
  }, []);

  useFrame(() => {
    const all = allDash.current; if (all.length === 0) return;
    const p = posRef.current; const f = new THREE.Vector3(p.x, 0, p.z);
    const fb = f.clone(); fb.y = 0.01; // slight offset above floor
    const lines: [THREE.Vector3, THREE.Vector3, number][] = [
      [fb, new THREE.Vector3(p.x, 0, 0), 0], [fb, new THREE.Vector3(0, 0, p.z), 1], [p, fb, 2],
    ];
    lines.forEach(([a, b, li]) => {
      const meshes = all[li]; const dir = b.clone().sub(a); const len = dir.length(); dir.normalize();
      const dL = 0.4, gL = 0.3; let ps = 0; let dash = true; let idx = 0;
      while (ps < len && idx < MAX) {
        const seg = dash ? Math.min(dL, len - ps) : Math.min(gL, len - ps);
        if (dash && seg > 0.01 && idx < MAX) {
          const mid = a.clone().add(dir.clone().multiplyScalar(ps + seg / 2));
          const m = meshes[idx]; m.position.copy(mid); m.scale.set(1, seg, 1);
          if (seg > 0.001) m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
          m.visible = true; idx++;
        }
        ps += seg; dash = !dash;
      }
      for (let i = idx; i < MAX; i++) meshes[i].visible = false;
    });
    const d = dots.current; d[0]?.position.set(p.x, 0, p.z); d[1]?.position.set(p.x, 0, 0); d[2]?.position.set(0, 0, p.z);
  });

  return <group ref={grp} renderOrder={998} />;
}

export default function TransformationScene({ posRef, showPosition, showOrientation, sceneKey }: {
  posRef: React.MutableRefObject<THREE.Vector3>; showPosition: boolean; showOrientation: boolean; sceneKey: string;
}) {
  return (<Canvas key={sceneKey} camera={{ position: [37.9, 14.7, 38.0], fov: 45, near: 0.1, far: 500 }} gl={{ antialias: true }} style={{ background: "#f8fafc" }}>
    <ambientLight intensity={0.8} /><directionalLight position={[5, 10, 5]} intensity={1} />
    <CornerPlates /><Axes />
    <KeyboardBall posRef={posRef} showLocal={showOrientation} />
    {showPosition && <ProjectionLines posRef={posRef} />}
    {showOrientation && <RotationGizmo />}
    <OrbitControls enablePan enableZoom enableRotate enabled={!SHARED.dragging} />
  </Canvas>);
}

function RotationGizmo() {
  const { camera, gl } = useThree();
  const grp = useRef<THREE.Group>(null!);
  const ringRef = useRef<THREE.Mesh[]>([]);
  const dragAxis = useRef<number>(-1);
  const lastVec = useRef(new THREE.Vector3());
  const _ballPos = useRef(new THREE.Vector3());

  // Rings match world axes: X(red)→Three.js Z, Y(dark)→Three.js X, Z(blue)→Three.js Y
  const axes = [
    { color: "#ef4444", rotation: [0, 0, 0] as const, axis: 0 },           // X ring (red) — normal along Three.js Z
    { color: "#1e293b", rotation: [0, Math.PI / 2, 0] as const, axis: 1 },  // Y ring (dark) — normal along Three.js X
    { color: "#3b82f6", rotation: [Math.PI / 2, 0, 0] as const, axis: 2 },  // Z ring (blue) — normal along Three.js Y
  ];
  // Ring normals in local space (before group rotation)
  const localNormals = [
    new THREE.Vector3(0, 0, 1),  // X ring normal = Three.js Z
    new THREE.Vector3(1, 0, 0),  // Y ring normal = Three.js X
    new THREE.Vector3(0, 1, 0),  // Z ring normal = Three.js Y
  ];

  // Sync gizmo position & rotation every frame
  useFrame(() => {
    if (grp.current) {
      grp.current.position.copy(SHARED.pos);
      grp.current.rotation.copy(SHARED.rot);
    }
  });

  useEffect(() => {
    const cvs = gl.domElement;
    const toNDC = (e: PointerEvent, rect: DOMRect): [number, number] => {
      return [((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1];
    };

    // Compute world-space ring plane for current ball rotation
    const getRingPlane = (axisIdx: number): THREE.Plane => {
      const rotMatrix = new THREE.Matrix4().makeRotationFromEuler(SHARED.rot);
      const worldNormal = localNormals[axisIdx].clone().applyMatrix4(rotMatrix).normalize();
      const center = new THREE.Vector3(SHARED.pos.x, SHARED.pos.y, SHARED.pos.z);
      return new THREE.Plane(worldNormal, -center.dot(worldNormal));
    };

    const onDown = (e: PointerEvent) => {
      const rect = cvs.getBoundingClientRect();
      const [mx, my] = toNDC(e, rect);
      const rc = new THREE.Raycaster();
      rc.setFromCamera(new THREE.Vector2(mx, my), camera);
      const hits = rc.intersectObjects(ringRef.current);
      if (hits.length > 0) {
        const idx = ringRef.current.indexOf(hits[0].object as THREE.Mesh);
        if (idx >= 0) {
          dragAxis.current = axes[idx].axis;
          SHARED.dragging = true;
          _ballPos.current.set(SHARED.pos.x, SHARED.pos.y, SHARED.pos.z);
          // Raycast to ring plane to get initial reference vector
          const plane = getRingPlane(dragAxis.current);
          const hit = new THREE.Vector3();
          rc.ray.intersectPlane(plane, hit);
          lastVec.current.copy(hit).sub(_ballPos.current);
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          e.stopPropagation();
        }
      }
    };

    const onMove = (e: PointerEvent) => {
      if (dragAxis.current < 0) return;
      const rect = cvs.getBoundingClientRect();
      const [mx, my] = toNDC(e, rect);
      const rc = new THREE.Raycaster();
      rc.setFromCamera(new THREE.Vector2(mx, my), camera);
      // Project mouse onto the ring's current world-space plane
      const plane = getRingPlane(dragAxis.current);
      const hit = new THREE.Vector3();
      const ok = rc.ray.intersectPlane(plane, hit);
      if (!ok) return;
      const curVec = hit.sub(_ballPos.current);
      // Compute signed angle from lastVec to curVec around ring normal
      const angle = lastVec.current.angleTo(curVec);
      if (angle < 0.001) return;
      const cross = new THREE.Vector3().crossVectors(lastVec.current, curVec);
      const sign = cross.dot(plane.normal) >= 0 ? 1 : -1;
      const delta = angle * sign;
      lastVec.current.copy(curVec);

      const ax = dragAxis.current;
      // Local rotation: R_new = R_current * dRot(axis, delta)
      const rm = new THREE.Matrix4().makeRotationFromEuler(SHARED.rot);
      const dRot = new THREE.Matrix4();
      if (ax === 0) dRot.makeRotationZ(delta);   // Red ring → local X → Three.js Z
      else if (ax === 1) dRot.makeRotationX(delta); // Dark ring → local Y → Three.js X
      else dRot.makeRotationY(delta);               // Blue ring → local Z → Three.js Y
      rm.multiply(dRot);
      SHARED.rot.setFromRotationMatrix(rm);
    };

    const onUp = () => { dragAxis.current = -1; SHARED.dragging = false; };

    cvs.addEventListener("pointerdown", onDown);
    cvs.addEventListener("pointermove", onMove);
    cvs.addEventListener("pointerup", onUp);
    return () => {
      cvs.removeEventListener("pointerdown", onDown);
      cvs.removeEventListener("pointermove", onMove);
      cvs.removeEventListener("pointerup", onUp);
    };
  }, [camera, gl]);

  return (
    <group ref={grp} position={[SHARED.pos.x, SHARED.pos.y, SHARED.pos.z]} rotation={SHARED.rot}>
      {axes.map(({ color, rotation }, i) => (
        <mesh key={i} rotation={rotation} ref={el => { if (el) ringRef.current[i] = el; }}>
          <torusGeometry args={[1.3, 0.05, 16, 64]} />
          <meshBasicMaterial color={color} transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}
