'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { FBXLoader, SkeletonUtils, type OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import RobotArmViewer from './RobotArmViewer';

interface JointData {
  bone: THREE.Bone;
  initRotation: THREE.Euler;
}

const CUSTOM_ACTION_DURATION = 3;
const CUSTOM_ACTION_START: Record<string, { x: number; y: number; z: number }> = {
  mixamorigLeftArm: { x: 80, y: -40, z: 0 },
  mixamorigLeftForeArm: { x: 0, y: -40, z: 0 },
  mixamorigRightArm: { x: 80, y: 40, z: 0 },
  mixamorigRightForeArm: { x: 0, y: 40, z: 0 },
};
const CUSTOM_ACTION_END: Record<string, { x: number; y: number; z: number }> = {
  mixamorigLeftArm: { x: 80, y: -40, z: 45 },
  mixamorigLeftForeArm: { x: 0, y: 0, z: 90 },
};

const DANCE_SECONDS = 5;
const BLEND_SECONDS = 2;
const LABEL_FADE_SECONDS = 1;

type TimelinePhase = 'dancing' | 'blending' | 'holding';
interface TimelineState {
  phase: TimelinePhase;
  elapsed: number;
  labelOpacity: number;
}

function buildCustomClip(joints: Map<string, JointData>): THREE.AnimationClip {
  const tracks: THREE.KeyframeTrack[] = [];
  const euler = new THREE.Euler();
  const q0 = new THREE.Quaternion();
  const q1 = new THREE.Quaternion();

  for (const [name, start] of Object.entries(CUSTOM_ACTION_START)) {
    const joint = joints.get(name);
    if (!joint) continue;
    const end = CUSTOM_ACTION_END[name] ?? start;

    q0.setFromEuler(
      euler.set(
        joint.initRotation.x + THREE.MathUtils.degToRad(start.x),
        joint.initRotation.y + THREE.MathUtils.degToRad(start.y),
        joint.initRotation.z + THREE.MathUtils.degToRad(start.z),
      ),
    );
    q1.setFromEuler(
      euler.set(
        joint.initRotation.x + THREE.MathUtils.degToRad(end.x),
        joint.initRotation.y + THREE.MathUtils.degToRad(end.y),
        joint.initRotation.z + THREE.MathUtils.degToRad(end.z),
      ),
    );

    tracks.push(
      new THREE.QuaternionKeyframeTrack(
        `${name}.quaternion`,
        [0, CUSTOM_ACTION_DURATION],
        [q0.x, q0.y, q0.z, q0.w, q1.x, q1.y, q1.z, q1.w],
      ),
    );
  }

  return new THREE.AnimationClip('custom-action', CUSTOM_ACTION_DURATION, tracks);
}

interface AnnotationItem {
  key: string;
  title: string;
  sub: string;
  rank: number;
  bone?: string;
  from?: string;
  to?: string;
}

interface OverlayEntry {
  dot: SVGCircleElement | null;
  line: SVGPolylineElement | null;
  label: SVGGElement | null;
}

type OverlayRefsMap = Map<string, OverlayEntry>;

const ANNOTATION_ROW_GAP = 48;
const ANNOTATION_COL_OFFSET = 120;
const ANNOTATION_LEADER_MAX = 80;
const ANNOTATION_ITEMS: AnnotationItem[] = [
  { key: 'wrist', title: 'Joint', sub: '腕关节 Wrist', bone: 'mixamorigLeftHand', rank: 4 },
  {
    key: 'forearm',
    title: 'Link',
    sub: '小臂 Radius/Ulna',
    from: 'mixamorigLeftForeArm',
    to: 'mixamorigLeftHand',
    rank: 3,
  },
  { key: 'elbow', title: 'Joint', sub: '肘关节 Elbow', bone: 'mixamorigLeftForeArm', rank: 2 },
  {
    key: 'upperarm',
    title: 'Link',
    sub: '大臂 Humerus',
    from: 'mixamorigLeftArm',
    to: 'mixamorigLeftForeArm',
    rank: 1,
  },
  { key: 'shoulder', title: 'Joint', sub: '肩关节 Shoulder', bone: 'mixamorigLeftArm', rank: 0 },
];
const TMP_A = new THREE.Vector3();
const TMP_B = new THREE.Vector3();

