"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { IK_PARTS } from "../shared";

interface IKPartLayoutProps {
  current: number; // 1..5
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function IKPartLayout({
  current,
  title,
  subtitle,
  children,
}: IKPartLayoutProps) {
  const router = useRouter();
  const total = IK_PARTS.length;
  const prev = IK_PARTS.find((p) => p.part === current - 1);
  const next = IK_PARTS.find((p) => p.part === current + 1);

  return (
    <div className="flex h-[calc(100vh-112px)] w-full flex-col overflow-hidden bg-slate-50">
      {/* Step bar */}
      <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Inverse Kinematics
          </span>
          <span className="text-slate-300">/</span>
          <span className="text-[13px] font-semibold text-slate-800">
            Part {current} of {total}
          </span>
          <div className="ml-4 flex items-center gap-1.5">
            {IK_PARTS.map((p) => (
              <Link
                key={p.part}
                href={p.path}
                title={`${p.label} — ${p.description}`}
                className={`h-2 rounded-full transition-all cursor-pointer ${
                  p.part < current
                    ? "w-6 bg-emerald-400"
                    : p.part === current
                      ? "w-8 bg-slate-800"
                      : "w-2 bg-slate-200 hover:bg-slate-300"
                }`}
              />
            ))}
          </div>
        </div>
        {/* Current part label */}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-semibold text-slate-900">{title}</span>
          {subtitle && <span className="text-[13px] text-slate-500">{subtitle}</span>}
        </div>
      </div>

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

      {/* Prev / Next footer */}
      <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white px-6 py-3">
        <button
          onClick={() => prev && router.push(prev.path)}
          disabled={!prev}
          className={`px-4 py-1.5 rounded-md text-[13px] font-medium border transition-all ${
            prev
              ? "border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-slate-400 cursor-pointer"
              : "border-slate-200 text-slate-300 cursor-not-allowed"
          }`}
        >
          ← Previous
        </button>

        <div className="flex items-center gap-2 text-[12px] text-slate-400">
          <span className="uppercase tracking-wider">
            {IK_PARTS[current - 1].label}
          </span>
        </div>

        {next ? (
          <button
            onClick={() => router.push(next.path)}
            className="px-5 py-1.5 rounded-md text-[13px] font-medium bg-slate-800 text-white hover:bg-slate-700 transition-all cursor-pointer"
          >
            Next: {next.label} →
          </button>
        ) : (
          <Link
            href="/advanced"
            className="px-5 py-1.5 rounded-md text-[13px] font-medium bg-slate-800 text-white hover:bg-slate-700 transition-all cursor-pointer"
          >
            Continue to Advanced →
          </Link>
        )}
      </div>
    </div>
  );
}
