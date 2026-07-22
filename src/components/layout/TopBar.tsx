"use client";

import { usePathname } from "next/navigation";
import { MISSIONS } from "@/content/missions";
import { useProgressStore } from "@/store/useProgressStore";
import StepProgress from "./StepProgress";

export default function TopBar() {
  const pathname = usePathname();
  const { getMissionProgress } = useProgressStore();

  const currentMission = MISSIONS.find((m) => m.path === pathname);
  const progress = currentMission ? getMissionProgress(currentMission.id) : null;

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 fixed top-0 left-0 right-0 z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-[15px] font-semibold text-slate-800 tracking-tight">
          Robotics Kinematics
        </span>
        <span className="w-px h-4 bg-slate-300" />
        <span className="text-[13px] text-slate-400 font-normal">
          EBL Learning Platform
        </span>
      </div>

      <div className="flex-1" />

      {/* Mission indicator */}
      {currentMission && (
        <div className="flex items-center gap-4">
          <span className="text-[13px] text-slate-500">
            <span className="font-semibold text-slate-700">
              Mission {currentMission.id}
            </span>
            <span className="mx-2 text-slate-300">/</span>
            {currentMission.title}
          </span>
          {progress && progress.isUnlocked && (
            <StepProgress current={progress.tasksCompleted} total={3} />
          )}
        </div>
      )}

      {/* Help */}
      <button className="flex-shrink-0 text-[13px] text-slate-400 hover:text-slate-600 transition-colors px-2 py-1 rounded-md hover:bg-slate-50">
        Help
      </button>
    </header>
  );
}
