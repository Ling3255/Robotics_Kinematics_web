"use client";

import type { AxisChoice } from "./types";

interface AxisMatchingPanelProps {
  answers: {
    red: AxisChoice;
    black: AxisChoice;
    blue: AxisChoice;
  };
  submitted: boolean;
  onAnswerChange: (color: "red" | "black" | "blue", value: AxisChoice) => void;
  onSubmit: () => void;
}

const OPTIONS: AxisChoice[] = ["", "X-Axis", "Y-Axis", "Z-Axis"];
const CORRECT = { red: "X-Axis", black: "Y-Axis", blue: "Z-Axis" } as const;

export function isAxisMatchingComplete(answers: AxisMatchingPanelProps["answers"]) {
  return answers.red === CORRECT.red && answers.black === CORRECT.black && answers.blue === CORRECT.blue;
}

export default function AxisMatchingPanel({ answers, submitted, onAnswerChange, onSubmit }: AxisMatchingPanelProps) {
  const allCorrect = isAxisMatchingComplete(answers);
  const rows = [
    { key: "red" as const, label: "Red marker", textClass: "text-red-600" },
    { key: "black" as const, label: "Black marker", textClass: "text-slate-900" },
    { key: "blue" as const, label: "Blue marker", textClass: "text-blue-600" },
  ];

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Coordinate Axes</p>
        <h2 className="mt-2 text-lg font-bold text-slate-900">Identify X, Y, and Z.</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Let&apos;s say the position of the ball Q is at the corner of the room U. What will you label the axes according to the colored balls?
        </p>
      </div>

      {rows.map((row) => {
        const isCorrect = answers[row.key] === CORRECT[row.key];
        return (
          <label key={row.key} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <span className={`text-sm font-bold ${row.textClass}`}>{row.label}</span>
            <select
              value={answers[row.key]}
              onChange={(event) => onAnswerChange(row.key, event.target.value as AxisChoice)}
              className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition focus:border-slate-700"
            >
              {OPTIONS.map((option) => (
                <option key={option || "empty"} value={option}>{option || "Choose an axis"}</option>
              ))}
            </select>
            {submitted && !isCorrect && (
              <p className="mt-2 text-sm font-semibold text-red-500">
                The axis selected for the {row.key} marker is incorrect.
              </p>
            )}
          </label>
        );
      })}

      <button
        type="button"
        onClick={onSubmit}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
      >
        Check Answer
      </button>

      {submitted && allCorrect && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-700">
          Good job!
        </div>
      )}
    </div>
  );
}