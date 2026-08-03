"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useBottomPanelStore } from "@/store/useBottomPanelStore";
import AssemblyPage from "@/components/pages/AssemblyPage";
import FbxViewer from "./FbxViewer";
import RoboViewer from "./RoboViewer";

const ALL_WORDS = ["Base", "Joint", "Link", "End effector", "Wrist", "Sensor", "Drive", "Controller"];
const CORRECT_ANSWERS = ["Base", "Joint", "Link", "End effector"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function QuizStep({
  words,
  selected,
  onToggle,
  onSubmit,
}: {
  words: string[];
  selected: Set<string>;
  onToggle: (word: string) => void;
  onSubmit: () => void;
}) {
  return (
    <section className="flex min-h-0 flex-col bg-slate-50 p-8 lg:h-[calc(100vh-112px)]">
      <h1 className="mb-8 text-center text-xl font-semibold text-slate-800">
        What core components were used in the previous robotic arm model assembly?
      </h1>

      <div className="mx-auto grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {words.map((word) => {
          const checked = selected.has(word);
          return (
            <button
              key={word}
              type="button"
              onClick={() => onToggle(word)}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-4 text-left transition-all select-none ${
                checked
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                readOnly
                className="pointer-events-none h-4 w-4 shrink-0 accent-blue-500"
              />
              <span className={`text-sm font-medium ${checked ? "text-blue-700" : "text-slate-700"}`}>
                {word}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 flex justify-center">
        <button
          type="button"
          onClick={onSubmit}
          className="cursor-pointer rounded-lg bg-slate-800 px-8 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          Submit
        </button>
      </div>
    </section>
  );
}

export default function RobotBasicsLesson() {
  const [page, setPage] = useState(1);
  const router = useRouter();
  const setBottomPanel = useCallback(
    useBottomPanelStore((state) => state.setConfig),
    []
  );
  const resetBottomPanel = useBottomPanelStore((state) => state.resetConfig);

  // Quiz state
  const [words, setWords] = useState<string[]>(ALL_WORDS);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [quizPassed, setQuizPassed] = useState(false);

  // 第一次加载时随机打乱单词顺序（仅执行一次）
  useEffect(() => {
    setWords(shuffle(ALL_WORDS));
  }, []);

  // 错误反馈：2 秒后红色模态框自动消失，并立即取消所有勾选（不重新打乱顺序）
  useEffect(() => {
    if (!showError) return;
    const t = setTimeout(() => {
      setShowError(false);
      setSelected(new Set());
    }, 2000);
    return () => clearTimeout(t);
  }, [showError]);

  // 成功反馈：3 秒后自动跳转到 /position 页面
  useEffect(() => {
    if (!showSuccess) return;
    const t = setTimeout(() => {
      router.push("/position");
    }, 3000);
    return () => clearTimeout(t);
  }, [showSuccess, router]);


  // 离开测验页时重置测验状态
  useEffect(() => {
    if (page !== 4) {
      setShowError(false);
      setShowSuccess(false);
      setQuizPassed(false);
      setSelected(new Set());
    }
  }, [page]);

  const toggleWord = (word: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(word)) next.delete(word);
      else next.add(word);
      return next;
    });
  };

  const handleSubmit = () => {
    const isCorrect =
      selected.size === CORRECT_ANSWERS.length &&
      CORRECT_ANSWERS.every((w) => selected.has(w));
    if (isCorrect) {
      setQuizPassed(true);
      setShowSuccess(true);
    } else {
      setShowError(true);
    }
  };

  useEffect(() => {
    const resetLesson = () => setPage(1);

    if (page === 1) {
      setBottomPanel({
        hint: "Drag and drop parts to build your own robotic arm.",
        checkDisabled: true,
        checkLabel: "Previous",
        nextDisabled: false,
        resetDisabled: false,
        onReset: resetLesson,
        onNext: () => setPage(2),
      });
      return;
    }

    if (page === 2) {
      setBottomPanel({
        hint: "The base is fixed. Adjust the joint angle sliders to move the arm — same as Forward Kinematics.",
        checkDisabled: false,
        checkLabel: "Previous",
        onCheck: () => setPage(1),
        nextDisabled: false,
        resetDisabled: false,
        onReset: resetLesson,
        onNext: () => setPage(3),
      });
      return;
    }

    if (page === 3) {
      setBottomPanel({
        hint: "Observe the raised-arm pose and the robotic arm side by side.",
        checkDisabled: false,
        checkLabel: "Previous",
        onCheck: () => setPage(2),
        nextDisabled: false,
        resetDisabled: false,
        onReset: resetLesson,
        onNext: () => setPage(4),
      });
      return;
    }

    // page === 4（测验页）
    setBottomPanel({
      hint: "Select the core components used in the robotic arm assembly, then press Submit.",
      checkDisabled: false,
      checkLabel: "Previous",
      onCheck: () => setPage(3),
      nextDisabled: !quizPassed,
      resetDisabled: false,
      onReset: resetLesson,
      onNext: () => router.push("/position"),
    });
  }, [page, setBottomPanel, router, quizPassed]);

  useEffect(() => resetBottomPanel, [resetBottomPanel]);

  if (page === 1) {
    return <AssemblyPage />;
  }

  if (page === 2) {
    return <RoboViewer />;
  }

  if (page === 3) {
    return <FbxViewer />;
  }

  // page === 4（测验页）
  return (
    <>
      <QuizStep words={words} selected={selected} onToggle={toggleWord} onSubmit={handleSubmit} />

      {showError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="rounded-2xl bg-red-500/90 px-10 py-8 text-center shadow-2xl">
            <p className="text-lg font-semibold text-white">Try again</p>
          </div>
        </div>
      )}

      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="rounded-2xl bg-green-500/90 px-10 py-8 text-center shadow-2xl">
            <p className="text-lg font-semibold text-white">
              Correct！Now let's start learning about position expressions.
            </p>

          </div>
        </div>
      )}
    </>
  );
}
