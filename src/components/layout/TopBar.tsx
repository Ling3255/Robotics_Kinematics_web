"use client";

import { usePathname } from "next/navigation";
import { CHAPTERS } from "@/content/chapters";

export default function TopBar() {
  const pathname = usePathname();

  const currentChapter = CHAPTERS.find((ch) => ch.path === pathname);

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

      {/* Chapter indicator */}
      {currentChapter && (
        <div className="flex items-center gap-4">
          <span className="text-[13px] text-slate-500">
            <span className="font-semibold text-slate-700">
              Chapter {currentChapter.id}
            </span>
            <span className="mx-2 text-slate-300">/</span>
            {currentChapter.title}
          </span>
        </div>
      )}

      {/* Help */}
      <button className="flex-shrink-0 text-[13px] text-slate-400 hover:text-slate-600 transition-colors px-2 py-1 rounded-md hover:bg-slate-50">
        Help
      </button>
    </header>
  );
}