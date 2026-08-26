import IKPartLayout from "../components/IKPartLayout";
import IKDiagram from "../components/IKDiagram";

export default function IKIntroPage() {
  return (
    <IKPartLayout
      current={1}
      title="What is Inverse Kinematics?"
      subtitle="Part 1 — Working backwards from a goal"
    >
      <div className="grid h-full grid-cols-1 gap-4 p-4 lg:grid-rows-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
        {/* Diagram — large, clear, annotated */}
        <div className="relative min-h-[54vh] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:min-h-0">
          <IKDiagram intent="intro" className="h-full w-full" showRings />
          {/* Live labels (HTML overlay, easy to read) */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-2 text-sm font-medium">
            <span className="rounded-md bg-white/90 px-3 py-1 text-indigo-700 shadow backdrop-blur">
              ● BASE
            </span>
            <span className="rounded-md bg-white/90 px-3 py-1 text-indigo-700 shadow backdrop-blur">
              ● ELBOW
            </span>
            <span className="rounded-md bg-white/90 px-3 py-1 text-emerald-700 shadow backdrop-blur">
              ● END
            </span>
            <span className="rounded-md bg-white/90 px-3 py-1 text-amber-700 shadow backdrop-blur">
              ● TARGET
            </span>
          </div>
          {/* Reaching-legend */}
          <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-3 rounded-md bg-white/95 px-3.5 py-2 text-sm font-medium text-slate-600 shadow backdrop-blur">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-5 bg-indigo-500" /> link 1
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-5 bg-cyan-500" /> link 2
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0 w-5 border-t-2 border-dashed border-amber-500" />
              goal (dashed)
            </span>
          </div>
        </div>

        {/* Teaching text — right column */}
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-2 text-base font-semibold text-slate-900">
              Goal-driven robot motion
            </h2>
            <p className="text-sm leading-relaxed text-slate-600">
              A robot arm is made of joints and links. There are two ways we think
              about its motion:
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
                Forward Kinematics
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                Given joint angles → find where the end-effector is.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                Inverse Kinematics (IK)
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">
                Given a desired position → work backwards to find the joint
                angles.
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-2 text-sm font-semibold text-slate-800">
              Why would we want that?
            </h3>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
              <li>
                We usually know <em>where</em> we want the hand to go (grab a
                cup, reach a point, weld a seam) — not the angles in advance.
              </li>
              <li>
                IK is the standard problem in robot control:{" "}
                <b>choose joint angles so the tool reaches the target</b>.
              </li>
              <li>
                It is the "opposite problem" of forward kinematics and is
                generally harder to solve.
              </li>
            </ul>
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-800">
            <b>Watch the diagram:</b> the <b>orange dashes</b> go from the base
            to a target point (the goal). The arm then continuously re-solves
            its joint angles so its end-effector (green, labeled{" "}
            <span className="font-mono">END</span>) lands exactly on the target.
            That is inverse kinematics happening live — base → elbow → end, all
            working backwards from the orange goal.
          </div>
        </div>
      </div>
    </IKPartLayout>
  );
}
