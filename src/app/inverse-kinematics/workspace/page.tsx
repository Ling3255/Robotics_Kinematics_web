import IKPartLayout from "../components/IKPartLayout";
import IKDiagram from "../components/IKDiagram";
import { L1, L2, R_MAX, R_MIN } from "../shared";

export default function IKWorkspacePage() {
  return (
    <IKPartLayout
      current={3}
      title="Reachable Workspace"
      subtitle="Part 3 — Where can the arm actually reach?"
    >
      <div className="grid h-full grid-cols-1 gap-4 p-4 lg:grid-rows-1 lg:grid-cols-2">
        {/* Left — annotated diagram fills its column */}
        <div className="relative min-h-[54vh] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:min-h-0">
          <IKDiagram
            intent="workspace"
            showRings
            unreachableTarget={[R_MAX + 25, -R_MAX * 0.35]}
            className="h-full w-full"
          />
          {/* Top badges */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-2 text-sm font-medium">
            <span className="rounded-md bg-white/90 px-3 py-1.5 text-emerald-700 shadow backdrop-blur">
              <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
              Green target → reachable
            </span>
            <span className="rounded-md bg-white/90 px-3 py-1.5 text-red-600 shadow backdrop-blur">
              <span className="mr-1 inline-block h-2.5 w-2.5 rounded-full bg-red-600" />
              Red target → unreachable
            </span>
          </div>
          {/* Zone legend */}
          <div className="absolute bottom-3 left-3 rounded-md bg-white/95 px-3.5 py-2 text-sm font-medium text-slate-600 shadow backdrop-blur">
            <div className="flex flex-col gap-1.5">
              <span className="flex items-center gap-2">
                <span className="inline-block h-3.5 w-5 rounded-sm bg-[#4f46e5] opacity-30" />
                <span>indigo ring = reachable zone (annulus)</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-block h-0 w-5 border-t-2 border-dashed border-slate-400" />
                <span>dashed circles = R_max / r_min (labeled on ring)</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="inline-block h-0 w-5 border-t-2 border-dotted border-red-700" />
                <span>outside the ring → target cannot be reached</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right — teaching text */}
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-slate-900">
              Not every point is reachable
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              Because the two links can only stretch so far, the end-effector
              is confined to a flat ring (an <b>annulus</b>) around the base.
              Its boundaries come straight from the two link lengths:
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Outer radius
              </p>
              <p className="mt-1 font-mono text-xl font-bold text-slate-800">
                R_max = L1 + L2
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-indigo-600">
                = {R_MAX}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                arm fully stretched
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Inner radius
              </p>
              <p className="mt-1 font-mono text-xl font-bold text-slate-800">
                r_min = |L1 − L2|
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-indigo-600">
                = {R_MIN}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                arm fully folded back
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Solvable or not?
            </h3>
            <ul className="space-y-2 text-sm leading-relaxed text-slate-600">
              <li>
                Target <b>inside the ring</b> → a solution exists (green, arm
                responds).
              </li>
              <li>
                Target <b>outside the ring</b> → no solution (red, arm cannot
                reach).
              </li>
            </ul>
            <div className="mt-3 rounded-lg bg-slate-50 p-3 font-mono text-[13px] text-slate-800">
              reachable &nbsp;⟺&nbsp; r_min ≤ d ≤ R_max
            </div>
            <p className="mt-2 text-[12px] leading-relaxed text-slate-400">
              where d = distance from base to target. The demo paints the target
              green or red using exactly this check.
            </p>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
            <b>The IK solver must test reachability first.</b> If the point is
            outside the ring the math has no valid answer, so a real controller
            rejects it or flags it as unreachable.
          </div>
        </div>
      </div>
    </IKPartLayout>
  );
}
