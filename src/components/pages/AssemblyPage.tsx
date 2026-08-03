"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

const LABEL: Record<string, string> = {
  "asssemble - base-1": "Base", "asssemble - joints-1": "Joint 1", "asssemble - joints-2": "Joint 2", "asssemble - joints-3": "Joint 3",
  "asssemble - links-1": "Link 1", "asssemble - links-2": "Link 2", "asssemble - End effort-1": "End Effector",
};
const ORDER = ["asssemble - base-1","asssemble - joints-1","asssemble - links-1","asssemble - joints-2","asssemble - links-2","asssemble - joints-3","asssemble - End effort-1"];
const COLORS = ["#3b82f6","#f59e0b","#22c55e","#ef4444","#8b5cf6","#ec4899","#14b8a6"];
const IMG: Record<string, string> = {
  "asssemble - base-1": "/images/base-1.png", "asssemble - joints-1": "/images/joints-1.png", "asssemble - joints-2": "/images/joints-2.png", "asssemble - joints-3": "/images/joints-3.png",
  "asssemble - links-1": "/images/links-1.png", "asssemble - links-2": "/images/links-2.png", "asssemble - End effort-1": "/images/End effort-1.png",
};
const SNAP = 0.4;
useGLTF.preload("/models/assemble.glb");

const S = { mx: 0, my: 0, part: null as string | null, snap: false };
const CACHE = { g: new Map<string, THREE.BufferGeometry>(), q: new Map<string, THREE.Quaternion>(), s: new Map<string, THREE.Vector3>(), c: new Map<string, THREE.Color>() };

