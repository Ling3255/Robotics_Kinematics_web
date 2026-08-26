import IKPartLayout from "../components/IKPartLayout";

export default function IKDemoPage() {
  return (
    <IKPartLayout
      current={5}
      title="Interactive Demo — Try It"
      subtitle="Part 5 — Practice: click, drag & observe IK"
    >
      <div className="grid h-full grid-cols-1 gap-4 p-4 lg:grid-cols-2">
        {/* Interactive demo figure — left half */}
        <div className="relative min-h-[54vh] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:min-h-0">
          <iframe
            src="/inverse-kinematics-demo.html"
            title="2-Link Inverse Kinematics Interactive Demo"
            className="absolute inset-0 h-full w-full border-0"
          />
        </div>

        {/* How to Interact — right half */}
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-700">
            How to Interact
          </h2>
          <ul className="space-y-2 text-[12px] leading-relaxed text-slate-600">
            <li className="flex gap-1.5">
              <span className="text-slate-400">①</span>
              <span>
                <b>Click or drag</b> on the plane to set the target point
              </span>
            </li>
            <li className="flex gap-1.5">
              <span className="text-slate-400">②</span>
              <span>
                Press <b>Reset Target</b> to reset
              </span>
            </li>
            <li className="flex gap-1.5">
              <span className="text-slate-400">③</span>
              <span>
                Check <b>Elbow Up</b> to switch the solution
              </span>
            </li>
          </ul>
        </div>
      </div>
    </IKPartLayout>
  );
}
