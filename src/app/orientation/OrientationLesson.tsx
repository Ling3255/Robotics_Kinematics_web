"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useBottomPanelStore } from "@/store/useBottomPanelStore";
import RotationSphereScene from "./components/RotationSphereScene";
import RotationMatrixPanel from "./components/RotationMatrixPanel";
import BackflipViewer from "./BackflipViewer";
import { IDENTITY_MATRIX_3X3 } from "./components/types";

type RotationMatrix9 = number[];

export default function OrientationLesson() {
  const [page, setPage] = useState<1 | 2>(1);
  const [resetKey, setResetKey] = useState(0);
  const matrixRef = useRef<RotationMatrix9>([...IDENTITY_MATRIX_3X3]);
  const setBottomPanel = useBottomPanelStore((state) => state.setConfig);
  const resetBottomPanel = useBottomPanelStore((state) => state.resetConfig);

  const handleMatrixChange = useCallback((_matrix: RotationMatrix9) => {
    // matrix is written directly into matrixRef by the scene for performance
  }, []);

  const resetCurrentPage = useCallback(() => {
    setResetKey((key) => key + 1);
    matrixRef.current = [...IDENTITY_MATRIX_3X3];
  }, []);

  useEffect(() => {
    if (page === 1) {
      setBottomPanel({
        hint: "Drag the sphere to rotate it and observe how the rotation matrix changes in real time.",
        checkDisabled: true,
        checkLabel: "Previous",
        nextDisabled: false,
        resetDisabled: false,
        onReset: resetCurrentPage,
        onNext: () => setPage(2),
      });
      return;
    }

    setBottomPanel({
      hint: "Each column of ᵁ_B R is one of the body frame's axes seen from the fixed frame U — watch them change as the slowed-down character flips.",
      checkDisabled: false,
      checkLabel: "Previous",
      onCheck: () => setPage(1),
      nextDisabled: true,
      resetDisabled: false,
      onReset: resetCurrentPage,
    });
  }, [page, resetCurrentPage, setBottomPanel]);

  useEffect(() => resetBottomPanel, [resetBottomPanel]);

  if (page === 1) {
    return (
      <section className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_340px] gap-4 bg-slate-50 p-4 max-lg:grid-cols-1">
        <RotationSphereScene
          resetKey={resetKey}
          matrixRef={matrixRef}
          onMatrixChange={handleMatrixChange}
          isActive={true}
        />
        <RotationMatrixPanel matrixRef={matrixRef} isActive={true} />
      </section>
    );
  }

  return <BackflipViewer />;
}