interface IkState {
  hasDragged: boolean;
  target: THREE.Vector3; // 世界坐标
}

const IK_BONES = {
  upperArm: 'mixamorigLeftArm',
  foreArm: 'mixamorigLeftForeArm',
  hand: 'mixamorigLeftHand',
} as const;
const IK_ITERATIONS = 8;
const GRAB_THRESHOLD_PX = 48;
const MIN_REACH = 0.2;
const REACH_MARGIN = 0.98;

const IK_V1 = new THREE.Vector3();
const IK_V2 = new THREE.Vector3();
const IK_V3 = new THREE.Vector3();
const IK_Q1 = new THREE.Quaternion();
const IK_Q2 = new THREE.Quaternion();
const IK_Q3 = new THREE.Quaternion();

/** 迷你 CCD IK：把腕部（hand）迭代拉向 targetWorld，只旋转肘、肩两根骨骼 */
function solveArmIk(
  upperArm: THREE.Bone,
  foreArm: THREE.Bone,
  hand: THREE.Bone,
  targetWorld: THREE.Vector3,
) {
  for (let i = 0; i < IK_ITERATIONS; i++) {
    for (const bone of [foreArm, upperArm]) {
      if (!bone.parent) continue;

      bone.getWorldPosition(IK_V1);
      hand.getWorldPosition(IK_V2).sub(IK_V1); // 骨骼 → 腕当前位置
      IK_V3.copy(targetWorld).sub(IK_V1); // 骨骼 → 目标位置
      if (IK_V2.lengthSq() < 1e-10 || IK_V3.lengthSq() < 1e-10) continue;
      IK_V2.normalize();
      IK_V3.normalize();

      IK_Q1.setFromUnitVectors(IK_V2, IK_V3); // 世界空间修正旋转
      bone.getWorldQuaternion(IK_Q2);
      IK_Q3.copy(IK_Q1).multiply(IK_Q2); // 骨骼新的世界四元数
      bone.parent.getWorldQuaternion(IK_Q2);
      bone.quaternion.copy(IK_Q2.invert().multiply(IK_Q3)); // 转回局部空间
    }
  }
}

