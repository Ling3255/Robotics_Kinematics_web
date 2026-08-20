"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { L1, L2, R_MAX, R_MIN, solve2LinkIK, armPositions } from "../shared";

export type DiagramIntent =
  | "intro"
  | "arm"
  | "workspace"
  | "solutions"
  | "static";

export interface IKDiagramProps {
  intent?: DiagramIntent;
  theta1?: number;
  theta2?: number;
  theta1Alt?: number;
  theta2Alt?: number;
  target?: [number, number];
  unreachableTarget?: [number, number];
  showRings?: boolean;
  showAngleLabels?: boolean;
  className?: string;
}

// --- Minimal text sprite (drawn on a canvas) ------------------
function makeTextSprite(
  msg: string,
  opts: { fontSize?: number; color?: string; scale?: number } = {}
) {
  const fontSize = opts.fontSize ?? 60;
  const color = opts.color ?? "#111111";
  const scale = opts.scale ?? 1;
  const padding = 12;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  const w = Math.ceil(ctx.measureText(msg).width) + padding * 2;
  const h = Math.ceil(fontSize * 1.5) + padding * 2;
  canvas.width = w;
  canvas.height = h;
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(0,0,0,0.15)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, w - 2, h - 2);
  ctx.fillStyle = color;
  ctx.fillText(msg, w / 2, h / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.SpriteMaterial({
    map: texture,
    depthTest: false,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set((canvas.width / canvas.height) * scale, scale, 1);
  return sprite;
}

// Build a generic THREE.Line given a list of points. Returns the object.
function buildLine(pts: THREE.Vector3[], color: string, dashed = false) {
  const geom = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = dashed
    ? new THREE.LineDashedMaterial({ color, dashSize: 6, gapSize: 4 })
    : new THREE.LineBasicMaterial({ color });
  const line = new THREE.Line(geom, mat);
  if (dashed) {
    line.computeLineDistances();
  }
  return line;
}


/** Points of a circular arc on the XY plane. */
function arcPoints(
  cx: number,
  cy: number,
  radius: number,
  start: number,
  end: number,
  segments = 48
) {
  const arr: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const a = start + (end - start) * (i / segments);
    arr.push(
      new THREE.Vector3(cx + radius * Math.cos(a), cy + radius * Math.sin(a), 0)
    );
  }
  return arr;
}

// Small text placed next to a clamped THREE.Sprite
function SpriteLabel({
  label,
  position,
  color,
  scale = 5,
}: {
  label: string;
  position: [number, number, number];
  color: string;
  scale?: number;
}) {
  const sprite = useMemo(
    () => makeTextSprite(label, { color, scale }),
    [label, color, scale]
  );
  return <primitive object={sprite} position={position} />;
}

// --- The animated scene ----------------------------------------
function ArmScene({
  intent,
  theta1,
  theta2,
  theta1Alt,
  theta2Alt,
  target,
  unreachableTarget,
  showRings,
  showAngleLabels,
}: {
  intent: DiagramIntent;
  theta1?: number;
  theta2?: number;
  theta1Alt?: number;
  theta2Alt?: number;
  target?: [number, number];
  unreachableTarget?: [number, number];
  showRings?: boolean;
  showAngleLabels?: boolean;
}) {
  // Imperatively built objects (avoid JSX <line> SVG typing conflict).
  const linkGeo1 = useRef(
    new THREE.BufferGeometry().setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(6), 3)
    )
  ).current;
  const linkGeo2 = useRef(
    new THREE.BufferGeometry().setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(6), 3)
    )
  ).current;
  const linkMat1 = useRef(new THREE.LineBasicMaterial({ color: "#4f46e5" }))
    .current;
  const linkMat2 = useRef(new THREE.LineBasicMaterial({ color: "#0891b2" }))
    .current;
  const line1 = useRef(new THREE.Line(linkGeo1, linkMat1)).current;
  const line2 = useRef(new THREE.Line(linkGeo2, linkMat2)).current;

  // Thick "link rods" (cylinders) so the arm reads clearly.
  const rodGeo1 = useRef(new THREE.CylinderGeometry(3, 3, L1, 10)).current;
  const rodGeo2 = useRef(new THREE.CylinderGeometry(3, 3, L2, 10)).current;
  const rodMat1 = useRef(
    new THREE.MeshStandardMaterial({ color: "#4f46e5", roughness: 0.5 })
  ).current;
  const rodMat2 = useRef(
    new THREE.MeshStandardMaterial({ color: "#0ea5e9", roughness: 0.5 })
  ).current;
  const rod1 = useRef(new THREE.Mesh(rodGeo1, rodMat1)).current;
  const rod2 = useRef(new THREE.Mesh(rodGeo2, rodMat2)).current;
  const rodGeo1b = useRef(new THREE.CylinderGeometry(2.6, 2.6, L1, 10)).current;
  const rodGeo2b = useRef(new THREE.CylinderGeometry(2.6, 2.6, L2, 10)).current;
  const rodMat1b = useRef(
    new THREE.MeshStandardMaterial({ color: "#0e7490", transparent: true, opacity: 0.55 })
  ).current;
  const rodMat2b = useRef(
    new THREE.MeshStandardMaterial({ color: "#14b8a6", transparent: true, opacity: 0.55 })
  ).current;
  const rod1b = useRef(new THREE.Mesh(rodGeo1b, rodMat1b)).current;
  const rod2b = useRef(new THREE.Mesh(rodGeo2b, rodMat2b)).current;

  // Place a vertical cylinder along the XY-segment (a)->(b).
  const placeRod = (cyl: THREE.Mesh, ax: number, ay: number, bx: number, by: number) => {
    const a = new THREE.Vector3(ax, ay, 0);
    const b = new THREE.Vector3(bx, by, 0);
    cyl.position.copy(a).add(b).multiplyScalar(0.5);
    const dir = b.clone().sub(a).normalize();
    cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  };

  // Second ("ghost") arm, shown only for the solutions intent (elbow-down).
  const linkGeo1b = useRef(
    new THREE.BufferGeometry().setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(6), 3)
    )
  ).current;
  const linkGeo2b = useRef(
    new THREE.BufferGeometry().setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(6), 3)
    )
  ).current;
  const linkMat1b = useRef(
    new THREE.LineBasicMaterial({ color: "#0e7490", transparent: true, opacity: 0.55 })
  ).current;
  const linkMat2b = useRef(
    new THREE.LineBasicMaterial({ color: "#14b8a6", transparent: true, opacity: 0.55 })
  ).current;
  const line1b = useRef(new THREE.Line(linkGeo1b, linkMat1b)).current;
  const line2b = useRef(new THREE.Line(linkGeo2b, linkMat2b)).current;
  const showGhost = intent === "solutions" && theta1Alt != null && theta2Alt != null;

  // Dashed "goal" line drawn from the base to the current target (intro only).
  const goalGeo = useRef(
    new THREE.BufferGeometry().setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(6), 3)
    )
  ).current;
  const goalLine = useRef(
    new THREE.Line(
      goalGeo,
      new THREE.LineDashedMaterial({
        color: "#f59e0b",
        dashSize: 4,
        gapSize: 3,
        transparent: true,
        opacity: 0.75,
      })
    )
  ).current;

  const joint1 = useRef<THREE.Mesh>(null);
  const eff = useRef<THREE.Mesh>(null);
  const targetSphere = useRef<THREE.Mesh>(null);
  const joint1b = useRef<THREE.Mesh>(null);
  const effb = useRef<THREE.Mesh>(null);
  const labels = intent === "intro";

  /** Update the two line segments + joints for a given pose. */
  const applyPose = (th1r: number, th2r: number, tgt?: [number, number]) => {
    const { jx, jy, ex, ey } = armPositions(th1r, th2r);
    const setPoints = (
      line: THREE.Line,
      ax: number,
      ay: number,
      bx: number,
      by: number
    ) => {
      const pos = line.geometry.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      arr[0] = 0; arr[1] = 0; arr[2] = 0;
      arr[3] = ax; arr[4] = ay; arr[5] = 0;
      pos.needsUpdate = true;
      line.geometry.computeBoundingSphere();
    };
    setPoints(line1, 0, 0, jx, jy);
    setPoints(line2, jx, jy, ex, ey);
    placeRod(rod1, 0, 0, jx, jy);
    placeRod(rod2, jx, jy, ex, ey);
    if (joint1.current) joint1.current.position.set(jx, jy, 0);
    if (eff.current) eff.current.position.set(ex, ey, 0);
    // Ghost (alternate) arm for the solutions intent.
    if (showGhost && theta1Alt != null && theta2Alt != null) {
      const g = armPositions(theta1Alt, theta2Alt);
      setPoints(line1b, 0, 0, g.jx, g.jy);
      setPoints(line2b, g.jx, g.jy, g.ex, g.ey);
      placeRod(rod1b, 0, 0, g.jx, g.jy);
      placeRod(rod2b, g.jx, g.jy, g.ex, g.ey);
      if (joint1b.current) joint1b.current.position.set(g.jx, g.jy, 0);
      if (effb.current) effb.current.position.set(g.ex, g.ey, 0);
    }
    if (targetSphere.current) {
      if (tgt) {
        const reachable = solve2LinkIK(tgt[0], tgt[1]).reachable;
        (targetSphere.current.material as THREE.MeshStandardMaterial).color.set(
          reachable ? "#15803d" : "#b91c1c"
        );
        targetSphere.current.position.set(tgt[0], tgt[1], 0);
        targetSphere.current.visible = true;
      } else {
        targetSphere.current.visible = false;
      }
    }
    // Draw the dashed goal line from base to target (intro)
    const gpos = goalLine.geometry.attributes.position as THREE.BufferAttribute;
    const garr = gpos.array as Float32Array;
    if (labels && tgt) {
      garr[0] = 0; garr[1] = 0; garr[2] = 0;
      garr[3] = tgt[0]; garr[4] = tgt[1]; garr[5] = 0;
      gpos.needsUpdate = true;
      goalLine.geometry.computeBoundingSphere();
      goalLine.computeLineDistances();
      goalLine.visible = true;
    } else if (labels) {
      goalLine.visible = false;
    }
  };

  // Initial fixed pose so refs are populated for the first paint.
  useMemo(() => {
    applyPose(theta1 ?? 0.6, theta2 ?? 0.9, target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (intent === "intro" || intent === "workspace") {
      const r = (R_MIN + R_MAX) / 2;
      const a = t * 0.8;
      const tx = r * Math.cos(a);
      const ty = r * Math.sin(a);
      const sol = solve2LinkIK(tx, ty);
      if (sol.reachable && sol.theta1 != null && sol.theta2 != null) {
        applyPose(sol.theta1, sol.theta2, [tx, ty]);
      }
    } else if (
      intent === "arm" ||
      intent === "static" ||
      intent === "solutions"
    ) {
      if (theta1 != null && theta2 != null) {
        applyPose(theta1, theta2, target);
      }
    }
  });

  // Static decoration objects (built once from the fixed pose).
  const angleArcs = useMemo(() => {
    const arr: THREE.Object3D[] = [];
    if (
      (intent === "arm" || intent === "static" || intent === "solutions") &&
      theta1 != null &&
      theta2 != null
    ) {
      arr.push(
        buildLine(arcPoints(0, 0, 14, 0, theta1), "#ef4444")
      );
      const { jx, jy } = armPositions(theta1, theta2);
      arr.push(
        buildLine(
          arcPoints(jx, jy, 11, theta1, theta1 + theta2),
          "#2563eb"
        )
      );
    }
    return arr;
  }, [intent, theta1, theta2]);

  return (
    <group>
      {/* Grid plane */}
      <gridHelper args={[280, 28, "#cbd5e1", "#e2e8f0"]} rotation={[Math.PI / 2, 0, 0]} />
      {/* Axes hints */}
      <axesHelper args={[R_MAX + 8]} />

      {/* Workspace rings */}
      {showRings && (
        <group rotation={[Math.PI / 2, 0, 0]}>
          <mesh>
            <ringGeometry args={[R_MIN, R_MAX, 96]} />
            <meshBasicMaterial
              color="#4f46e5"
              transparent
              opacity={0.06}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <primitive
            object={buildLine(arcPoints(0, 0, R_MAX, 0, Math.PI * 2), "#94a3b8", true)}
          />
          <primitive
            object={buildLine(arcPoints(0, 0, R_MIN, 0, Math.PI * 2), "#cbd5e1", true)}
          />
          <SpriteLabel
            label={`R_max = L1+L2 = ${R_MAX}`}
            position={[0, R_MAX, 0.4]}
            color="#64748b"
            scale={3.4}
          />
          <SpriteLabel
            label={`r_min = |L1−L2| = ${R_MIN}`}
            position={[0, R_MIN, 0.4]}
            color="#94a3b8"
            scale={3.4}
          />
        </group>
      )}

      {/* Unreachable target (workspace) */}
      {unreachableTarget && (
        <mesh position={[unreachableTarget[0], unreachableTarget[1], 0]}>
          <sphereGeometry args={[4.5, 16, 12]} />
          <meshStandardMaterial color="#b91c1c" />
        </mesh>
      )}

      {/* Thick link rods + thin edge lines */}
      <primitive object={rod1} />
      <primitive object={rod2} />
      <primitive object={line1} />
      <primitive object={line2} />

      {/* Ghost arm (elbow-down) shown for the solutions intent */}
      {showGhost && (
        <>
          <primitive object={rod1b} />
          <primitive object={rod2b} />
          <primitive object={line1b} />
          <primitive object={line2b} />
        </>
      )}

      {/* Dashed goal line (intro) */}
      {labels && <primitive object={goalLine} />}

      {/* Joints */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[5, 20, 16]} />
        <meshStandardMaterial color="#3730a3" />
        {labels && <SpriteLabel label="BASE" position={[0, 12, 0]} color="#3730a3" scale={3.2} />}
      </mesh>
      <mesh ref={joint1} position={[L1, 0, 0]}>
        <sphereGeometry args={[5, 20, 16]} />
        <meshStandardMaterial color="#3730a3" />
        {labels && <SpriteLabel label="ELBOW" position={[0, 12, 0]} color="#3730a3" scale={3.2} />}
      </mesh>
      <mesh ref={eff} position={[L1 + L2, 0, 0]}>
        <sphereGeometry args={[5.5, 20, 16]} />
        <meshStandardMaterial color="#16a34a" />
        {labels && <SpriteLabel label="END" position={[0, 13, 0]} color="#15803d" scale={3.2} />}
      </mesh>

      {/* Ghost arm joints (solutions) */}
      {showGhost && (
        <>
          <mesh ref={joint1b} position={[L1, 0, 0]}>
            <sphereGeometry args={[4, 20, 16]} />
            <meshStandardMaterial color="#0e7490" transparent opacity={0.7} />
          </mesh>
          <mesh ref={effb} position={[L1 + L2, 0, 0]}>
            <sphereGeometry args={[4.5, 20, 16]} />
            <meshStandardMaterial color="#14b8a6" transparent opacity={0.7} />
          </mesh>
        </>
      )}

      {/* Target marker (position + color managed in applyPose) */}
      <mesh ref={targetSphere} position={[0, 0, 0]} visible={false}>
        <sphereGeometry args={[5.5, 20, 16]} />
        <meshStandardMaterial color="#15803d" />
        {labels && <SpriteLabel label="TARGET" position={[0, 13, 0]} color="#b45309" scale={3} />}
      </mesh>

      {/* Static angle arcs */}
      {angleArcs.map((obj, i) => (
        <primitive key={i} object={obj} />
      ))}

      {/* Angle labels */}
      {showAngleLabels &&
        intent !== "intro" &&
        intent !== "workspace" &&
        theta1 != null &&
        theta2 != null && (
          <group>
            <SpriteLabel
              label={`θ1 = ${Math.round((theta1 * 180) / Math.PI)}°`}
              position={[18, 6, 0]}
              color="#dc2626"
              scale={2.8}
            />
            <SpriteLabel
              label={`θ2 = ${Math.round((theta2 * 180) / Math.PI)}°`}
              position={[L1 + 16, 4, 0]}
              color="#1d4ed8"
              scale={2.8}
            />
          </group>
        )}
    </group>
  );
}

export default function IKDiagram(props: IKDiagramProps) {
  return (
    <div className={props.className}>
      <Canvas
        camera={{ position: [0, -150, 130], fov: 45 }}
        style={{ background: "#f6f6f6" }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[0, 0, 100]} intensity={0.6} />
        <OrbitControls enableDamping makeDefault />
        <ArmScene
          intent={props.intent ?? "static"}
          theta1={props.theta1}
          theta2={props.theta2}
          target={props.target}
          unreachableTarget={props.unreachableTarget}
          showRings={props.showRings}
          showAngleLabels={props.showAngleLabels}
        />
      </Canvas>
    </div>
  );
}
