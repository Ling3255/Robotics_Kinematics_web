"use client";

const HAT = "\u0302";
const X = `x${HAT}`; // x̂
const Y = "\u0177";   // ŷ
const Z = "\u1E91";   // ẑ

function AxisDot({ body, world }: { body: string; world: string }) {
  return (
    <span className="block whitespace-nowrap">
      {body}
      <sub>B</sub>
      <span className="mx-0.5 text-slate-400">·</span>
      {world}
      <sub>U</sub>
    </span>
  );
}

const COLUMNS = [
  { axis: X, color: "text-red-600", bar: "border-red-200 bg-red-50/70" },
  { axis: Y, color: "text-slate-700", bar: "border-slate-200 bg-slate-100" },
  { axis: Z, color: "text-blue-600", bar: "border-blue-200 bg-blue-50/70" },
];

export default function OrientationMatrixNotation() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-400">Orientation Matrix</p>
        <h2 className="mt-0.5 text-sm font-bold text-slate-900">Orientation Matrix (Column Vector Composition)</h2>
      </div>

      {/* White-background formula */}
      <div className="mt-3 rounded-lg bg-white p-3 text-center ring-1 ring-slate-100">
        <span className="font-serif text-base text-slate-900">
          R = <span className="text-slate-400">[</span>
          <span className="text-red-600">{X}<sub>B</sub></span>
          <span className="mx-1.5 text-slate-300">|</span>
          <span className="text-slate-700">{Y}<sub>B</sub></span>
          <span className="mx-1.5 text-slate-300">|</span>
          <span className="text-blue-600">{Z}<sub>B</sub></span>
          <span className="text-slate-400">]</span>
        </span>
      </div>

      {/* Expanded column-vector matrix */}
      <div className="mt-3 flex items-center justify-center gap-2">
        <span className="text-2xl leading-[2.2] text-slate-400">[</span>
        <div className="grid grid-cols-3 gap-x-4 text-center font-serif text-[11px] leading-5 text-slate-800">
          <div className={`rounded-md border ${COLUMNS[0].bar} px-1.5 py-1`}>
            <p className={`font-bold ${COLUMNS[0].color}`}>{X}<sub>B</sub></p>
            <AxisDot body={X} world={X} />
            <AxisDot body={X} world={Y} />
            <AxisDot body={X} world={Z} />
          </div>
          <div className={`rounded-md border ${COLUMNS[1].bar} px-1.5 py-1`}>
            <p className={`font-bold ${COLUMNS[1].color}`}>{Y}<sub>B</sub></p>
            <AxisDot body={Y} world={X} />
            <AxisDot body={Y} world={Y} />
            <AxisDot body={Y} world={Z} />
          </div>
          <div className={`rounded-md border ${COLUMNS[2].bar} px-1.5 py-1`}>
            <p className={`font-bold ${COLUMNS[2].color}`}>{Z}<sub>B</sub></p>
            <AxisDot body={Z} world={X} />
            <AxisDot body={Z} world={Y} />
            <AxisDot body={Z} world={Z} />
          </div>
        </div>
        <span className="text-2xl leading-[2.2] text-slate-400">]</span>
      </div>

      {/* Symbol legend */}
      <div className="mt-3 space-y-1.5 rounded-lg bg-slate-50 p-3 text-[11px] leading-5 text-slate-600">
        <p><span className="font-bold text-slate-900">R</span>: the orientation (rotation) matrix describing the orientation of the B frame relative to the U frame.</p>
        <p><span className="font-bold text-slate-900">{X}<sub>B</sub>, {Y}<sub>B</sub>, {Z}<sub>B</sub></span>: the three unit axis vectors of the body-fixed B frame (used as the columns of the matrix).</p>
        <p><span className="font-bold text-slate-900">{X}<sub>U</sub>, {Y}<sub>U</sub>, {Z}<sub>U</sub></span>: the three unit axis vectors of the fixed world U frame.</p>
        <p><span className="font-bold text-slate-900">·</span>: the dot (inner) product, representing the projection component of one vector onto another unit-axis direction.</p>
        <p><span className="font-bold text-slate-900">Each column</span>: the coordinates of one B-frame axis expressed in the U frame.</p>
      </div>
    </div>
  );
}