'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { GLTFLoader, type OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import HintBox from '@/components/ui/HintBox';

const MESH_URLS = [
  '/meshes/irb4600/IRB4600_20kg-250_BASE.glb',
  '/meshes/irb4600/IRB4600_20kg-250_LINK1.glb',
  '/meshes/irb4600/IRB4600_20kg-250_LINK2.glb',
  '/meshes/irb4600/IRB4600_20kg-250_LINK3.glb',
  '/meshes/irb4600/IRB4600_20kg-250_LINK4.glb',
  '/meshes/irb4600/IRB4600_20kg-250_LINK5.glb',
  '/meshes/irb4600/IRB4600_20kg-250_LINK6.glb',
];

/** Standard DH joint parameters from robodimm irb4600Serial6Spec. A = RotZ(theta+offset) * TransZ(d) * TransX(a) * RotX(alpha). */
interface JointSpec {
  a: number;
  alpha: number;
  d: number;
  offset: number;
  min: number;
  max: number;
}

const JOINTS: JointSpec[] = [
  { a: 0.175, alpha: -Math.PI / 2, d: 0.495, offset: 0, min: -Math.PI, max: Math.PI },
  { a: 1.095, alpha: 0, d: 0, offset: -Math.PI / 2, min: -Math.PI / 2, max: 2.618 },
  { a: 0.175, alpha: -Math.PI / 2, d: 0, offset: 0, min: -Math.PI, max: 1.309 },
  { a: 0, alpha: Math.PI / 2, d: 1.2305, offset: 0, min: -6.981, max: 6.981 },
  { a: 0, alpha: Math.PI / 2, d: 0, offset: Math.PI, min: -2.182, max: 2.094 },
  { a: 0, alpha: 0, d: 0.085, offset: 0, min: -6.981, max: 6.981 },
];

const INITIAL_THETAS = [-0.4, 0.3, 0.6, 0, 0.5, 0];
const ROBOT_SCALE = 2;

/** Reach clamp in scaled world coordinates. */
const ARM_MAX_REACH = (1.095 + 0.175 + 1.2305 + 0.085) * ROBOT_SCALE * 0.98;
const MIN_REACH = 1.0;
const FLOOR_Y = 0.15;

const IK_ITERATIONS = 10;
const IK_TOLERANCE = 0.02;
const IK_MAX_STEP = 0.3;
const GRAB_THRESHOLD_PX = 48;

/** Emissive hover color, matched to the red label color. */
const HIGHLIGHT_EMISSIVE = 0xdc2626;
const HIGHLIGHT_INTENSITY = 0.5;

/** Hoverable model parts. */
type PartKey = 'base' | 'link1' | 'link2' | 'link3' | 'link4' | 'link5' | 'link6';

/** Joint/Link teaching annotations. Anchors use joint pivots or midpoints; parts drive hover highlights. */
interface AnnotationItem {
  key: string;
  title: string;
  sub: string;
  rank: number;
  anchor: { kind: 'joint'; index: number } | { kind: 'mid'; a: number; b: number };
  parts: PartKey[];
}

const ANNOTATION_ITEMS: AnnotationItem[] = [
  { key: 'j1', title: 'Joint', sub: 'Base rotation J1', rank: 4, anchor: { kind: 'mid', a: 0, b: 1 }, parts: ['base', 'link1'] },
  { key: 'j2', title: 'Joint', sub: 'Shoulder joint J2', rank: 3, anchor: { kind: 'joint', index: 1 }, parts: ['link2'] },
  { key: 'upperarm', title: 'Link', sub: 'Upper arm', rank: 1, anchor: { kind: 'mid', a: 1, b: 2 }, parts: ['link2'] },
  { key: 'j3', title: 'Joint', sub: 'Elbow joint J3', rank: 0, anchor: { kind: 'joint', index: 2 }, parts: ['link3'] },
  { key: 'forearm', title: 'Link', sub: 'Forearm', rank: 2, anchor: { kind: 'mid', a: 3, b: 4 }, parts: ['link4'] },
  { key: 'wrist', title: 'Joint', sub: 'Wrist joint J4-J6', rank: 5, anchor: { kind: 'joint', index: 4 }, parts: ['link5', 'link6'] },
];

