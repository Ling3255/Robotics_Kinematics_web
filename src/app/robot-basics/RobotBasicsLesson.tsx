"use client";

import { useEffect, useState } from "react";
import { useBottomPanelStore } from "@/store/useBottomPanelStore";
import AssemblyPage from "@/components/pages/AssemblyPage";
import FbxViewer from "./FbxViewer";
import RoboViewer from "./RoboViewer";

export default function RobotBasicsLesson() {
  const [page, setPage] = useState(1);
  const setBottomPanel = useBottomPanelStore((state) => state.setConfig);
  const resetBottomPanel = useBottomPanelStore((state) => state.resetConfig);

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

    setBottomPanel({
      hint: "Observe the raised-arm pose and the robotic arm side by side.",
      checkDisabled: false,
      checkLabel: "Previous",
      onCheck: () => setPage(2),
      nextDisabled: true,
      resetDisabled: false,
      onReset: resetLesson,
    });
  }, [page, setBottomPanel]);

  useEffect(() => resetBottomPanel, [resetBottomPanel]);

  if (page === 1) {
    return <AssemblyPage />;
  }

  if (page === 2) {
    return <RoboViewer />;
  }

  return <FbxViewer />;
}