function Model({
  replayTick,
  overlayRefsRef,
  timelineStateRef,
  ikStateRef,
  controlsRef,
}: {
  replayTick: number;
  overlayRefsRef: { current: OverlayRefsMap };
  timelineStateRef: { current: TimelineState };
  ikStateRef: { current: IkState };
  controlsRef: { current: OrbitControlsImpl | null };
}) {
  const fbx = useLoader(FBXLoader, '/Silly Dancing.fbx');
  const clonedFbx = useMemo(() => SkeletonUtils.clone(fbx), [fbx]);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const clipRef = useRef<THREE.AnimationClip | null>(null);
  const customClipRef = useRef<THREE.AnimationClip | null>(null);
  const customActionRef = useRef<THREE.AnimationAction | null>(null);
  const solveIKRef = useRef<(() => void) | null>(null);

  const scale = useMemo(() => {
    const box = new THREE.Box3().setFromObject(clonedFbx);
    const size = box.getSize(new THREE.Vector3());
    return size.y > 0 ? 5 / size.y : 1;
  }, [clonedFbx]);

  const jointMap = useMemo(() => {
    const joints = new Map<string, JointData>();
    clonedFbx.traverse((obj) => {
      if ((obj as THREE.Bone).isBone) {
        const bone = obj as THREE.Bone;
        joints.set(bone.name, { bone, initRotation: bone.rotation.clone() });
      }
    });
    return joints;
  }, [clonedFbx]);

  useEffect(() => {
    const clip = clonedFbx.animations.reduce<THREE.AnimationClip | null>(
      (best, current) => (current.tracks.length > (best?.tracks.length ?? -1) ? current : best),
      null,
    );
    clipRef.current = clip;
    if (clip) {
      mixerRef.current = new THREE.AnimationMixer(clonedFbx);
      customClipRef.current = buildCustomClip(jointMap);
    }

    return () => {
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;
      clipRef.current = null;
      customClipRef.current = null;
      customActionRef.current = null;
    };
  }, [clonedFbx, jointMap]);

  useEffect(() => {
    const mixer = mixerRef.current;
    const clip = clipRef.current;
    const customClip = customClipRef.current;

    if (!mixer || !clip || !customClip) return;

    mixer.stopAllAction();
    jointMap.forEach(({ bone, initRotation }) => {
      bone.rotation.copy(initRotation);
    });

    timelineStateRef.current = { phase: 'dancing', elapsed: 0, labelOpacity: 0 };
    ikStateRef.current.hasDragged = false;

    const danceAction = mixer.clipAction(clip);
    const customAction = mixer.clipAction(customClip);
    customActionRef.current = customAction;

    danceAction.reset().setLoop(THREE.LoopRepeat, Infinity).play();
    customAction.reset().setLoop(THREE.LoopOnce, 1).stop();
    customAction.clampWhenFinished = true;
  }, [replayTick, jointMap, timelineStateRef, ikStateRef]);

  useFrame((_, delta) => {
    const mixer = mixerRef.current;
    const clip = clipRef.current;
    const customAction = customActionRef.current;
    const state = timelineStateRef.current;

    if (!mixer) return;

    state.elapsed += delta;

    if (state.phase === 'dancing') {
      mixer.update(delta);
      if (state.elapsed >= DANCE_SECONDS) {
        state.phase = 'blending';
        state.elapsed = 0;
        if (clip && customAction) {
          const danceAction = mixer.clipAction(clip);
          customAction.reset().play();
          danceAction.crossFadeTo(customAction, BLEND_SECONDS, false);
        }
      }
      return;
    }

    if (state.phase === 'blending') {
      mixer.update(delta);
      if (state.elapsed >= BLEND_SECONDS) {
        state.phase = 'holding';
        state.elapsed = 0;
      }
      return;
    }

    mixer.update(delta);
    solveIKRef.current?.();
    state.labelOpacity =
      state.elapsed <= LABEL_FADE_SECONDS ? Math.min(state.elapsed / LABEL_FADE_SECONDS, 1) : 1;
  });

  return (
    <>
      <primitive object={clonedFbx} scale={scale} />
      <LabelProjector jointMap={jointMap} refsMapRef={overlayRefsRef} items={ANNOTATION_ITEMS} />
      <HandDragIK
        jointMap={jointMap}
        timelineStateRef={timelineStateRef}
        ikStateRef={ikStateRef}
        controlsRef={controlsRef}
        solveIKRef={solveIKRef}
      />
    </>
  );
}

