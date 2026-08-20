import IKPartLayout from "../components/IKPartLayout";
import IKDiagram from "../components/IKDiagram";
import { L1, L2, deg2rad, armPositions } from "../shared";

export default function IKArmPage() {
  // A fixed illustrative pose: θ1 = 40°, θ2 = 60°
  const th1 = deg2rad(40);
  const th2 = deg2rad(60);
  const { ex, ey } = armPositions(th1, th2);
  const target: [number, number] = [ex, ey];

  return (
    <IKPartLayout
      current={2}
      title="The 2-Link Arm in the Demo"
      subtitle="Part 2 — Setup & the IK formulas"
    >
      <div className="grid h-full grid-cols-1 gap-4 p-4 lg:grid-rows-1 lg:grid-cols-2">
        {/* Left — annotated diagram fills its column */}
        <div className="relative min-h-[54vh] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:min-h-0">
          <IKDiagram
            intent="arm"
            theta1={th1}
            theta2={th2}
            target={target}
            showAngleLabels
            className="h-full w-full"
          />
          {/* Angle annotations — color-matched to the diagram's arcs/joints */}
          <div className="absolute left-3 top-3 flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2 rounded-md bg-white/90 px-3 py-1.5 font-medium shadow backdrop-blur">
              <span className="inline-block h-3.5 w-3.5 rounded-full bg-red-500" />
              <span>
                <b>θ1</b> = {Math.round((th1 * 180) / Math.PI)}°{" "}
                <span className="text-slate-400">(base)</span>
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-white/90 px-3 py-1.5 font-medium shadow backdrop-blur">
              <span className="inline-block h-3.5 w-3.5 rounded-full bg-blue-600" />
              <span>
                <b>θ2</b> = {Math.round((th2 * 180) / Math.PI)}°{" "}
                <span className="text-slate-400">(elbow)</span>
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-white/90 px-3 py-1.5 font-medium text-emerald-700 shadow backdrop-blur">
              <span className="inline-block h-3.5 w-3.5 rounded-full bg-emerald-600" />
              <span>
                <b>END</b> = ({ex.toFixed(1)}, {ey.toFixed(1)})
              </span>
            </div>
          </div>
          {/* FK flow note */}
          <div className="absolute bottom-3 right-3 rounded-md bg-white/95 px-3 py-2 text-sm font-medium text-slate-600 shadow backdrop-blur">
            angles <b className="text-red-600">θ1, θ2</b> →{" "}
            <b className="text-emerald-600">end-effector</b>{" "}
            <span className="text-slate-400">(forward kinematics)</span>
          </div>
        </div>

        {/* Right — teaching text */}
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-slate-900">
              The model you saw in the demo
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              The demo uses a planar (2D) arm made of two rigid links and two
              revolute joints. The parameters are defined in one place:
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Link 1
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-indigo-600">
                L1 = {L1}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">base → elbow</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Link 2
              </p>
              <p className="mt-1 font-mono text-2xl font-bold text-cyan-600">
                L2 = {L2}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                elbow → end-effector
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              The two joint angles
            </h3>
            <ul className="space-y-2 text-sm leading-relaxed text-slate-600">
              <li>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-red-500" />{" "}
                  <b>θ1 — Base angle:</b> angle of link 1 with the +X axis
                </span>
              </li>
              <li>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-sm bg-blue-600" />{" "}
                  <b>θ2 — Elbow angle:</b> angle between link 1 and link 2
                </span>
              </li>
            </ul>
            <p className="mt-3 text-[12px] leading-relaxed text-slate-400">
              The end-effector position is the head of the two stacked
              segments. Forward kinematics tells us where it lands:
            </p>
            <div className="mt-2 rounded-lg bg-slate-50 p-3 font-mono text-[13px] text-slate-800">
              x = L1·cos(θ1) + L2·cos(θ1 + θ2)
              <br />
              y = L1·sin(θ1) + L2·sin(θ1 + θ2)
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
            <b>IK reverses this:</b> you know <code>x, y</code> and you solve
            the <em>same equations backwards</em> for <code>θ1, θ2</code>.
          </div>
        </div>
      </div>
    </IKPartLayout>
  );
}
