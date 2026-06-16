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

  const size = 180;
  const stroke = 14;
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
          stroke={over ? "var(--color-danger)" : "var(--color-accent)"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-bold tabular-nums">
          {Math.round(consumed)}
        </span>
        <span className="text-xs text-[var(--color-muted)]">
          de {target} kcal
        </span>
        <span
          className={`mt-1 text-sm font-medium ${
            over ? "text-[var(--color-danger)]" : "text-[var(--color-accent)]"
          }`}
        >
          {over ? `+${Math.abs(remaining)} pasado` : `${remaining} restantes`}
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
      <div className="mb-1 flex items-baseline justify-between text-sm">
        <span className="font-medium" style={{ color }}>
          {label}
        </span>
        <span className="tabular-nums text-[var(--color-muted)]">
          {Math.round(consumed)}
          <span className="opacity-60">
            /{target}
            {unit}
          </span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: over ? "var(--color-danger)" : color,
          }}
        />
      </div>
    </div>
  );
}

export function MicroStat({
  label,
  consumed,
  target,
  unit,
  goodLow = false,
}: {
  label: string;
  consumed: number;
  target: number;
  unit: string;
  goodLow?: boolean;
}) {
  // goodLow = quieres quedar POR DEBAJO (sodio, azúcar). Verde si bajo, rojo si pasado.
  const over = consumed > target;
  const color = goodLow
    ? over
      ? "var(--color-danger)"
      : "var(--color-accent)"
    : "var(--color-text)";
  return (
    <div className="rounded-xl bg-[var(--color-surface-2)] p-3 text-center">
      <div className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">
        {label}
      </div>
      <div className="mt-1 tabular-nums" style={{ color }}>
        <span className="text-lg font-semibold">{Math.round(consumed)}</span>
        <span className="text-xs text-[var(--color-muted)]">
          /{target}
          {unit}
        </span>
      </div>
    </div>
  );
}