function HandDragIK({
  jointMap,
  timelineStateRef,
  ikStateRef,
  controlsRef,
  solveIKRef,
}: {
  jointMap: Map<string, JointData>;
  timelineStateRef: { current: TimelineState };
  ikStateRef: { current: IkState };
  controlsRef: { current: OrbitControlsImpl | null };
  solveIKRef: { current: (() => void) | null };
}) {
  const { camera, gl } = useThree();
  const handleRef = useRef<THREE.Mesh | null>(null);
  const dragRef = useRef({ active: false, plane: new THREE.Plane(), maxReach: 1 });

  const upperArm = jointMap.get(IK_BONES.upperArm)?.bone ?? null;
  const foreArm = jointMap.get(IK_BONES.foreArm)?.bone ?? null;
  const hand = jointMap.get(IK_BONES.hand)?.bone ?? null;

  // 向 Model 注册求解器：holding 阶段且拖拽过后，每帧在 mixer.update 之后求解
  useEffect(() => {
    if (!upperArm || !foreArm || !hand) return;
    solveIKRef.current = () => {
      const state = timelineStateRef.current;
      const ik = ikStateRef.current;
      if (state.phase !== 'holding' || !ik.hasDragged) return;
      solveArmIk(upperArm, foreArm, hand, ik.target);
    };
    return () => {
      solveIKRef.current = null;
    };
  }, [solveIKRef, timelineStateRef, ikStateRef, upperArm, foreArm, hand]);

  // 手柄小球同步到腕骨，仅 holding 阶段可见
  useFrame(() => {
    const handle = handleRef.current;
    if (!handle || !hand) return;
    hand.getWorldPosition(handle.position);
    handle.visible = timelineStateRef.current.phase === 'holding';
  });

  // 指针拖拽交互
  useEffect(() => {
    const dom = gl.domElement;
    if (!upperArm || !foreArm || !hand) return;

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const wristWorld = new THREE.Vector3();
    const camDir = new THREE.Vector3();
    const hit = new THREE.Vector3();
    const shoulderPos = new THREE.Vector3();
    const reachDir = new THREE.Vector3();

    const wristScreenDistance = (e: PointerEvent) => {
      const rect = dom.getBoundingClientRect();
      hand.getWorldPosition(wristWorld).project(camera);
      const sx = (wristWorld.x * 0.5 + 0.5) * rect.width;
      const sy = (-wristWorld.y * 0.5 + 0.5) * rect.height;
      return Math.hypot(e.clientX - rect.left - sx, e.clientY - rect.top - sy);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (timelineStateRef.current.phase !== 'holding') return;
      if (wristScreenDistance(e) > GRAB_THRESHOLD_PX) return;

      // 拖拽平面：过腕点、法线为相机视线方向
      hand.getWorldPosition(wristWorld);
      camera.getWorldDirection(camDir);
      dragRef.current.plane.setFromNormalAndCoplanarPoint(camDir, wristWorld);
      dragRef.current.active = true;

      // 臂展上限 =（肩→肘 + 肘→腕）× 余量系数
      upperArm.getWorldPosition(shoulderPos);
      foreArm.getWorldPosition(hit);
      const upperLen = shoulderPos.distanceTo(hit);
      const foreLen = hit.distanceTo(wristWorld);
      dragRef.current.maxReach = (upperLen + foreLen) * REACH_MARGIN;

      ikStateRef.current.target.copy(wristWorld);
      ikStateRef.current.hasDragged = true;

      if (controlsRef.current) controlsRef.current.enabled = false;
      dom.setPointerCapture(e.pointerId);
      dom.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragRef.current.active) {
        dom.style.cursor =
          timelineStateRef.current.phase === 'holding' && wristScreenDistance(e) <= GRAB_THRESHOLD_PX
            ? 'grab'
            : '';
        return;
      }

      const rect = dom.getBoundingClientRect();
      ndc.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(ndc, camera);
      if (!raycaster.ray.intersectPlane(dragRef.current.plane, hit)) return;

      // 以肩为圆心钳制目标距离
      upperArm.getWorldPosition(shoulderPos);
      reachDir.copy(hit).sub(shoulderPos);
      const len = reachDir.length();
      const clamped = Math.min(Math.max(len, MIN_REACH), dragRef.current.maxReach);
      ikStateRef.current.target.copy(shoulderPos).addScaledVector(reachDir.normalize(), clamped);
    };

    const endDrag = (e: PointerEvent) => {
      if (!dragRef.current.active) return;
      dragRef.current.active = false;
      if (controlsRef.current) controlsRef.current.enabled = true;
      if (dom.hasPointerCapture(e.pointerId)) dom.releasePointerCapture(e.pointerId);
      dom.style.cursor = '';
    };

    // capture 阶段注册，保证先于 OrbitControls 处理 pointerdown
    dom.addEventListener('pointerdown', onPointerDown, true);
    dom.addEventListener('pointermove', onPointerMove);
    dom.addEventListener('pointerup', endDrag);
    dom.addEventListener('pointercancel', endDrag);
    return () => {
      dom.removeEventListener('pointerdown', onPointerDown, true);
      dom.removeEventListener('pointermove', onPointerMove);
      dom.removeEventListener('pointerup', endDrag);
      dom.removeEventListener('pointercancel', endDrag);
    };
  }, [gl, camera, timelineStateRef, ikStateRef, controlsRef, upperArm, foreArm, hand]);

  return (
    <mesh ref={handleRef} visible={false} renderOrder={999}>
      <sphereGeometry args={[0.15, 16, 16]} />
      <meshBasicMaterial color="#9ca3af" depthTest={false} transparent opacity={0.5} />
    </mesh>
  );
}

