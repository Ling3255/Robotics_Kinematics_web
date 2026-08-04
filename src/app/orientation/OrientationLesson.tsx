"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useBottomPanelStore } from "@/store/useBottomPanelStore";
import RotationSphereScene from "./components/RotationSphereScene";
import RotationMatrixPanel from "./components/RotationMatrixPanel";
import PositionChangeQuiz from "./components/PositionChangeQuiz";
import PositionVsOrientationDemo from "./components/PositionVsOrientationDemo";
import SingleAxisRotator from "./components/SingleAxisRotator";
import BackflipViewer from "./BackflipViewer";
import Feedback from "@/components/lessons/Feedback";
import { IDENTITY_MATRIX_3X3 } from "./components/types";

type RotationMatrix9 = number[];

export default function OrientationLesson() {
  const [page, setPage] = useState<1 | 2 | 3 | 4>(1);
  const [resetKey, setResetKey] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<"" | "Yes" | "No">("");
  const matrixRef = useRef<RotationMatrix9>([...IDENTITY_MATRIX_3X3]);
  const setBottomPanel = useBottomPanelStore((state) => state.setConfig);
  const resetBottomPanel = useBottomPanelStore((state) => state.resetConfig);

  const handleMatrixChange = useCallback((_matrix: RotationMatrix9) => {
    // matrix is written directly into matrixRef by the scene for performance
  }, []);

  const quizComplete = quizAnswer === "No";

  const resetCurrentPage = useCallback(() => {
    if (page === 2) {
      setQuizAnswer("");
    }
    setResetKey((key) => key + 1);
    matrixRef.current = [...IDENTITY_MATRIX_3X3];
  }, [page]);

  useEffect(() => {
    if (page === 1) {
      setBottomPanel({
        hint: "Use the sliders to rotate around a single axis at a time. Observe how the rotation matrix changes.",
        checkDisabled: true,
        checkLabel: "Previous",
        nextDisabled: false,
        resetDisabled: false,
        onReset: resetCurrentPage,
        onNext: () => setPage(2),
      });
      return;
    }

    if (page === 2) {
      setBottomPanel({
        hint: quizComplete
          ? "Great! You understand the difference between position and orientation."
          : "Switch between the two modes in the 3D scene, then answer the question to continue.",
        checkDisabled: false,
        checkLabel: "Previous",
        onCheck: () => setPage(1),
        nextDisabled: !quizComplete,
        resetDisabled: false,
        onReset: resetCurrentPage,
        onNext: () => setPage(3),
      });
      return;
    }

    if (page === 3) {
      setBottomPanel({
        hint: "Step ①: Lock an axis (X/Y/Z) to rotate one at a time. Step ②: Switch to 'Free' and combine rotations. Watch the orange arc — it shows how far X_B has deviated from X_U.",
        checkDisabled: false,
        checkLabel: "Previous",
        onCheck: () => setPage(2),
        nextDisabled: false,
        resetDisabled: false,
        onReset: resetCurrentPage,
        onNext: () => setPage(4),
      });
      return;
    }

    // page 4 — backflip viewer with dual coordinate frames
    setBottomPanel({
      hint: "Observe the fixed U frame vs the rotating B frame. The cube's orientation matches the character's pose.",
      checkDisabled: false,
      checkLabel: "Previous",
      onCheck: () => setPage(3),
      nextDisabled: true,
      resetDisabled: false,
      onReset: resetCurrentPage,
    });
  }, [page, quizComplete, resetCurrentPage, setBottomPanel]);

  useEffect(() => resetBottomPanel, [resetBottomPanel]);

  // Page 1: Single-axis rotation
  if (page === 1) {
    return (
      <section className="grid min-h-0 grid-cols-[minmax(0,1fr)_340px] gap-4 bg-slate-50 p-4 max-lg:grid-cols-1 lg:h-[calc(100vh-112px)]">
        <SingleAxisRotator
          resetKey={resetKey}
          matrixRef={matrixRef}
          onMatrixChange={handleMatrixChange}
        />
        <div className="flex min-h-0 flex-col gap-4 overflow-auto">
          <RotationMatrixPanel matrixRef={matrixRef} isActive={true} />
          <Feedback variant="info" title="Step by Step">
            Start with one axis at a time. Notice how a rotation about <strong>X</strong> only changes the Y-Z columns of the matrix.
            This is the simplest way to understand how each angle maps to the 3×3 matrix.
          </Feedback>
          <Feedback variant="success" title="Key Point">
            A single-axis rotation only changes the two corresponding columns of the matrix. Rotating about X, for example,
            changes columns 2 and 3 while column 1 stays fixed. That is why a rotation matrix is a set of column vectors —
            each column is one B-frame axis projected onto the U frame.
          </Feedback>
        </div>
      </section>
    );
  }

  // Page 2: Concept checkpoint — interactive 3D demo + "Is this a position change?"
  if (page === 2) {
    return (
      <section className="grid min-h-0 grid-cols-[minmax(0,1fr)_340px] gap-4 bg-slate-50 p-4 max-lg:grid-cols-1 lg:h-[calc(100vh-112px)]">
        <div className="flex h-full flex-col gap-3">
          {/* Header */}
          <div className="shrink-0 rounded-2xl border border-slate-200 bg-white px-5 py-3.5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Concept Watershed</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900">Position vs. Orientation</h2>
            <p className="mt-1 max-w-md text-sm leading-6 text-slate-500">
              Before moving to free rotation, let's make sure we understand the difference.
              Position and orientation are the two fundamental properties of any rigid body in space.
            </p>
          </div>
          {/* Interactive 3D Demo */}
          <PositionVsOrientationDemo className="flex-1" />
          <div className="shrink-0 flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex-1 text-center">
              <div className="mx-auto mb-1 h-2 w-14 rounded-full bg-red-400" />
              <p className="text-xs font-bold text-red-600">Position</p>
              <p className="mt-0.5 text-[11px] leading-tight text-slate-500">
                Where the object is
                <br />(3 values: x, y, z)
              </p>
            </div>
            <div className="flex-1 text-center">
              <div className="mx-auto mb-1 h-2 w-14 rounded-full bg-blue-400" />
              <p className="text-xs font-bold text-blue-600">Orientation</p>
              <p className="mt-0.5 text-[11px] leading-tight text-slate-500">
                Which way it faces
                <br />(3 angles / 9 matrix values)
              </p>
            </div>
          </div>
        </div>
        <PositionChangeQuiz answer={quizAnswer} onAnswer={setQuizAnswer} />
      </section>
    );
  }

  // Page 3: Free rotation with U/B frames + axis lock controls
  if (page === 3) {
    return (
      <section className="grid min-h-0 grid-cols-[minmax(0,1fr)_340px] gap-4 bg-slate-50 p-4 max-lg:grid-cols-1 lg:h-[calc(100vh-112px)]">
        <RotationSphereScene
          resetKey={resetKey}
          matrixRef={matrixRef}
          onMatrixChange={handleMatrixChange}
          isActive={true}
        />
        <div className="flex min-h-0 flex-col gap-4 overflow-auto">
          <RotationMatrixPanel matrixRef={matrixRef} isActive={true} />
          <Feedback variant="info" title="U vs B Frames">
            The <strong>U frame</strong> (X_U, Y_U, Z_U) is the fixed world coordinate system — it never moves.
            The <strong>B frame</strong> (X_B, Y_B, Z_B) is attached to the sphere and rotates with it.
            The orange arc shows the angle between X_U and X_B — this is the sphere's current orientation.
          </Feedback>
          <Feedback variant="success" title="You've got it!">
            Notice that rotation never moves the center — only the axes spin. That's why we say orientation is independent of position.
            Watch the orange arc as it changes — it shows, in real time, how far the B frame has rotated away from the U frame.
          </Feedback>
        </div>
      </section>
    );
  }

  // Page 4: Backflip viewer with U/B dual coordinate frames
  return (
    <div className="flex min-h-0 flex-col bg-slate-50 lg:h-[calc(100vh-112px)]">
      <BackflipViewer />
      {/* Summary bar at bottom of side panel area — shown below the viewer */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-6 py-3">
        <div className="mx-auto flex max-w-4xl gap-4 max-lg:flex-col">
          <Feedback variant="info" title="U Frame (World)" className="flex-1">
            X_U, Y_U, Z_U — fixed world axes. They are the <strong>absolute reference</strong>. No matter how the character or cube
            rotates, U stays put.
          </Feedback>
          <Feedback variant="warning" title="B Frame (Body)" className="flex-1">
            X_B, Y_B, Z_B — attached to the rotating object. They tell us the object's <strong>orientation relative to U</strong>.
            The rotation matrix R maps B → U.
          </Feedback>
          <Feedback variant="success" title="Summary" className="flex-1">
            Orientation = the rotation from U to B. A single 3×3 matrix R encodes this relationship.
            Every column of R is a B-axis expressed in U coordinates. Understanding this is the key to robot kinematics.
          </Feedback>
        </div>
      </div>
    </div>
  );
}