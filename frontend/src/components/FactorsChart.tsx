type Factor = { name: string; weight: number };

export function FactorsChart({ data, color }: { data: Factor[]; color: string }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 w-full min-w-0">
      {data.map((f, i) => {
        const pct = Math.max(0, Math.min(100, f.weight));
        return (
          <div key={i} className="w-full min-w-0">
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <span
                className="text-[13px] font-medium leading-snug"
                style={{ color: 'var(--text-main)' }}
              >
                {f.name}
              </span>
              <span
                className="text-[13px] font-semibold tabular-nums shrink-0"
                style={{ color }}
              >
                {f.weight}
              </span>
            </div>
            <div
              className="h-2 w-full rounded-full overflow-hidden"
              style={{ backgroundColor: 'var(--card-bg)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}