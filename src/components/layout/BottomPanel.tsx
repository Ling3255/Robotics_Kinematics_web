"use client";

interface BottomPanelProps {
  hint?: string;
  onCheck?: () => void;
  onNext?: () => void;
  checkDisabled?: boolean;
  nextDisabled?: boolean;
  checkLabel?: string;
}

export default function BottomPanel({
  hint = "Ready to start. Follow the instructions on screen.",
  onCheck,
  onNext,
  checkDisabled = true,
  nextDisabled = true,
  checkLabel = "Check",
}: BottomPanelProps) {
  return (
    <footer className="fixed bottom-0 left-[220px] right-0 h-14 bg-white border-t border-slate-200 flex items-center px-5 gap-3 z-50">
      {/* Hint */}
      <div className="flex-1 flex items-center gap-2 min-w-0">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex-shrink-0">
          Hint
        </span>
        <span className="text-[13px] text-slate-500 truncate">
          {hint}
        </span>
      </div>

      {/* Check */}
      <button
        onClick={onCheck}
        disabled={checkDisabled}
        className={`
          px-4 py-1.5 rounded-md text-[13px] font-medium border transition-all flex-shrink-0
          ${checkDisabled
            ? "border-slate-200 text-slate-300 cursor-not-allowed"
            : "border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400 cursor-pointer"
          }
        `}
      >
        {checkLabel}
      </button>

      {/* Next */}
      <button
        onClick={onNext}
        disabled={nextDisabled}
        className={`
          px-4 py-1.5 rounded-md text-[13px] font-medium transition-all flex-shrink-0
          ${nextDisabled
            ? "bg-slate-100 text-slate-300 cursor-not-allowed"
            : "bg-slate-800 text-white hover:bg-slate-700 cursor-pointer"
          }
        `}
      >
        Next
      </button>
    </footer>
  );
}