interface OverlayEntry {
  dot: SVGCircleElement | null;
  line: SVGPolylineElement | null;
  label: SVGGElement | null;
}

type OverlayRefsMap = Map<string, OverlayEntry>;

const ANNOTATION_ROW_GAP = 48;
const ANNOTATION_COL_OFFSET = 120;
const ANNOTATION_LEADER_MAX = 80;

/** Standard DH homogeneous transform matrix. */
function dhMatrix(theta: number, d: number, a: number, alpha: number): THREE.Matrix4 {
  const ct = Math.cos(theta);
  const st = Math.sin(theta);
  const ca = Math.cos(alpha);
  const sa = Math.sin(alpha);
  return new THREE.Matrix4().set(
    ct, -st * ca, st * sa, a * ct,
    st, ct * ca, -ct * sa, a * st,
    0, sa, ca, d,
    0, 0, 0, 1,
  );
}

const IK_P = new THREE.Vector3();
const IK_AXIS = new THREE.Vector3();
const IK_TCP = new THREE.Vector3();
const IK_V1 = new THREE.Vector3();
const IK_V2 = new THREE.Vector3();
const IK_W1 = new THREE.Vector3();
const IK_W2 = new THREE.Vector3();
const IK_CROSS = new THREE.Vector3();

/** CCD in joint-angle space: pull TCP toward targetWorld one joint at a time. */
function solveCcd(
  joints: THREE.Group[],
  tcpObj: THREE.Object3D,
  applyThetas: (thetas: number[]) => void,
  thetas: number[],
  targetWorld: THREE.Vector3,
) {
  for (let iter = 0; iter < IK_ITERATIONS; iter++) {
    tcpObj.getWorldPosition(IK_TCP);
    if (IK_TCP.distanceToSquared(targetWorld) < IK_TOLERANCE * IK_TOLERANCE) return;
    for (let i = joints.length - 1; i >= 0; i--) {
      const pivotObj = joints[i];
      pivotObj.getWorldPosition(IK_P);
      IK_AXIS.setFromMatrixColumn(pivotObj.matrixWorld, 2).normalize();
      IK_V1.copy(IK_TCP).sub(IK_P);
      IK_V2.copy(targetWorld).sub(IK_P);
      IK_W1.copy(IK_V1).addScaledVector(IK_AXIS, -IK_V1.dot(IK_AXIS));
      IK_W2.copy(IK_V2).addScaledVector(IK_AXIS, -IK_V2.dot(IK_AXIS));
      if (IK_W1.lengthSq() < 1e-10 || IK_W2.lengthSq() < 1e-10) continue;
      IK_W1.normalize();
      IK_W2.normalize();

      IK_CROSS.crossVectors(IK_W1, IK_W2);
      const delta = THREE.MathUtils.clamp(
        Math.atan2(IK_CROSS.dot(IK_AXIS), THREE.MathUtils.clamp(IK_W1.dot(IK_W2), -1, 1)),
        -IK_MAX_STEP,
        IK_MAX_STEP,
      );
      thetas[i] = THREE.MathUtils.clamp(thetas[i] + delta, JOINTS[i].min, JOINTS[i].max);
      applyThetas(thetas);
      tcpObj.getWorldPosition(IK_TCP);
    }
  }
}

const TMP_A = new THREE.Vector3();
const TMP_B = new THREE.Vector3();

