"use client";

import TopBar from "./TopBar";
import ChapterSidebar from "./ChapterSidebar";
import BottomPanel from "./BottomPanel";

interface AppShellProps {
  children: React.ReactNode;
  /** Bottom panel props — driven by each page */
  bottomPanel?: {
    hint?: string;
    onCheck?: () => void;
    onNext?: () => void;
    checkDisabled?: boolean;
    nextDisabled?: boolean;
    checkLabel?: string;
  };
}

export default function AppShell({ children, bottomPanel }: AppShellProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top navigation bar */}
      <TopBar />

      {/* Left chapter sidebar */}
      <ChapterSidebar />

      {/* Main content area */}
      <main className="mt-14 mb-14 ml-[220px] min-h-[calc(100vh-112px)]">
        {children}
      </main>

      {/* Bottom action panel */}
      <BottomPanel
        hint={bottomPanel?.hint}
        onCheck={bottomPanel?.onCheck}
        onNext={bottomPanel?.onNext}
        checkDisabled={bottomPanel?.checkDisabled ?? true}
        nextDisabled={bottomPanel?.nextDisabled ?? true}
        checkLabel={bottomPanel?.checkLabel}
      />
    </div>
  );
}
