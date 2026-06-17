"use client";

export function CalorieRing({
  consumed,
  target,
}: {
  consumed: number;
  target: number;
}) {
  const pct = target > 0 ? Math.min(consumed / target, 1) : 0;
  const over = consumed > target;
  const remaining = Math.round(target - consumed);

  const size = 150;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - pct);

  return (
    <div className="relative grid place-items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--color-surface-2)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={over ? "var(--color-danger)" : "var(--color-cal)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-semibold tabular-nums">
          {Math.round(consumed)}
        </span>
        <span className="text-xs text-[var(--color-muted)]">
          de {target} cal
        </span>
        <span
          className={`mt-0.5 text-[13px] font-medium ${
            over ? "text-[var(--color-danger)]" : "text-[var(--color-cal)]"
          }`}
        >
          {over ? `+${Math.abs(remaining)}` : `${remaining} restantes`}
        </span>
      </div>
    </div>
  );
}

export function MacroBar({
  label,
  consumed,
  target,
  color,
  unit = "g",
}: {
  label: string;
  consumed: number;
  target: number;
  color: string;
  unit?: string;
}) {
  const pct = target > 0 ? Math.min((consumed / target) * 100, 100) : 0;
  const over = consumed > target * 1.05;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-[13px]">
        <span className="flex items-center gap-1.5 font-medium text-[var(--color-text)]">
          <span className="h-2 w-2 rounded-full" style={{ background: color }} />
          {label}
        </span>
        <span className="tabular-nums text-[var(--color-muted)]">
          <span className="text-[var(--color-text)]">{Math.round(consumed)}</span>
          {" / "}
          {target}
          {unit}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: over ? "var(--color-danger)" : color }}
        />
      </div>
    </div>
  );
}
