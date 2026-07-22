"use client";

interface ReferenceFrameQuizProps {
  roomAnswer: "" | "Yes" | "No";
  canMoveAnswer: "" | "Yes" | "No";
  onRoomAnswer: (answer: "Yes" | "No") => void;
  onCanMoveAnswer: (answer: "Yes" | "No") => void;
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

export default function ReferenceFrameQuiz({ roomAnswer, canMoveAnswer, onRoomAnswer, onCanMoveAnswer }: ReferenceFrameQuizProps) {
  const roomCorrect = roomAnswer === "Yes";
  const moveCorrect = canMoveAnswer === "No";

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Reference Frame U</p>
        <h2 className="mt-2 text-lg font-bold text-slate-900">A fixed room gives us a reference.</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Observe the room in the 3D scene. It represents the fixed reference coordinate system U.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-800">Do you see a room?</p>
        <div className="mt-3 flex gap-2">
          <ChoiceButton selected={roomAnswer === "Yes"} onClick={() => onRoomAnswer("Yes")}>Yes</ChoiceButton>
          <ChoiceButton selected={roomAnswer === "No"} onClick={() => onRoomAnswer("No")}>No</ChoiceButton>
        </div>
        {roomAnswer && (
          <p className={`mt-3 text-sm font-semibold ${roomCorrect ? "text-emerald-600" : "text-red-500"}`}>
            {roomCorrect ? "Correct!" : "Please try again."}
          </p>
        )}
      </section>

      {roomCorrect && (
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-800">Can you move the room?</p>
          <div className="mt-3 flex gap-2">
            <ChoiceButton selected={canMoveAnswer === "Yes"} onClick={() => onCanMoveAnswer("Yes")}>Yes</ChoiceButton>
            <ChoiceButton selected={canMoveAnswer === "No"} onClick={() => onCanMoveAnswer("No")}>No</ChoiceButton>
          </div>
          {canMoveAnswer && (
            <p className={`mt-3 text-sm font-semibold ${moveCorrect ? "text-emerald-600" : "text-red-500"}`}>
              {moveCorrect ? "Good job!" : "Think again: should a reference frame move while we measure from it?"}
            </p>
          )}
        </section>
      )}

      {roomCorrect && moveCorrect && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-700">
          The room represents a fixed, non-movable reference frame U.
        </div>
      )}
    </div>
  );
}