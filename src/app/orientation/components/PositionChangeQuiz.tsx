"use client";

import Feedback from "@/components/lessons/Feedback";

interface PositionChangeQuizProps {
  answer: "" | "Yes" | "No";
  onAnswer: (answer: "Yes" | "No") => void;
}

function ChoiceButton({ selected, children, onClick }: { selected: boolean; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-4 py-2 text-sm font-semibold transition ${
        selected
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-300 bg-white text-slate-700 hover:border-slate-500 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

export default function PositionChangeQuiz({ answer, onAnswer }: PositionChangeQuizProps) {
  const correct = answer === "No";

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Concept Checkpoint</p>
        <h2 className="mt-2 text-lg font-bold text-slate-900">Is this a position change?</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Rotation changes orientation — not position. The origin stays fixed while the coordinate axes
          turn around it. Think of spinning a globe on its axis: the center stays in place.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-800">
          When you rotate the sphere, does its position change?
        </p>
        <div className="mt-3 flex gap-2">
          <ChoiceButton selected={answer === "Yes"} onClick={() => onAnswer("Yes")}>Yes</ChoiceButton>
          <ChoiceButton selected={answer === "No"} onClick={() => onAnswer("No")}>No</ChoiceButton>
        </div>
        {answer === "Yes" && (
          <Feedback variant="error" className="mt-3">
            Not quite. Rotation keeps the center point fixed — only the orientation of the axes changes.
          </Feedback>
        )}
        {answer === "No" && (
          <Feedback variant="success" className="mt-3">
            Correct! Rotation changes orientation, not position. The sphere's center stays at the same point.
          </Feedback>
        )}
      </section>

      {correct && (
        <>
          <Feedback variant="info" title="Key Insight">
            Position = where you are. Orientation = which way you're facing. Rotation is purely about direction — the location
            of the origin point does not move at all. This distinction is the foundation of rigid-body transformations.
          </Feedback>
          <Feedback variant="success" title="Summary">
            Remember: as long as the center of the object (the origin) does not move, it is not a position change.
            Rotation changes orientation, not position — and this distinction is the foundation of pose description in robotics.
          </Feedback>
        </>
      )}
    </div>
  );
}