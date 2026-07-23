"use client";

import { useState, type ReactNode } from "react";

interface HintBoxProps {
  /** Content shown when the hint box is expanded */
  children: ReactNode;
  /** Optional replay button callback. Omit to hide the Replay button. */
  onReplay?: () => void;
  /** Replay button label (default: "Replay") */
  replayLabel?: string;
  /** Accessible label for the collapsed question-mark button */
  hintLabel?: string;
  /** Additional className for the wrapper */
  className?: string;
}

export default function HintBox({
  children,
  onReplay,
  replayLabel = "Replay",
  hintLabel = "Show controls",
  className = "",
}: HintBoxProps) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className={`absolute left-4 top-4 z-10 flex flex-col items-start gap-2 ${className}`}>
      {/* Replay button — only shown when provided */}
      {onReplay && (
        <button
          onClick={onReplay}
          className="rounded-lg bg-white/90 px-4 py-2 text-sm font-medium text-gray-700 shadow-lg backdrop-blur hover:bg-white transition-colors cursor-pointer"
        >
          {replayLabel}
        </button>
      )}

      {/* Collapsible hints */}
      {collapsed ? (
        <button
          onClick={() => setCollapsed(false)}
          className="rounded-lg bg-white/90 p-2 text-gray-500 shadow-lg backdrop-blur hover:bg-white hover:text-gray-700 transition-colors cursor-pointer"
          aria-label={hintLabel}
          title={hintLabel}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        </button>
      ) : (
        <div className="rounded-lg bg-white/90 px-3 py-2 text-xs leading-5 text-gray-600 shadow-lg backdrop-blur">
          {children}
          <div className="mt-1 flex justify-end">
            <button
              onClick={() => setCollapsed(true)}
              className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              aria-label="Hide hints"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M5 12h14" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
