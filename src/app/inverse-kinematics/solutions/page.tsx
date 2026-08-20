import IKPartLayout from "../components/IKPartLayout";
import IKDiagram from "../components/IKDiagram";
import { L1, L2, solve2LinkIK, deg2rad } from "../shared";

export default function IKSolutionsPage() {
  // Pick a target point in front of the base; both elbow-up and elbow-down exist.
  const tx = 55;
  const ty = -30;
  const up = solve2LinkIK(tx, ty, L1, L2, true);
  const down = solve2LinkIK(tx, ty, L1, L2, false);

  return (
    <IKPartLayout
      current={4}
      title="Multiple Solutions & Elbow Up / Down"
      subtitle="Part 4 — IK is often not unique"
    >
      <div className="grid h-full grid-cols-1 gap-4 p-4 lg:grid-rows-1 lg:grid-cols-2">
        {/* Large, clear annotated diagram — left column */}
        <div className="relative min-h-[54vh] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:min-h-0">
          <IKDiagram
            intent="solutions"
            theta1={up.theta1}
            theta2={up.theta2}
            theta1Alt={down.theta1}
            theta2Alt={down.theta2}
            target={[tx, ty]}
            showAngleLabels
            className="h-full w-full"
          />
          <div className="absolute left-3 top-3 flex flex-col gap-1.5 text-xs">
            <span className="rounded-md bg-white/90 px-2.5 py-1 font-medium text-slate-500 shadow backdrop-blur">
              Same target — two arm poses
            </span>
            <span className="rounded-md bg-white/90 px-2.5 py-1 font-medium shadow backdrop-blur">
              <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-indigo-600 align-middle" />
              <b>Elbow Up</b>&nbsp; θ2 = {(up.theta2! * 180) / Math.PI | 0}°
            </span>
            <span className="rounded-md bg-white/90 px-2.5 py-1 font-medium shadow backdrop-blur">
              <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-teal-500 align-middle" />
              <b>Elbow Down</b>&nbsp; θ2 = {(down.theta2! * 180) / Math.PI | 0}°
            </span>
          </div>
          {/* Formula annotation on the diagram */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-white/95 px-3 py-1.5 font-mono text-xs font-semibold text-slate-700 shadow backdrop-blur">
            cos&thinsp;θ2 = (d² − L1² − L2²) / (2·L1·L2)&nbsp;&nbsp;→&nbsp;&nbsp;±θ2
          </div>
        </div>

        {/* Teaching text — right column */}
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-slate-900">
              One target, two answers
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              For most reachable targets a 2-link arm can get there in{" "}
              <b>two different ways</b>: with the elbow reaching up, or with the
              elbow swinging down (mirror image across the line to the target).
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-red-600">
                  Elbow Up
                </p>
                <p className="mt-1 font-mono text-sm text-slate-700">
                  θ2 = {up.theta2 != null ? (up.theta2 * 180 / Math.PI).toFixed(0) : "—"}°
                </p>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                  Elbow Down
                </p>
                <p className="mt-1 font-mono text-sm text-slate-700">
                  θ2 = {down.theta2 != null ? (down.theta2 * 180 / Math.PI).toFixed(0) : "—"}°
                </p>
              </div>
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-slate-400">
              Note how the two θ2 values are exact opposites in sign.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              What the math does
            </h3>
            <p className="text-sm leading-relaxed text-slate-600">
              From the law of cosines we first solve the elbow angle:
            </p>
            <div className="mt-2 rounded-lg bg-slate-50 p-3 font-mono text-[13px] text-slate-800">
              cos θ2 = (d² − L1² − L2²) / (2·L1·L2)
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">
              Since <span className="font-mono">arccos</span> has two mirror
              results (±θ2), we get two arm configurations. Then we recover the
              base angle:
            </p>
            <div className="mt-2 rounded-lg bg-slate-50 p-3 font-mono text-[13px] text-slate-800">
              θ1 = atan2(y, x) − atan2(L2·sin θ2, L1 + L2·cos θ2)
            </div>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
            <b>Real robots pick one.</b> Both solutions are mathematically
            valid, so a controller chooses the better one based on joint limits,
            obstacles, or which costs less energy to reach.
          </div>
        </div>
      </div>
    </IKPartLayout>
  );
}