function Scene({ placed, onPlace, onWrongOrder }: { placed: Set<string>; onPlace: React.MutableRefObject<((n: string) => void) | null>; onWrongOrder: React.MutableRefObject<(() => void) | null> }) {

  const gltf = useGLTF("/models/assemble.glb");
  const { scene, camera } = useThree();
  const rc = useRef(new THREE.Raycaster());
  const pl = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.03));
  const meshRef = useRef<THREE.Mesh | null>(null);
  const last = useRef<string | null>(null);

  // 预创建预览 mesh（和红球测试一样）
  useEffect(() => {
    const g = new THREE.SphereGeometry(0.5, 16, 16);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: "red", roughness: 0.2, metalness: 0.3, transparent: true, opacity: 0.7 }));
    m.visible = false; m.renderOrder = 999; scene.add(m); meshRef.current = m;
    return () => { scene.remove(m); g.dispose(); (m.material as THREE.Material).dispose(); };
  }, [scene]);

  const items = useMemo(() => {
    gltf.scene.position.set(0, 0, 0); gltf.scene.updateMatrixWorld();
    const b = new THREE.Box3().setFromObject(gltf.scene);
    gltf.scene.position.set(0.6 - (b.min.x + b.max.x) / 2, 0.08 - b.min.y, 0.4 - (b.min.z + b.max.z) / 2);
    gltf.scene.updateMatrixWorld();
    const arr: { name: string; geo: THREE.BufferGeometry; mat: THREE.Material; pt: THREE.Vector3; qt: THREE.Quaternion }[] = [];
    gltf.scene.traverse(o => {
      const m = o as THREE.Mesh; if (!m.isMesh) return;
      const raw = m.name.replace(/[_\-\s.]+/g, "").toLowerCase();
      const match = ORDER.find(x => raw.includes(x.replace(/[_\-\s]+/g, "").toLowerCase()));
      const n = match || ORDER[0]; // fallback to first
      console.log("[MATCH]", m.name, "→", n);
      const wp = new THREE.Vector3(); m.getWorldPosition(wp);
      const wq = new THREE.Quaternion(); m.getWorldQuaternion(wq);
      const origColor = (m.material as THREE.MeshStandardMaterial).color.clone();
      CACHE.g.set(n, m.geometry); CACHE.q.set(n, wq); CACHE.s.set(n, wp); CACHE.c.set(n, origColor);
      arr.push({ name: n, geo: m.geometry, mat: (m.material as THREE.Material).clone(), pt: wp, qt: wq });
    });
    arr.sort((a, b) => ORDER.indexOf(a.name) - ORDER.indexOf(b.name));
    console.log("[ITEMS] count:", arr.length, "cache sizes:", CACHE.g.size, CACHE.q.size, CACHE.s.size);
    console.log("[ITEMS] cache keys:", [...CACHE.g.keys()]);
    return arr;
  }, [gltf]);

  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    // 松手 → 先检查放置（必须在更新 last.current 之前）
    if (!S.part && last.current) {
      const next = ORDER.find(n => !placed.has(n));
      if (S.snap && last.current === next) {
        onPlace.current?.(last.current);
      } else if (last.current !== next) {
        // 玩家没有按既定顺序拼装 → 触发红色 Toast 反馈
        onWrongOrder.current?.();
      }
      mesh.visible = false;
      last.current = null; S.snap = false;
    }


    // S.part 变了 → 切换几何体 + 显隐
    if (S.part !== last.current) {
      last.current = S.part;
      if (S.part) {
        const g = CACHE.g.get(S.part), q = CACHE.q.get(S.part);
        if (g && q) {
          mesh.geometry = g; mesh.quaternion.copy(q);
          const c = CACHE.c.get(S.part);
          const mat = mesh.material as THREE.MeshStandardMaterial;
          if (c) { mat.color.copy(c); mat.emissive?.copy(c); }
          mat.emissiveIntensity = 0.3;
          mat.roughness = 0.3; mat.metalness = 0.2;
          mat.opacity = 0.65; mat.transparent = true;
          mesh.visible = true; mesh.position.set(0, 5, 0);
        }
      }
    }

    if (!S.part || !mesh.visible) return;

    // 位置跟随鼠标 + 吸附检测
    rc.current.setFromCamera(new THREE.Vector2(S.mx, S.my), camera);
    const h = new THREE.Vector3();
    if (rc.current.ray.intersectPlane(pl.current, h)) {
      const pos = h.add(new THREE.Vector3(0, 0.04, 0));
      mesh.position.copy(pos);
      const nxt = ORDER.find(n => !placed.has(n));
      if (nxt === S.part) {
        const sock = CACHE.s.get(nxt);
        if (sock && new THREE.Vector2(pos.x - sock.x, pos.z - sock.z).length() < SNAP) {
          mesh.position.copy(sock.clone().add(new THREE.Vector3(0, 0.04, 0)));
          S.snap = true;
        } else S.snap = false;
      }
    }
  });

  return (<>
    <ambientLight intensity={0.9} />
    <directionalLight position={[5, 10, 5]} intensity={1.4} />
    <directionalLight position={[-3, 4, -3]} intensity={0.4} />
    <mesh position={[0, -0.04, 0]}><boxGeometry args={[20, 0.14, 14]} /><meshStandardMaterial color="#d1d5db" roughness={0.5} metalness={0.05} /></mesh>
    <mesh position={[0, 0.03, 0]}><boxGeometry args={[20.2, 0.03, 14.2]} /><meshStandardMaterial color="#9ca3af" roughness={0.3} metalness={0.15} /></mesh>
    <gridHelper args={[20, 20, "#e5e7eb", "#e5e7eb"]} position={[0, 0.05, 0]} />
    {items.map(item => {
      const ok = placed.has(item.name);
      const mat = item.mat as THREE.MeshStandardMaterial;
      if (ok) {
        mat.wireframe = false; mat.transparent = false; mat.opacity = 1;
        // 恢复原始颜色
        const orig = CACHE.c.get(item.name);
        if (orig) mat.color.copy(orig);
      } else {
        mat.wireframe = true; mat.transparent = true; mat.opacity = 0.3;
        mat.color.set("#64748b");
      }
      return <mesh key={item.name} geometry={item.geo} position={item.pt} quaternion={item.qt} material={mat} />;
    })}
    <OrbitControls enablePan enableZoom enableRotate minDistance={2.5} maxDistance={16} maxPolarAngle={Math.PI / 2.5} target={[0, 2, 0]} enabled />
  </>);
}