/** Project annotation anchors to screen space each frame and write SVG attributes directly. */
function ArmLabelProjector({
  rig,
  refsMapRef,
  items,
}: {
  rig: ArmRig;
  refsMapRef: { current: OverlayRefsMap };
  items: AnnotationItem[];
}) {
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const anchors: { item: AnnotationItem; refs: OverlayEntry; x: number; y: number }[] = [];
    let maxX = 0;
    let sumY = 0;

    for (const item of items) {
      const refs = refsMapRef.current.get(item.key);
      if (!refs || !refs.dot || !refs.line || !refs.label) continue;

      if (item.anchor.kind === 'joint') {
        const obj = rig.joints[item.anchor.index];
        if (!obj) continue;
        obj.updateWorldMatrix(true, false);
        obj.getWorldPosition(v);
      } else {
        const a = rig.joints[item.anchor.a];
        const b = rig.joints[item.anchor.b];
        if (!a || !b) continue;
        a.updateWorldMatrix(true, false);
        b.updateWorldMatrix(true, false);
        a.getWorldPosition(TMP_A);
        b.getWorldPosition(TMP_B);
        v.lerpVectors(TMP_A, TMP_B, 0.5);
      }

      v.project(camera);
      const x = (v.x * 0.5 + 0.5) * size.width;
      const y = (-v.y * 0.5 + 0.5) * size.height;
      anchors.push({ item, refs, x, y });
      maxX = Math.max(maxX, x);
      sumY += y;
    }

    if (anchors.length === 0) return;

    const meanY = sumY / anchors.length;
    const centerY = Math.min(Math.max(meanY, 120), size.height - 120);
    const colX = Math.min(maxX + ANNOTATION_COL_OFFSET, size.width - 140);
    const f = (n: number) => n.toFixed(1);

    for (const { item, refs, x, y } of anchors) {
      const rowY = centerY + (item.rank - (items.length - 1) / 2) * ANNOTATION_ROW_GAP;
      const run = Math.min(Math.abs(rowY - y), ANNOTATION_LEADER_MAX);
      const bendX = x + run;
      const { dot, line, label } = refs;
      if (!dot || !line || !label) continue;
      dot.setAttribute('cx', f(x));
      dot.setAttribute('cy', f(y));
      line.setAttribute('points', `${f(x)},${f(y)} ${f(bendX)},${f(rowY)} ${f(colX)},${f(rowY)}`);
      label.setAttribute('transform', `translate(${f(colX)}, ${f(rowY)})`);
    }
  });

  return null;
}

