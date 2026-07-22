"use client";

import { useEffect, useState } from "react";
import { useBottomPanelStore } from "@/store/useBottomPanelStore";

interface BlankFirstPageLessonProps {
  title: string;
  description: string;
}

export default function BlankFirstPageLesson({ title, description }: BlankFirstPageLessonProps) {
  const [page, setPage] = useState(1);
  const setConfig = useBottomPanelStore((state) => state.setConfig);
  const resetConfig = useBottomPanelStore((state) => state.resetConfig);

  useEffect(() => {
    const resetLesson = () => setPage(1);

    if (page === 1) {
      setConfig({
        hint: `Click Next to view the ${title.toLowerCase()} lesson.`,
        checkLabel: "Previous",
        checkDisabled: true,
        nextDisabled: false,
        resetDisabled: false,
        onReset: resetLesson,
        onNext: () => setPage(2),
      });
      return resetConfig;
    }

    setConfig({
      hint: description,
      checkLabel: "Previous",
      onCheck: () => setPage(1),
      checkDisabled: false,
      nextDisabled: true,
      resetDisabled: false,
      onReset: resetLesson,
    });

    return resetConfig;
  }, [description, page, resetConfig, setConfig, title]);

  if (page === 1) {
    return <div className="h-full w-full bg-slate-50" />;
  }

  return (
    <section className="flex h-full w-full items-center justify-center bg-slate-50 p-8">
      <div className="max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Coming Next</p>
        <h1 className="mt-3 text-3xl font-semibold text-slate-900">{title}</h1>
        <p className="mt-4 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </section>
  );
}