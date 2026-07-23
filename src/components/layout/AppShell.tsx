"use client";

import TopBar from "./TopBar";
import ChapterSidebar from "./ChapterSidebar";
import BottomPanel from "./BottomPanel";
import { useBottomPanelStore } from "@/store/useBottomPanelStore";

interface AppShellProps {
  children: React.ReactNode;
  bottomPanel?: {
    hint?: string;
    onCheck?: () => void;
    onNext?: () => void;
    onReset?: () => void;
    checkDisabled?: boolean;
    nextDisabled?: boolean;
    resetDisabled?: boolean;
    checkLabel?: string;
  };
}

export default function AppShell({ children, bottomPanel }: AppShellProps) {
  const configuredBottomPanel = useBottomPanelStore((state) => state.config);
  const panel = bottomPanel ?? configuredBottomPanel;

  return (
    <div className="h-screen overflow-hidden bg-slate-50">
      <TopBar />
      <ChapterSidebar />

      <main className="ml-[220px] mt-14 h-[calc(100vh-112px)] overflow-hidden">
        {children}
      </main>

      <BottomPanel
        hint={panel.hint}
        onCheck={panel.onCheck}
        onNext={panel.onNext}
        onReset={panel.onReset}
        checkDisabled={panel.checkDisabled ?? true}
        nextDisabled={panel.nextDisabled ?? true}
        resetDisabled={panel.resetDisabled ?? true}
        checkLabel={panel.checkLabel}
      />
    </div>
  );
}