/** Annotation overlay matching the character side; labels can hover-highlight model parts. */
function LabelsOverlay({
  items,
  refsMapRef,
  hoverItems,
  onHoverItems,
}: {
  items: AnnotationItem[];
  refsMapRef: { current: OverlayRefsMap };
  hoverItems: string[];
  onHoverItems: (keys: string[]) => void;
}) {
  const setRef =
    (key: string, part: 'dot' | 'line' | 'label') =>
    (el: SVGCircleElement | SVGPolylineElement | SVGGElement | null) => {
      const entry = refsMapRef.current.get(key) ?? { dot: null, line: null, label: null };
      entry[part] = el as never;
      refsMapRef.current.set(key, entry);
    };

  return (
    <div className="pointer-events-none absolute inset-0 z-[5] select-none">
      <svg className="h-full w-full">
        {items.map((item) => {
          const emphasized = hoverItems.length === 0 || hoverItems.includes(item.key);
          return (
            <g key={item.key} style={{ opacity: emphasized ? 1 : 0.25, transition: 'opacity 0.15s' }}>
              <polyline ref={setRef(item.key, 'line')} fill="none" stroke="#4b5563" strokeWidth={1} />
              <g
                ref={setRef(item.key, 'label')}
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                onPointerEnter={() => onHoverItems([item.key])}
                onPointerLeave={() => onHoverItems([])}
              >
                <text x={6} y={-8} stroke="white" strokeWidth={3} paintOrder="stroke">
                  <tspan x={6} dy={-10} fontSize={13} fontWeight={700} fill="#dc2626">
                    {item.title}
                  </tspan>
                  <tspan x={6} dy={13} fontSize={11} fill="#111827">
                    {item.sub}
                  </tspan>
                </text>
              </g>
              <circle ref={setRef(item.key, 'dot')} r={3.5} fill="#dc2626" />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

interface ArmRig {
  root: THREE.Group;
  /** Rotation groups for each joint; each origin is the joint pivot and each axis is local z. */
  joints: THREE.Group[];
  /** End-effector flange object. */
  tcp: THREE.Object3D;
  /** Shoulder joint pivot used for reach clamping. */
  shoulder: THREE.Object3D;
  /** Hoverable part roots: base plus the six cloned links. */
  parts: Record<PartKey, THREE.Object3D>;
  applyThetas: (thetas: number[]) => void;
}

function RobotArm({
  thetasRef,
  ikTargetRef,
  controlsRef,
  overlayRefsRef,
  hoverItems,
  onHoverItems,
  onReady,
}: {
  thetasRef: { current: number[] };
  ikTargetRef: { current: THREE.Vector3 | null };
  controlsRef: { current: OrbitControlsImpl | null };
  overlayRefsRef: { current: OverlayRefsMap };
  hoverItems: string[];
  onHoverItems: (keys: string[]) => void;
  onReady: () => void;
}) {
  const gltfs = useLoader(GLTFLoader, MESH_URLS);
  const { camera, gl } = useThree();
  const handleRef = useRef<THREE.Mesh | null>(null);
  const dragRef = useRef({ active: false, plane: new THREE.Plane() });

  const rig = useMemo<ArmRig>(() => {
    const root = new THREE.Group();
    const joints: THREE.Group[] = [];
    const offsets: THREE.Group[] = [];
    let parent: THREE.Object3D = root;
    for (let i = 0; i < JOINTS.length; i++) {
      const rotG = new THREE.Group();
      const offG = new THREE.Group();
      rotG.matrixAutoUpdate = false;
      offG.matrixAutoUpdate = false;
      offG.matrix.copy(dhMatrix(0, JOINTS[i].d, JOINTS[i].a, JOINTS[i].alpha));
      parent.add(rotG);
      rotG.add(offG);
      joints.push(rotG);
      offsets.push(offG);
      parent = offG;
    }
    const rotZ = new THREE.Matrix4();
    const rot = new THREE.Matrix4();
    const homePrev = new THREE.Matrix4();
    const homeQuatInv: THREE.Quaternion[] = [];
    for (let i = 0; i < JOINTS.length; i++) {
      homePrev.multiply(rotZ.makeRotationZ(JOINTS[i].offset));
      homeQuatInv.push(new THREE.Quaternion().setFromRotationMatrix(rot.extractRotation(homePrev)).invert());
      homePrev.multiply(dhMatrix(0, JOINTS[i].d, JOINTS[i].a, JOINTS[i].alpha));
    }

    const applyThetas = (thetas: number[]) => {
      for (let i = 0; i < JOINTS.length; i++) {
        joints[i].matrix.copy(rotZ.makeRotationZ(thetas[i] + JOINTS[i].offset));
      }
      root.updateMatrixWorld(true);
    };
    const parts = {} as Record<PartKey, THREE.Object3D>;
    const baseMesh = gltfs[0].scene.clone(true);
    root.add(baseMesh);
    parts.base = baseMesh;
    for (let i = 0; i < JOINTS.length; i++) {
      const linkMesh = gltfs[i + 1].scene.clone(true);
      const holder = new THREE.Group();
      holder.quaternion.copy(homeQuatInv[i]);
      holder.add(linkMesh);
      joints[i].add(holder);
      parts[`link${i + 1}` as PartKey] = linkMesh;
    }

    applyThetas(thetasRef.current);
    return {
      root,
      joints,
      tcp: offsets[JOINTS.length - 1],
      shoulder: joints[1],
      parts,
      applyThetas,
    };
  }, [gltfs, thetasRef]);

  useEffect(() => {
    onReady();
  }, [onReady]);
  useEffect(() => {
    if (hoverItems.length === 0) return;

    const partKeys = new Set<PartKey>();
    for (const key of hoverItems) {
      const item = ANNOTATION_ITEMS.find((i) => i.key === key);
      item?.parts.forEach((p) => partKeys.add(p));
    }

    const touched: { mat: THREE.MeshStandardMaterial; emissive: number; intensity: number }[] = [];
    for (const partKey of partKeys) {
      rig.parts[partKey]?.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          const std = m as THREE.MeshStandardMaterial;
          if (!std || !('emissive' in std)) continue;
          if (touched.some((t) => t.mat === std)) continue;
          touched.push({ mat: std, emissive: std.emissive.getHex(), intensity: std.emissiveIntensity });
          std.emissive.setHex(HIGHLIGHT_EMISSIVE);
          std.emissiveIntensity = HIGHLIGHT_INTENSITY;
        }
      });
    }

    return () => {
      for (const t of touched) {
        t.mat.emissive.setHex(t.emissive);
        t.mat.emissiveIntensity = t.intensity;
      }
    };
  }, [hoverItems, rig]);
  useFrame(() => {
    const target = ikTargetRef.current;
    if (target) solveCcd(rig.joints, rig.tcp, rig.applyThetas, thetasRef.current, target);
    const handle = handleRef.current;
    if (handle) rig.tcp.getWorldPosition(handle.position);
  });
  useEffect(() => {
    const dom = gl.domElement;
    const tcpObj = rig.tcp;
    const shoulderObj = rig.shoulder;
    const partEntries = Object.entries(rig.parts) as [PartKey, THREE.Object3D][];
    const partRootList = partEntries.map(([, root]) => root);

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const tcpWorld = new THREE.Vector3();
    const camDir = new THREE.Vector3();
    const hit = new THREE.Vector3();
    const shoulderPos = new THREE.Vector3();
    const reachDir = new THREE.Vector3();

    const pointerNdc = (e: PointerEvent) => {
      const rect = dom.getBoundingClientRect();
      ndc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      return rect;
    };

    const tcpScreenDistance = (e: PointerEvent) => {
      const rect = dom.getBoundingClientRect();
      tcpObj.getWorldPosition(tcpWorld).project(camera);
      const sx = (tcpWorld.x * 0.5 + 0.5) * rect.width;
      const sy = (-tcpWorld.y * 0.5 + 0.5) * rect.height;
      return Math.hypot(e.clientX - rect.left - sx, e.clientY - rect.top - sy);
    };
    const findPartKey = (obj: THREE.Object3D): PartKey | null => {
      let cur: THREE.Object3D | null = obj;
      while (cur) {
        const entry = partEntries.find(([, root]) => root === cur);
        if (entry) return entry[0];
        cur = cur.parent;
      }
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (tcpScreenDistance(e) > GRAB_THRESHOLD_PX) return;
      tcpObj.getWorldPosition(tcpWorld);
      camera.getWorldDirection(camDir);
      dragRef.current.plane.setFromNormalAndCoplanarPoint(camDir, tcpWorld);
      dragRef.current.active = true;

      if (ikTargetRef.current) ikTargetRef.current.copy(tcpWorld);
      else ikTargetRef.current = tcpWorld.clone();

      if (controlsRef.current) controlsRef.current.enabled = false;
      dom.setPointerCapture(e.pointerId);
      dom.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragRef.current.active) {
        if (tcpScreenDistance(e) <= GRAB_THRESHOLD_PX) {
          dom.style.cursor = 'grab';
          onHoverItems([]);
          return;
        }
        pointerNdc(e);
        raycaster.setFromCamera(ndc, camera);
        const hits = raycaster.intersectObjects(partRootList, true);
        let keys: string[] = [];
        if (hits.length > 0) {
          const partKey = findPartKey(hits[0].object);
          if (partKey) {
            keys = ANNOTATION_ITEMS.filter((it) => it.parts.includes(partKey)).map((it) => it.key);
          }
        }
        dom.style.cursor = keys.length > 0 ? 'pointer' : '';
        onHoverItems(keys);
        return;
      }

      pointerNdc(e);
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(dragRef.current.plane, hit)) return;
      shoulderObj.getWorldPosition(shoulderPos);
      reachDir.copy(hit).sub(shoulderPos);
      const len = reachDir.length();
      const clamped = THREE.MathUtils.clamp(len, MIN_REACH, ARM_MAX_REACH);
      hit.copy(shoulderPos).addScaledVector(reachDir.normalize(), clamped);
      hit.y = Math.max(hit.y, FLOOR_Y);
      ikTargetRef.current?.copy(hit);
    };

    const endDrag = (e: PointerEvent) => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      if (controlsRef.current) controlsRef.current.enabled = true;
      if (dom.hasPointerCapture(e.pointerId)) dom.releasePointerCapture(e.pointerId);
      dom.style.cursor = '';
    };

    const onPointerLeave = () => {
      dom.style.cursor = '';
      onHoverItems([]);
    };

    dom.addEventListener('pointerdown', onPointerDown, true);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', endDrag);
    dom.addEventListener('pointercancel', endDrag);
    dom.addEventListener('pointerleave', onPointerLeave);
    return () => {
      dom.removeEventListener('pointerdown', onPointerDown, true);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', endDrag);
      dom.removeEventListener('pointercancel', endDrag);
      dom.removeEventListener('pointerleave', onPointerLeave);
    };
  }, [gl, camera, rig, controlsRef, ikTargetRef, onHoverItems]);

  return (
    <>
      {}
      <group rotation={[-Math.PI / 2, 0, 0]} scale={ROBOT_SCALE}>
        <primitive object={rig.root} />
      </group>
      <mesh ref={handleRef} renderOrder={999}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial color="#9ca3af" depthTest={false} transparent opacity={0.5} />
      </mesh>
      <ArmLabelProjector rig={rig} refsMapRef={overlayRefsRef} items={ANNOTATION_ITEMS} />
    </>
  );
}

