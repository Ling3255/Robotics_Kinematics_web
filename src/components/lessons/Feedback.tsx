"use client";

import { type ReactNode } from "react";

export type FeedbackVariant = "success" | "info" | "warning" | "error";

interface FeedbackProps {
  variant: FeedbackVariant;
  title?: string;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<FeedbackVariant, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-700",
  info: "border-blue-200 bg-blue-50 text-blue-700",
  warning: "border-amber-200 bg-amber-50 text-amber-700",
  error: "border-red-200 bg-red-50 text-red-700",
};

export default function Feedback({ variant, title, children, className = "" }: FeedbackProps) {
  return (
    <div className={`rounded-xl border p-4 text-sm font-semibold leading-6 ${variantStyles[variant]} ${className}`}>
      {title && <p className="mb-1 text-xs font-bold uppercase tracking-[0.14em] opacity-60">{title}</p>}
      {children}
    </div>
  );
}