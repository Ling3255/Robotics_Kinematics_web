interface StepProgressProps {
  current: number; // completed tasks (0-3)
  total: number;   // total tasks (3)
}

export default function StepProgress({ current, total }: StepProgressProps) {
  return (
    <div className="flex items-center gap-1.5 bg-slate-50 rounded-full px-3 py-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <div
            className={`
              rounded-full transition-all duration-300
              ${i < current
                ? "w-2.5 h-2.5 bg-green-500"
                : i === current
                  ? "w-3 h-3 bg-blue-500 ring-2 ring-blue-200"
                  : "w-2.5 h-2.5 bg-slate-300"
              }
            `}
          />
          {i < total - 1 && (
            <div
              className={`w-6 h-0.5 rounded ${
                i < current - 1 ? "bg-green-400" : "bg-slate-200"
              }`}
            />
          )}
        </div>
      ))}
      <span className="text-xs text-slate-500 ml-1 font-medium">
        {current}/{total}
      </span>
    </div>
  );
}
