"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { Canvas, useThree } from "@react-three/fiber";
import { GizmoHelper, GizmoViewport, useTexture } from "@react-three/drei";
import { useBottomPanelStore } from "@/store/useBottomPanelStore";

import HintBox from "@/components/ui/HintBox";
import AxisMatchingPanel, { isAxisMatchingComplete } from "./components/AxisMatchingPanel";
import PositionVectorPanel from "./components/PositionVectorPanel";
import ReferenceFrameQuiz from "./components/ReferenceFrameQuiz";
import TeachingScene from "./components/TeachingScene";
import GameScene from "./components/GameScene";
import { INITIAL_Q_POSITION, type AxisChoice, type LessonStep, type Vec3Position } from "./components/types";

function LoadingOverlay() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Force-hide loading overlay after 3 seconds as a deadlock fallback
    const timer = setTimeout(() => setShow(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  return (
    <div className="absolute inset-0 z-[6] flex items-center justify-center bg-gray-50/60 text-sm text-gray-400">
      Loading model...
    </div>
  );
}

function CoordinateOverlay({ posRef }: { posRef: { current: THREE.Vector3 } }) {
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

// ============================================================
// Skybox (equirectangular panorama)
// ============================================================
function Skybox() {
  const texture = useTexture("/skyboxes/skybox-morning.png");
  const { scene } = useThree();

  useEffect(() => {
    const prev = scene.background;
    texture.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = texture;
    scene.environment = texture;
    return () => {
      scene.background = prev;
      scene.environment = null;
    };
  }, [texture, scene]);

  return null;
}

function PositionScene() {
  const posRef = useRef(new THREE.Vector3(0, 0, 0));

  return (
    <div className="relative h-full w-full">
      <Canvas camera={{ position: [0, 5, 10], fov: 45 }} gl={{ antialias: true }}>
        <Skybox />
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 10, 5]} intensity={1} />
        <Suspense fallback={null}>
          {/* Default reference point - a small glowing sphere at origin */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.3} />
          </mesh>
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
  const [showGameHint, setShowGameHint] = useState(false);
  // Quiz stage state (after the 3D coin-collecting game)
  const [quizActive, setQuizActive] = useState(false);
  const [q1Answer, setQ1Answer] = useState<"" | "A" | "B" | "C" | "D">("");
  const [q2Answer, setQ2Answer] = useState<"" | "A" | "B" | "C" | "D">("");
  const [q1Submitted, setQ1Submitted] = useState(false);
  const [q2Submitted, setQ2Submitted] = useState(false);
  const [q1Correct, setQ1Correct] = useState(false);
  const [q2Correct, setQ2Correct] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const router = useRouter();
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

  // When the 3D game is won, wait 2s then switch to the quiz stage
  const handleGameWin = useCallback(() => {
    setTimeout(() => {
      setQuizActive(true);
    }, 2000);
  }, []);

  // Validate Q1 and Q2 independently on submit
  const handleQuizSubmit = useCallback(() => {
    if (q1Answer) {
      setQ1Submitted(true);
      setQ1Correct(q1Answer === "C");
    }
    if (q2Answer) {
      setQ2Submitted(true);
      setQ2Correct(q2Answer === "A");
    }
  }, [q1Answer, q2Answer]);

  // Reset in quiz stage: cancel quiz and return to the 3D map stage
  const handleQuizReset = useCallback(() => {
    setQuizActive(false);
    setQ1Answer("");
    setQ2Answer("");
    setQ1Submitted(false);
    setQ2Submitted(false);
    setQ1Correct(false);
    setQ2Correct(false);
    setShowSuccessModal(false);
    setShowGameHint(false);
    setResetKey((key) => key + 1);
  }, []);

  // When both questions are correct: wait 2s, show green modal, wait 2s, route to /orientation
  useEffect(() => {
    if (!quizActive) return;
    if (!(q1Correct && q2Correct)) return;

    const modalTimer = setTimeout(() => setShowSuccessModal(true), 2000);
    return () => clearTimeout(modalTimer);
  }, [quizActive, q1Correct, q2Correct]);

  useEffect(() => {
    if (!showSuccessModal) return;
    const routeTimer = setTimeout(() => {
      router.push("/orientation");
    }, 2000);
    return () => clearTimeout(routeTimer);
  }, [showSuccessModal, router]);

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

    // Quiz stage bottom panel: Next disabled until both questions are correct
    if (quizActive) {
      setBottomPanel({
        hint: "Answer both questions correctly to continue.",
        checkDisabled: true,
        checkLabel: "Previous",
        nextDisabled: !(q1Correct && q2Correct),
        resetDisabled: false,
        onReset: handleQuizReset,
        onNext: () => {
          if (q1Correct && q2Correct) {
            setShowSuccessModal(true);
          }
        },
      });
      return;
    }

    setBottomPanel({
      hint: "Collect all 8 coins to win! WASD to move, Shift to sprint, Space to jump.",
      checkDisabled: false,
      checkLabel: "Previous",
      onCheck: () => goToPage(3),
      nextDisabled: true,
      resetDisabled: false,
      onReset: resetCurrentPage,
    });
  }, [axisComplete, frameComplete, vectorComplete, goToPage, page, resetCurrentPage, setBottomPanel, quizActive, q1Correct, q2Correct, handleQuizReset]);


  useEffect(() => resetBottomPanel, [resetBottomPanel]);

  // Show the one-time hint modal when entering the game page (page 4)
  useEffect(() => {
    if (page === 4) {
      setShowGameHint(true);
    } else {
      setShowGameHint(false);
    }
  }, [page]);

  if (page === 4) {
    // Quiz stage: pure-color background with the two questions
    if (quizActive) {
      const options: { key: "A" | "B" | "C" | "D"; label: string }[] = [
        { key: "A", label: "The coin objects in the game" },
        { key: "B", label: "The movable ball that collects coins" },
        { key: "C", label: "Fixed reference origin of the game scene (the initial spawn point of the ball)" },
        { key: "D", label: "The end position where the ball moves to" },
      ];

      const renderOption = (
        qKey: "q1" | "q2",
        answer: "" | "A" | "B" | "C" | "D",
        submitted: boolean,
        correct: boolean,
        onSelect: (value: "A" | "B" | "C" | "D") => void
      ) => {
        return options.map((opt) => {
          const isSelected = answer === opt.key;
          const isLocked = submitted && correct;
          const showCorrect = submitted && correct && isSelected;
          const showWrong = submitted && !correct && isSelected;
          return (
            <label
              key={opt.key}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
                isSelected
                  ? "border-slate-500 bg-slate-100"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              } ${isLocked ? "cursor-default opacity-90" : ""}`}
            >
              <input
                type="radio"
                name={qKey}
                value={opt.key}
                checked={isSelected}
                disabled={isLocked}
                onChange={() => onSelect(opt.key)}
                className="h-4 w-4 cursor-pointer accent-slate-700"
              />
              <span className="text-sm text-slate-700">
                <span className="font-semibold">{opt.key}.</span> {opt.label}
              </span>
              {showCorrect && (
                <span className="ml-auto text-lg font-bold text-green-600">✓</span>
              )}
              {showWrong && (
                <span className="ml-auto text-lg font-bold text-red-500">✗</span>
              )}
            </label>
          );
        });
      };

      return (
        <div className="flex h-[calc(100vh-112px)] w-full flex-col items-center overflow-y-auto bg-slate-100 p-8">
          <div className="w-full max-w-3xl">
            <h2 className="mb-6 text-center text-2xl font-bold text-slate-800">
              Quiz
            </h2>

            {/* Q1 */}
            <div className="mb-8 rounded-2xl bg-white p-6 shadow-md">
              <p className="mb-4 text-base font-semibold text-slate-800">
                Q1. What does coordinate system U refer to in the ball coin-collecting game level?
              </p>
              <div className="space-y-2">
                {renderOption(
                  "q1",
                  q1Answer,
                  q1Submitted,
                  q1Correct,
                  (value) => {
                    setQ1Answer(value);
                    setQ1Submitted(false);
                    setQ1Correct(false);
                  }
                )}
              </div>
            </div>

            {/* Q2 */}
            <div className="mb-8 rounded-2xl bg-white p-6 shadow-md">
              <p className="mb-4 text-base font-semibold text-slate-800">
                Q2. What object does symbol Q stand for in this interactive level?
              </p>
              <div className="space-y-2">
                {renderOption(
                  "q2",
                  q2Answer,
                  q2Submitted,
                  q2Correct,
                  (value) => {
                    setQ2Answer(value);
                    setQ2Submitted(false);
                    setQ2Correct(false);
                  }
                )}
              </div>
            </div>

            {/* Submit button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleQuizSubmit}
                disabled={!q1Answer || !q2Answer}
                className="cursor-pointer rounded-lg bg-slate-800 px-8 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Submit
              </button>
            </div>
          </div>

          {/* Green success modal */}
          {showSuccessModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
              <div className="mx-4 max-w-md rounded-2xl border-2 border-green-500 bg-green-50 px-8 py-8 text-center shadow-2xl">
                <p className="text-lg font-semibold leading-relaxed text-green-800">
                  Correct！Let's start learning about the orientation of objects.
                </p>
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <>
        <GameScene resetKey={resetKey} onWin={handleGameWin} />
        {showGameHint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="mx-4 max-w-md rounded-2xl bg-white/90 px-8 py-8 text-center shadow-2xl backdrop-blur">
              <p className="text-lg font-semibold leading-relaxed text-slate-800">
                Try to move the small ball and eat up all the gold coins. Pay attention to observing the changes in the coordinates.
              </p>
              <button
                type="button"
                onClick={() => setShowGameHint(false)}
                className="mt-6 cursor-pointer rounded-lg bg-slate-800 px-8 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }



  return (
    <section className="grid min-h-0 grid-cols-[minmax(0,1fr)_340px] gap-4 bg-slate-50 p-4 max-lg:grid-cols-1 lg:h-[calc(100vh-112px)]">
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