"use client";

import { useState } from "react";

interface Question {
  prompt: string;
  options: string[];
  answer: number; // index of correct option
  explanation: string;
}

const QUESTIONS: Question[] = [
  {
    prompt: "Inverse kinematics answers which of the following questions?",
    options: [
      "Given the joint angles, where is the end-effector?",
      "Given a desired hand position, what joint angles reach it?",
      "How fast should the motors spin?",
      "What is the weight of the arm?",
    ],
    answer: 1,
    explanation:
      "IK works backwards: from a desired end-effector position, it solves for the joint angles (θ1, θ2). Forward kinematics does the opposite.",
  },
  {
    prompt: "For the demo's arm with L1 = 50 and L2 = 80, the outer radius of the reachable workspace (R_max) is...",
    options: ["30", "80", "130", "210"],
    answer: 2,
    explanation:
      "R_max = L1 + L2 = 50 + 80 = 130, reached when the arm is fully stretched in a straight line.",
  },
  {
    prompt: "What shape is the reachable workspace of this 2-link planar arm?",
    options: [
      "A solid disk around the base",
      "A ring (annulus) — everything between r_min and R_max",
      "A single line",
      "A square",
    ],
    answer: 1,
    explanation:
      "The end-effector can only land between the inner radius (|L1−L2|) and outer radius (L1+L2), so the workspace is a flat annulus.",
  },
  {
    prompt: "A target at distance d is reachable when...",
    options: [
      "d ≤ r_min",
      "d ≥ R_max",
      "r_min ≤ d ≤ R_max",
      "d is any positive number",
    ],
    answer: 2,
    explanation:
      "The target must be far enough (≥ r_min) and close enough (≤ R_max). Outside this range there is no solution.",
  },
  {
    prompt: "For most reachable targets, how many different arm configurations exist?",
    options: [
      "Exactly one",
      "Two — elbow up or elbow down",
      "Three",
      "An infinite number",
    ],
    answer: 1,
    explanation:
      "Because arccos gives ±θ2, the arm can usually reach the same point in two mirror poses: elbow up or elbow down.",
  },
  {
    prompt: "Pick the correct law-of-cosines step for solving the elbow angle θ2.",
    options: [
      "cos θ2 = (d² + L1² + L2²) / (2·L1·L2)",
      "cos θ2 = (d² − L1² − L2²) / (2·L1·L2)",
      "θ2 = d / L2",
      "θ2 = L1 / L2",
    ],
    answer: 1,
    explanation:
      "From the law of cosines on the L1–L2 triangle: d² = L1² + L2² − 2·L1·L2·cos(π−θ2), which rearranges to cos θ2 = (d² − L1² − L2²)/(2·L1·L2).",
  },
  {
    prompt: "Which is the correct forward-kinematics equation for the tip's x position?",
    options: [
      "x = L1·cos(θ1) + L2·cos(θ1 + θ2)",
      "x = L1 + L2·θ1",
      "x = L1·sin(θ1) − L2·cos(θ1)",
      "x = L1·θ1 + L2·θ2",
    ],
    answer: 0,
    explanation:
      "The tip is at the head of two stacked segments: link 1 points at θ1, and link 2 points at θ1+θ2.",
  },
  {
    prompt: "Now that you've seen the demo, what does a RED target tell you?",
    options: [
      "The arm is tired",
      "The target is out of reach — no valid solution exists",
      "The arm is about to overheat",
      "Elbow-down is selected",
    ],
    answer: 1,
    explanation:
      "Red means the point is outside the reachable annulus, so the IK solver has no valid answer.",
  },
];

export default function QuizClient() {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const q = QUESTIONS[index];
  const total = QUESTIONS.length;

  const choose = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    if (i === q.answer) setScore((s) => s + 1);
  };

  const next = () => {
    if (index + 1 >= total) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
  };

  const restart = () => {
    setIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 p-4">
      {!finished ? (
        <>
          <div className="flex items-center justify-between text-[13px] text-slate-500">
            <span>
              Question {index + 1} of {total}
            </span>
            <span className="font-semibold text-slate-700">
              Score: {score} / {total}
            </span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-indigo-500 transition-all"
              style={{ width: `${((index + 1) / total) * 100}%` }}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold leading-relaxed text-slate-900">
              {q.prompt}
            </h2>

            <div className="mt-4 flex flex-col gap-2.5">
              {q.options.map((opt, i) => {
                const isCorrect = i === q.answer;
                const isChosen = i === selected;
                let cls =
                  "w-full rounded-lg border px-4 py-3 text-left text-sm transition-all";
                if (selected === null) {
                  cls += " border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 cursor-pointer";
                } else if (isCorrect) {
                  cls += " border-emerald-400 bg-emerald-50 text-emerald-800";
                } else if (isChosen) {
                  cls += " border-red-300 bg-red-50 text-red-700";
                } else {
                  cls += " border-slate-200 text-slate-400";
                }
                return (
                  <button
                    key={i}
                    onClick={() => choose(i)}
                    disabled={selected !== null}
                    className={cls}
                  >
                    <span className="mr-2 font-mono font-semibold">
                      {String.fromCharCode(65 + i)}.
                    </span>
                    {opt}
                  </button>
                );
              })}
            </div>

            {selected !== null && (
              <div
                className={`mt-4 rounded-lg p-3 text-sm leading-relaxed ${
                  selected === q.answer
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-amber-50 text-amber-800"
                }`}
              >
                <b>{selected === q.answer ? "Correct! " : "Not quite. "}</b>
                {q.explanation}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={next}
              disabled={selected === null}
              className="rounded-md bg-slate-800 px-5 py-2 text-[13px] font-medium text-white transition-all hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {index + 1 >= total ? "See result →" : "Next question →"}
            </button>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Quiz completed</h2>
          <p className="mt-2 text-sm text-slate-600">
            You scored <b className="text-indigo-600">{score}</b> out of{" "}
            <b className="text-indigo-600">{total}</b>.
          </p>
          <div className="mx-auto mt-4 h-2 max-w-xs overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-indigo-500"
              style={{ width: `${(score / total) * 100}%` }}
            />
          </div>
          <p className="mt-4 text-[13px] text-slate-500">
            {score === total
              ? "Perfect! You've mastered inverse kinematics."
              : score >= total * 0.7
                ? "Great job — review the sections you missed and try again."
                : "Revisit the earlier parts and practice with the demo, then retake the quiz."}
          </p>
          <button
            onClick={restart}
            className="mt-5 rounded-md bg-slate-800 px-5 py-2 text-[13px] font-medium text-white transition-all hover:bg-slate-700 cursor-pointer"
          >
            Restart quiz
          </button>
        </div>
      )}
    </div>
  );
}