export default function Page() {
  const [placed, setPlaced] = useState<Set<string>>(new Set());
  const [hint, setHint] = useState("Hold a part image, drag to table, release on target.");
  const [showToast, setShowToast] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const onPlaceRef = useRef<(n: string) => void>(null);
  const onWrongOrderRef = useRef<(() => void) | null>(null);

  // 任务一：错误拼装（未按顺序）→ 触发红色 Toast，3 秒后自动消失
  useEffect(() => {
    onWrongOrderRef.current = () => {
      setShowToast(true);
    };
  }, []);

  useEffect(() => {
    if (!showToast) return;
    const t = setTimeout(() => setShowToast(false), 3000);
    return () => clearTimeout(t);
  }, [showToast]);

  // 任务二：全部拼装完成 → 触发绿色 Modal（需手动确认）
  useEffect(() => {
    if (placed.size === ORDER.length) {
      setShowModal(true);
    }
  }, [placed]);

  useEffect(() => {
    onPlaceRef.current = (name: string) => {
      setPlaced(prev => { const u = new Set(prev); u.add(name); return u; });
      const rem = ORDER.filter(x => x !== name && !placed.has(x));
      setHint(rem.length ? `Placed ${LABEL[name]}. Next: ${LABEL[rem[0]]}` : "Complete!");
    };
  }, [placed]);


  useEffect(() => {
    const mv = (e: MouseEvent) => {
      const c = document.getElementById("cvs"); if (!c) return;
      const r = c.getBoundingClientRect();
      S.mx = ((e.clientX - r.left) / r.width) * 2 - 1;
      S.my = -((e.clientY - r.top) / r.height) * 2 + 1;
    };
    const up = () => { if (S.part) { if (!S.snap) setHint("Missed. Try again."); S.part = null; } };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, []);

  return (<div className="flex flex-col h-[calc(100vh-112px)]" onContextMenu={e => e.preventDefault()}>
    <div className="flex items-center gap-3 px-8 pt-5 pb-3">
      <span className="px-4 py-2 text-[13px] font-medium rounded-lg bg-slate-800 text-white">Assemble the Robot Arm</span>
      <span className="flex-1" />
      <button onClick={() => { setPlaced(new Set(ORDER)); setHint("Auto!"); }} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 cursor-pointer">Auto</button>
      <button onClick={() => { setPlaced(new Set()); setHint("Hold & drag."); }} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer">Reset</button>
    </div>
    <div className="flex-1 flex gap-5 px-8 pb-4 min-h-0">
      <div className="w-[220px] shrink-0 bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-4 overflow-y-auto">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Parts</p>
        {[{ label: "Base", items: [ORDER[0]] }, { label: "Joints", items: [ORDER[1], ORDER[3], ORDER[5]] }, { label: "Links", items: [ORDER[2], ORDER[4]] }, { label: "End Effector", items: [ORDER[6]] }].map(g => (<div key={g.label} className="flex flex-col gap-1.5">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{g.label}</span>
          <div className="flex flex-col gap-1.5">{g.items.map(n => {
            const d = placed.has(n);
            return (<div key={n} onMouseDown={e => { if (e.button === 0 && !d) { e.preventDefault(); S.part = n; S.snap = false; setHint(`Dragging ${LABEL[n]}...`); } }}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl border-2 transition-all select-none cursor-pointer ${d ? "border-emerald-200 bg-emerald-50/50" : "border-slate-100 bg-slate-50 hover:border-slate-300 active:border-blue-400 active:bg-blue-50"}`}>
              <div className="w-full aspect-[4/3] flex items-center justify-center bg-white/50 rounded-lg">
                <img src={IMG[n]} alt={LABEL[n]} className="max-w-full max-h-full object-contain pointer-events-none" style={{ mixBlendMode: "multiply" }} draggable={false} />
              </div>
              <span className={`text-[11px] font-medium text-center ${d ? "text-emerald-500" : "text-slate-600"}`}>{LABEL[n]}</span>
            </div>);
          })}</div>
        </div>))}
      </div>
      <div id="cvs" className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Canvas camera={{ position: [0, 7, -9], fov: 50, near: 0.5, far: 200 }} gl={{ antialias: true }} style={{ background: "#f8fafc" }}>
          <Scene placed={placed} onPlace={onPlaceRef} onWrongOrder={onWrongOrderRef} />
        </Canvas>
      </div>
    </div>
    <div className="h-14 bg-white border-t border-slate-200 flex items-center px-5 gap-3">
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex-shrink-0">Hint</span>
      <span className="text-[13px] text-slate-500 truncate flex-1">{hint}</span>
      <span className="text-[11px] text-slate-400">{placed.size}/{ORDER.length} placed</span>
    </div>

    {/* 任务一：错误拼装红色 Toast（3 秒自动消失） */}
    {showToast && (
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div className="px-5 py-3 rounded-xl bg-red-500 text-white text-sm font-medium shadow-lg shadow-red-500/30 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Please follow the order.
        </div>
      </div>
    )}

    {/* 任务二：全部拼装完成绿色 Modal（需手动确认） */}
    {showModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="mx-4 max-w-md w-full rounded-2xl bg-white p-8 shadow-2xl text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Assembly Complete</h3>
          <p className="text-sm text-slate-500 leading-relaxed mb-6">You've successfully assembled the robot arm—take a close look at its structure!</p>
          <button onClick={() => setShowModal(false)} className="px-6 py-2.5 rounded-lg bg-green-500 text-white text-sm font-medium hover:bg-green-600 transition-colors cursor-pointer">
            Confirm
          </button>

        </div>
      </div>
    )}
  </div>);
}


