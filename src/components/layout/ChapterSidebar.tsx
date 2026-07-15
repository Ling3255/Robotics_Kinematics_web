"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { CHAPTERS } from "@/content/chapters";
import { useProgressStore } from "@/store/useProgressStore";

export default function ChapterSidebar() {
  const pathname = usePathname();
  const { getChapterProgress } = useProgressStore();

  return (
    <nav className="fixed top-14 left-0 bottom-14 w-[220px] bg-white border-r border-slate-200 flex flex-col py-6 overflow-y-auto z-40">
      {/* Header */}
      <div className="px-5 mb-5">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.15em]">
          Chapters
        </p>
      </div>

      {/* Chapter list */}
      <div className="flex flex-col gap-0.5 px-3">
        {CHAPTERS.map((ch) => {
          const isActive = pathname === ch.path;
          const progress = getChapterProgress(ch.id);
          const isLocked = !progress.isUnlocked;
          const isDone = progress.tasksCompleted >= 3;

          return (
            <Link
              key={ch.id}
              href={isLocked ? "#" : ch.path}
              onClick={(e) => {
                if (isLocked) e.preventDefault();
              }}
              className={`
                group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm
                transition-all duration-150
                ${isActive
                  ? "bg-slate-100 text-slate-900 font-medium"
                  : isLocked
                    ? "text-slate-300 cursor-not-allowed"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }
              `}
              title={isLocked ? `Complete Chapter ${ch.id - 1} to unlock` : ch.description}
            >
              {/* Number */}
              <span
                className={`
                  flex items-center justify-center w-7 h-7 rounded-md text-xs font-semibold flex-shrink-0
                  transition-colors duration-150
                  ${isActive
                    ? "bg-slate-800 text-white"
                    : isDone
                      ? "bg-emerald-50 text-emerald-600"
                      : isLocked
                        ? "bg-slate-50 text-slate-300"
                        : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                  }
                `}
              >
                {String(ch.id).padStart(2, "0")}
              </span>

              {/* Title */}
              <span className="truncate flex-1">{ch.title}</span>

              {/* Status */}
              {isDone && (
                <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
              {isLocked && (
                <svg className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" strokeLinecap="round" />
                </svg>
              )}
              {isActive && !isDone && (
                <span className="w-1.5 h-1.5 rounded-full bg-slate-800 flex-shrink-0" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-auto pt-4 px-5">
        <div className="border-t border-slate-100 pt-4">
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Robotics Kinematics
          </p>
        </div>
      </div>
    </nav>
  );
}
