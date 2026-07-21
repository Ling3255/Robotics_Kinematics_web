'use client';

// 机械臂 GLB 模型与 DH 装配参数来源：https://github.com/ual-arm/robodimm （MIT License）
// 网格按其“驱动关节支点框架”建模（home 姿态方向、原点为关节支点），与 robodimm 的
// joint_body_transforms[i] = T_{i-1}·RotZ(θ_i) 对应；运行时世界旋转 = R_i(q)·R_home_i^T。
// 实现方式：每个关节拆成嵌套两组 rotG(变位 RotZ) → offG(常量 d/a/alpha)，
// 连杆 i 以常量局部旋转 R_home_i^T 挂到 rotG[i] 下。

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { GLTFLoader, type OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';

const MESH_URLS = [
  '/meshes/irb4600/IRB4600_20kg-250_BASE.glb',
  '/meshes/irb4600/IRB4600_20kg-250_LINK1.glb',
  '/meshes/irb4600/IRB4600_20kg-250_LINK2.glb',
  '/meshes/irb4600/IRB4600_20kg-250_LINK3.glb',
  '/meshes/irb4600/IRB4600_20kg-250_LINK4.glb',
  '/meshes/irb4600/IRB4600_20kg-250_LINK5.glb',
  '/meshes/irb4600/IRB4600_20kg-250_LINK6.glb',
];

/** 标准 DH 关节参数（取自 robodimm irb4600Serial6Spec），A = RotZ(θ+offset)·TransZ(d)·TransX(a)·RotX(alpha) */
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

/** 世界坐标系（缩放后）下的可达范围钳制 */
const ARM_MAX_REACH = (1.095 + 0.175 + 1.2305 + 0.085) * ROBOT_SCALE * 0.98;
const MIN_REACH = 1.0;
const FLOOR_Y = 0.15;

const IK_ITERATIONS = 10;
const IK_TOLERANCE = 0.02;
const IK_MAX_STEP = 0.3;
const GRAB_THRESHOLD_PX = 48;

/** 悬浮高亮的发光颜色（与标签红一致） */
const HIGHLIGHT_EMISSIVE = 0xdc2626;
const HIGHLIGHT_INTENSITY = 0.5;

/** 可悬浮的模型部件 */
type PartKey = 'base' | 'link1' | 'link2' | 'link3' | 'link4' | 'link5' | 'link6';

/** Joint/Link 教学标注：锚点取关节支点（或两支点中点），parts 为悬浮高亮关联的模型部件 */
interface AnnotationItem {
  key: string;
  title: string;
  sub: string;
  rank: number;
  anchor: { kind: 'joint'; index: number } | { kind: 'mid'; a: number; b: number };
  parts: PartKey[];
}

const ANNOTATION_ITEMS: AnnotationItem[] = [
  { key: 'j1', title: 'Joint', sub: '基座回转 Base J1', rank: 4, anchor: { kind: 'mid', a: 0, b: 1 }, parts: ['base', 'link1'] },
  { key: 'j2', title: 'Joint', sub: '肩关节 Shoulder J2', rank: 3, anchor: { kind: 'joint', index: 1 }, parts: ['link2'] },
  { key: 'upperarm', title: 'Link', sub: '大臂 Upper arm', rank: 1, anchor: { kind: 'mid', a: 1, b: 2 }, parts: ['link2'] },
  { key: 'j3', title: 'Joint', sub: '肘关节 Elbow J3', rank: 0, anchor: { kind: 'joint', index: 2 }, parts: ['link3'] },
  { key: 'forearm', title: 'Link', sub: '小臂 Forearm', rank: 2, anchor: { kind: 'mid', a: 3, b: 4 }, parts: ['link4'] },
  { key: 'wrist', title: 'Joint', sub: '腕关节 Wrist J4-J6', rank: 5, anchor: { kind: 'joint', index: 4 }, parts: ['link5', 'link6'] },
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

/** 标准 DH 齐次变换矩阵 */
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

/** θ 空间 CCD：逐关节把 TCP 拉向 targetWorld（joints[i] 即关节 i 的支点：原点与 z 轴均正确） */
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

      // 把 支点→TCP 与 支点→目标 投影到垂直关节轴的平面
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

/** 每帧把标注锚点投影到屏幕，并直接写入 SVG 元素属性（不经 React state） */
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

/** 标注覆盖层：版式与左侧人物一致；标签可悬浮（pointerEvents auto）反向高亮模型部件 */
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
  /** 每关节的旋转组（支点=其原点，轴=其 z 轴） */
  joints: THREE.Group[];
  /** 末端（法兰）对象 */
  tcp: THREE.Object3D;
  /** 肩关节（J2 支点），用于可达范围钳制 */
  shoulder: THREE.Object3D;
  /** 可悬浮的部件根（基座 + 6 根连杆的克隆体） */
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

    // 每个关节拆成两个嵌套组：rotG(变位 RotZ，原点与 z 轴即关节支点) → offG(常量 d/a/alpha 偏移)
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

    // home(q=0) 时 rotG 的世界旋转 R_home_i → 连杆网格的常量补偿旋转 R_home_i^T
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

    // BASE 挂根；LINK i 以常量旋转 R_home_i^T 挂到关节旋转组 i
    // 注意必须 clone(true)：StrictMode 下 useMemo 会执行两次，直接 add 同一个
    // gltf.scene 会被后一个 rig 抢走（Object3D.add 自动从旧父级移除），导致渲染的是空壳
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

  // 悬浮高亮：hoverItems 并集对应的部件自发光，清空时恢复原材质
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

  // 每帧：跟踪 IK 目标点；手柄小球同步到 TCP
  useFrame(() => {
    const target = ikTargetRef.current;
    if (target) solveCcd(rig.joints, rig.tcp, rig.applyThetas, thetasRef.current, target);
    const handle = handleRef.current;
    if (handle) rig.tcp.getWorldPosition(handle.position);
  });

  // 指针交互（capture 阶段注册，保证先于 OrbitControls 处理 pointerdown）
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

    // 命中对象向上找所属部件根
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

      // 拖拽平面：过 TCP、法线为相机视线方向
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
        // 靠近 TCP 手柄时优先抓取光标
        if (tcpScreenDistance(e) <= GRAB_THRESHOLD_PX) {
          dom.style.cursor = 'grab';
          onHoverItems([]);
          return;
        }
        // 悬浮部件检测：高亮模型部件 + 强调关联标签
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

      // 以肩关节为球心钳制目标距离，并保持在地面以上
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
      {/* CAD 数据为 Z-up：整体绕 X 转 -90° 转为 Y-up，并放大到与左侧人物相衬的尺寸 */}
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

  // pointermove 每帧都会上报，内容相同则不触发重渲染
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
        <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
          机械臂模型加载中…
        </div>
      )}

      <div className="absolute left-4 top-4 z-10 rounded-lg bg-white/90 px-3 py-2 text-xs leading-5 text-gray-600 shadow-lg backdrop-blur">
        <p>按住鼠标左键拖动：旋转视角</p>
        <p>滚轮：缩放视角</p>
        <p>按住机械臂末端小球拖动：改变姿态</p>
        <p>悬浮机械臂部件或标签：高亮对应部分</p>
      </div>
    </div>
  );
}