export default function RobotArmViewer() {
  const [ready, setReady] = useState(false);
  const [hoverItems, setHoverItems] = useState<string[]>([]);
  const hoverKeyRef = useRef('');
  const thetasRef = useRef<number[]>([...INITIAL_THETAS]);
  const ikTargetRef = useRef<THREE.Vector3 | null>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const overlayRefsRef = useRef<OverlayRefsMap>(new Map());
  const handleHoverItems = useCallback((keys: string[]) => {
    const k = keys.join('|');
    if (hoverKeyRef.current === k) return;
    hoverKeyRef.current = k;
    setHoverItems(keys);
  }, []);

  return (
    <div className="relative h-full w-full">
      <Canvas camera={{ position: [5.2, 3.6, 5.2], fov: 45 }}>
        <color attach="background" args={['#e9edf2']} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[10, 10, 5]} intensity={1.1} />
        <Suspense fallback={null}>
          <RobotArm
            thetasRef={thetasRef}
            ikTargetRef={ikTargetRef}
            controlsRef={controlsRef}
            overlayRefsRef={overlayRefsRef}
            hoverItems={hoverItems}
            onHoverItems={handleHoverItems}
            onReady={() => setReady(true)}
          />
        </Suspense>
        <OrbitControls ref={controlsRef} target={[1.0, 1.5, 0]} makeDefault />
      </Canvas>

      <LabelsOverlay
        items={ANNOTATION_ITEMS}
        refsMapRef={overlayRefsRef}
        hoverItems={hoverItems}
        onHoverItems={handleHoverItems}
      />

      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">Loading robot arm model...</div>
      )}

      <HintBox hintLabel="Controls">
        <p>Drag with the left mouse button: rotate view</p>
        <p>Mouse wheel: zoom view</p>
        <p>Drag the end-effector sphere to adjust the pose</p>
        <p>Hover robot parts or labels to highlight matching components</p>
      </HintBox>
    </div>
  );
}
