"use client";

import dynamic from "next/dynamic";

const ThreeCanvasWrapper = dynamic(
  () => import("@/components/three/ThreeCanvasWrapper"),
  { ssr: false }
);
const RobotArmScene = dynamic(
  () => import("@/components/three/RobotArmScene"),
  { ssr: false }
);

export default function InverseKinematicsPage() {
  return (
    <div style={{
      width: "100%",
      height: "calc(100vh - 112px)",
      padding: 16,
    }}>
      <div style={{
        width: "100%",
        height: "100%",
        borderRadius: 12,
        overflow: "hidden",
        border: "1px solid #e2e8f0",
      }}>
        <ThreeCanvasWrapper>
          <RobotArmScene />
        </ThreeCanvasWrapper>
      </div>
    </div>
  );
}
