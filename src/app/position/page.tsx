"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { GizmoHelper, GizmoViewport, useProgress } from "@react-three/drei";
import { useBottomPanelStore } from "@/store/useBottomPanelStore";
import Character3D, { type CharacterPos } from "@/components/Character3D";
import HintBox from "@/components/ui/HintBox";
import AxisMatchingPanel, { isAxisMatchingComplete } from "./components/AxisMatchingPanel";
import PositionVectorPanel from "./components/PositionVectorPanel";
import ReferenceFrameQuiz from "./components/ReferenceFrameQuiz";
import TeachingScene from "./components/TeachingScene";
import { INITIAL_Q_POSITION, type AxisChoice, type LessonStep, type Vec3Position } from "./components/types";

function LoadingOverlay() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="absolute inset-0 z-[6] flex items-center justify-center bg-gray-50/60 text-sm text-gray-400">
      Loading model... {progress.toFixed(0)}%
    </div>
  );
}

function CoordinateOverlay({ posRef }: { posRef: { current: CharacterPos } }) {
  const textRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let rafId: number;
    const tick = () => {
      if (textRef.current) {
        const p = posRef.current;
        textRef.current.textContent = `X ${p.x.toFixed(2)}  Y ${p.y.toFixed(2)}  Z ${p.z.toFixed(2)}`;
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [posRef]);

  return (
    <div className="absolute right-4 top-4 z-10 rounded-lg bg-white/90 px-3 py-2 shadow-lg backdrop-blur">
      <span ref={textRef} className="font-mono text-xs tabular-nums text-gray-700">
        X 0.00 Y 0.00 Z 0.00
      </span>
    </div>
  );
}

function PositionScene() {
  const posRef = useRef<CharacterPos>({ x: 0, y: 0, z: 0 });

  return (
    <div className="relative h-full w-full">
      <Canvas camera={{ position: [0, 5, 10], fov: 45 }} gl={{ antialias: true }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1} />
        <Suspense fallback={null}>
          <Character3D posRef={posRef} />
        </Suspense>
        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewport
            disabled
            hideNegativeAxes
            labels={["X", "Z", "Y"]}
            axisColors={["#ef4444", "#22c55e", "#3b82f6"]}
            labelColor="#111827"
          />
        </GizmoHelper>
      </Canvas>

      <LoadingOverlay />
      <CoordinateOverlay posRef={posRef} />

      <HintBox hintLabel="Controls">
        <p>WASD / arrow keys: move on the X-Y plane</p>
        <p>Hold Space: move upward along +Z</p>
        <p>Hold Shift: move downward along -Z</p>
      </HintBox>
    </div>
  );
}

function LessonPanel({
  page,
  roomAnswer,
  canMoveAnswer,
  axisAnswers,
  axisSubmitted,
  qPosition,
  vectorComplete,
  onRoomAnswer,
  onCanMoveAnswer,
  onAxisAnswerChange,
  onAxisSubmit,
  onPreset,
}: {
  page: LessonStep;
  roomAnswer: "" | "Yes" | "No";
  canMoveAnswer: "" | "Yes" | "No";
  axisAnswers: { red: AxisChoice; black: AxisChoice; blue: AxisChoice };
  axisSubmitted: boolean;
  qPosition: Vec3Position;
  vectorComplete: boolean;
  onRoomAnswer: (answer: "Yes" | "No") => void;
  onCanMoveAnswer: (answer: "Yes" | "No") => void;
  onAxisAnswerChange: (color: "red" | "black" | "blue", value: AxisChoice) => void;
  onAxisSubmit: () => void;
  onPreset: (target: Vec3Position) => void;
}) {
  if (page === 1) {
    return (
      <ReferenceFrameQuiz
        roomAnswer={roomAnswer}
        canMoveAnswer={canMoveAnswer}
        onRoomAnswer={onRoomAnswer}
        onCanMoveAnswer={onCanMoveAnswer}
      />
    );
  }

  if (page === 2) {
    return (
      <AxisMatchingPanel
        answers={axisAnswers}
        submitted={axisSubmitted}
        onAnswerChange={onAxisAnswerChange}
        onSubmit={onAxisSubmit}
      />
    );
  }

  return <PositionVectorPanel qPosition={qPosition} completed={vectorComplete} onPreset={onPreset} />;
}

export default function PositionPage() {
  const [page, setPage] = useState<1 | 2 | 3 | 4>(1);
  const [resetKey, setResetKey] = useState(0);
  const [roomAnswer, setRoomAnswer] = useState<"" | "Yes" | "No">("");
  const [canMoveAnswer, setCanMoveAnswer] = useState<"" | "Yes" | "No">("");
  const [axisAnswers, setAxisAnswers] = useState<{ red: AxisChoice; black: AxisChoice; blue: AxisChoice }>({ red: "", black: "", blue: "" });
  const [axisSubmitted, setAxisSubmitted] = useState(false);
  const [qPosition, setQPosition] = useState<Vec3Position>(INITIAL_Q_POSITION);
  const [targetPosition, setTargetPosition] = useState<Vec3Position | null>(null);
  const [vectorComplete, setVectorComplete] = useState(false);
  const setBottomPanel = useBottomPanelStore((state) => state.setConfig);
  const resetBottomPanel = useBottomPanelStore((state) => state.resetConfig);

  const frameComplete = roomAnswer === "Yes" && canMoveAnswer === "No";
  const axisComplete = isAxisMatchingComplete(axisAnswers);

  const resetCurrentPage = useCallback(() => {
    if (page === 1) {
      setRoomAnswer("");
      setCanMoveAnswer("");
    }
    if (page === 2) {
      setAxisAnswers({ red: "", black: "", blue: "" });
      setAxisSubmitted(false);
    }
    if (page === 3) {
      setQPosition(INITIAL_Q_POSITION);
      setTargetPosition(null);
      setVectorComplete(false);
    }
    setResetKey((key) => key + 1);
  }, [page]);

  const goToPage = useCallback((nextPage: 1 | 2 | 3 | 4) => {
    setPage(nextPage);
    setTargetPosition(null);
    setResetKey((key) => key + 1);
    if (nextPage === 3) {
      setQPosition(INITIAL_Q_POSITION);
      setVectorComplete(false);
    }
  }, []);

  useEffect(() => {
    const isStepOne = page === 1;
    const isStepTwo = page === 2;
    const isStepThree = page === 3;
    const nextDisabled = isStepOne ? !frameComplete : isStepTwo ? !axisComplete : !vectorComplete;

    if (page < 4) {
      setBottomPanel({
        hint: nextDisabled
          ? page === 3
            ? "Drag Q onto the Target marker to complete this page."
            : "Complete the current task before moving to the next page."
          : "Follow the interaction in the scene and panel.",
        checkDisabled: page === 1,
        checkLabel: "Previous",
        onCheck: () => goToPage(Math.max(1, page - 1) as 1 | 2 | 3 | 4),
        nextDisabled,
        resetDisabled: false,
        onReset: resetCurrentPage,
        onNext: () => {
          if (isStepOne && frameComplete) goToPage(2);
          if (isStepTwo && axisComplete) goToPage(3);
          if (isStepThree && vectorComplete) goToPage(4);
        },
      });
      return;
    }

    setBottomPanel({
      hint: "Use the keyboard controls and watch the live X, Y, Z position values.",
      checkDisabled: false,
      checkLabel: "Previous",
      onCheck: () => goToPage(3),
      nextDisabled: true,
      resetDisabled: false,
      onReset: resetCurrentPage,
    });
  }, [axisComplete, frameComplete, vectorComplete, goToPage, page, resetCurrentPage, setBottomPanel]);

  useEffect(() => resetBottomPanel, [resetBottomPanel]);

  if (page === 4) {
    return <PositionScene />;
  }

  return (
    <section className="grid h-full min-h-0 grid-cols-[minmax(0,1fr)_340px] gap-4 bg-slate-50 p-4 max-lg:grid-cols-1">
      <TeachingScene
        step={page}
        qPosition={qPosition}
        targetPosition={targetPosition}
        axisComplete={axisComplete}
        vectorComplete={vectorComplete}
        resetKey={resetKey}
        onQPositionChange={setQPosition}
        onPresetComplete={() => setTargetPosition(null)}
        onVectorComplete={() => setVectorComplete(true)}
      />
      <LessonPanel
        page={page}
        roomAnswer={roomAnswer}
        canMoveAnswer={canMoveAnswer}
        axisAnswers={axisAnswers}
        axisSubmitted={axisSubmitted}
        qPosition={qPosition}
        vectorComplete={vectorComplete}
        onRoomAnswer={(answer) => {
          setRoomAnswer(answer);
          setCanMoveAnswer("");
        }}
        onCanMoveAnswer={setCanMoveAnswer}
        onAxisAnswerChange={(color, value) => {
          setAxisSubmitted(false);
          setAxisAnswers((current) => ({ ...current, [color]: value }));
        }}
        onAxisSubmit={() => setAxisSubmitted(true)}
        onPreset={(target) => setTargetPosition(target)}
      />
    </section>
  );
}