"use client";

import { useState } from "react";
import TwoLink2DArm from "./TwoLink2DArm";
import RoboViewer from "@/app/robot-basics/RoboViewer";

type View = "2d" | "3d";

export default function ForwardKinematicsPage() {
  const [view, setView] = useState<View>("2d");

  return (
    <div className="flex flex-col h-[calc(100vh-112px)]">
      {/* Header */}
      <div className="flex items-center gap-2 px-8 pt-5 pb-3 shrink-0">
        <button
          onClick={() => setView("2d")}
          className={`px-4 py-2 text-[13px] font-medium rounded-lg transition cursor-pointer border
            ${view === "2d" ? "bg-slate-800 text-white border-slate-800" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}
        >
          Forward Kinematics — 2-Link Planar Arm
        </button>
        <button
          onClick={() => setView("3d")}
          className={`px-4 py-2 text-[13px] font-medium rounded-lg transition cursor-pointer border
            ${view === "3d" ? "bg-slate-800 text-white border-slate-800" : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"}`}
        >
          Forward Kinematics — Advanced 3D
        </button>
        <span className="flex-1" />
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {view === "2d" ? <TwoLink2DArm /> : <RoboViewer />}
      </div>
    </div>
  );
}