function LabelProjector({
  jointMap,
  refsMapRef,
  items,
}: {
  jointMap: Map<string, JointData>;
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

      if (item.bone) {
        const joint = jointMap.get(item.bone);
        if (!joint) continue;
        joint.bone.updateWorldMatrix(true, false);
        joint.bone.getWorldPosition(v);
      } else if (item.from && item.to) {
        const a = jointMap.get(item.from);
        const b = jointMap.get(item.to);
        if (!a || !b) continue;
        a.bone.updateWorldMatrix(true, false);
        b.bone.updateWorldMatrix(true, false);
        a.bone.getWorldPosition(TMP_A);
        b.bone.getWorldPosition(TMP_B);
        v.lerpVectors(TMP_A, TMP_B, 0.5);
      } else {
        continue;
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

function LabelsOverlay({
  items,
  refsMapRef,
  timelineStateRef,
}: {
  items: AnnotationItem[];
  refsMapRef: { current: OverlayRefsMap };
  timelineStateRef: { current: TimelineState };
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const setRef =
    (key: string, part: 'dot' | 'line' | 'label') =>
    (el: SVGCircleElement | SVGPolylineElement | SVGGElement | null) => {
      const entry = refsMapRef.current.get(key) ?? { dot: null, line: null, label: null };
      entry[part] = el as never;
      refsMapRef.current.set(key, entry);
    };

  useEffect(() => {
    let rafId: number;
    const updateOpacity = () => {
      if (containerRef.current) {
        containerRef.current.style.opacity = `${timelineStateRef.current.labelOpacity}`;
      }
      rafId = requestAnimationFrame(updateOpacity);
    };
    rafId = requestAnimationFrame(updateOpacity);
    return () => cancelAnimationFrame(rafId);
  }, [timelineStateRef]);

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 z-[5] select-none" style={{ opacity: 0 }}>
      <svg className="h-full w-full">
        {items.map((item) => (
          <g key={item.key}>
            <polyline ref={setRef(item.key, 'line')} fill="none" stroke="#4b5563" strokeWidth={1} />
            <g ref={setRef(item.key, 'label')}>
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
        ))}
      </svg>
    </div>
  );
}

function CameraSetup() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(-2, 3, 8);
    camera.lookAt(-1, 2, 0);
  }, [camera]);

  return null;
}

export default function FbxViewer() {
  const [replayTick, setReplayTick] = useState(0);
  const [hintsCollapsed, setHintsCollapsed] = useState(false);
  const overlayRefsRef = useRef<OverlayRefsMap>(new Map());
  const timelineStateRef = useRef<TimelineState>({
    phase: 'dancing',
    elapsed: 0,
    labelOpacity: 0,
  });
  const ikStateRef = useRef<IkState>({ hasDragged: false, target: new THREE.Vector3() });
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  return (
    <div className="relative h-full w-full">
      <div className="flex h-full w-full">
        <div className="relative h-full w-1/2">
          <Canvas>
            <CameraSetup />
            <ambientLight intensity={0.5} />
            <directionalLight position={[10, 10, 5]} intensity={1} />
            <Model
              replayTick={replayTick}
              overlayRefsRef={overlayRefsRef}
              timelineStateRef={timelineStateRef}
              ikStateRef={ikStateRef}
              controlsRef={controlsRef}
            />
            <OrbitControls ref={controlsRef} target={[-1, 2, 0]} />
          </Canvas>

          <LabelsOverlay
            items={ANNOTATION_ITEMS}
            refsMapRef={overlayRefsRef}
            timelineStateRef={timelineStateRef}
          />

          <div className="absolute left-4 top-4 z-10 flex flex-col items-start gap-2">
            <button
              onClick={() => setReplayTick((n) => n + 1)}
              className="rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-gray-700 shadow-lg backdrop-blur hover:bg-white"
            >
              重新播放
            </button>
            {hintsCollapsed ? (
              <button
                onClick={() => setHintsCollapsed(false)}
                className="rounded-lg bg-white/90 p-2 text-gray-500 shadow-lg backdrop-blur hover:bg-white hover:text-gray-700"
                aria-label="展开提示"
                title="操作提示"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </button>
            ) : (
              <div className="rounded-lg bg-white/90 px-3 py-2 text-xs leading-5 text-gray-600 shadow-lg backdrop-blur">
                <p>按住鼠标左键拖动：旋转视角</p>
                <p>Shift + 左键拖动：平移视角</p>
                <p>滚轮：缩放视角</p>
                <p>动画定格后，按住人物左手拖动：改变手臂姿势</p>
                <div className="mt-1 flex justify-end">
                  <button
                    onClick={() => setHintsCollapsed(true)}
                    className="text-gray-400 hover:text-gray-600"
                    aria-label="收起提示"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <path d="M5 12h14" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="relative h-full w-1/2 border-l-2 border-gray-300">
          <RobotArmViewer />
        </div>
      </div>
    </div>
  );
}
