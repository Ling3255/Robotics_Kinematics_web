"use client";

import { useEffect, useState } from "react";
import { useBottomPanelStore } from "@/store/useBottomPanelStore";
import BackflipViewer from "./BackflipViewer";

export default function OrientationLesson() {
  const [page, setPage] = useState(1);
  const setBottomPanel = useBottomPanelStore((state) => state.setConfig);
  const resetBottomPanel = useBottomPanelStore((state) => state.resetConfig);

  useEffect(() => {
    const resetLesson = () => setPage(1);

    if (page === 1) {
      setBottomPanel({
        hint: "Click Next to view the orientation and rotation matrix demonstration.",
        checkDisabled: true,
        checkLabel: "Previous",
        nextDisabled: false,
        resetDisabled: false,
        onReset: resetLesson,
        onNext: () => setPage(2),
      });
      return;
    }

    setBottomPanel({
      hint: "Watch the backflip, cube orientation, and rotation matrix update together.",
      checkDisabled: false,
      checkLabel: "Previous",
      onCheck: () => setPage(1),
      nextDisabled: true,
      resetDisabled: false,
      onReset: resetLesson,
    });
  }, [page, setBottomPanel]);

  useEffect(() => resetBottomPanel, [resetBottomPanel]);

  if (page === 1) {
    return <div className="h-full w-full bg-slate-50" />;
  }

  return <BackflipViewer />;
}