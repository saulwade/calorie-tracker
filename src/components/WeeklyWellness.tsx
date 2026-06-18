"use client";

import { useEffect, useState } from "react";
import type { Profile } from "@/db/schema";
import { weeklyWellness, type DayTotals, type Wellness } from "@/lib/wellness";

/** Anillo compacto con el número del score al centro. */
function ScoreRing({ score, color }: { score: number; color: string }) {
  const size = 64;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(score, 100) / 100);
  return (
    <div className="relative grid shrink-0 place-items-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--color-surface-2)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span className="absolute text-lg font-bold tabular-nums">{score}</span>
    </div>
  );
}

export default function WeeklyWellness({ profile }: { profile: Profile }) {
  const [w, setW] = useState<Wellness | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/history?limit=7")
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        const days: DayTotals[] = d.days ?? [];
        setW(weeklyWellness(days, profile));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [profile]);

  if (!w || w.daysLogged === 0) return null;

  return (
    <section className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] soft-shadow p-4">
      <div className="flex items-center gap-4">
        <ScoreRing score={w.score} color={w.color} />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted)]">
            Bienestar de la semana
          </div>
          <div className="text-[17px] font-semibold leading-tight" style={{ color: w.color }}>
            {w.label}
          </div>
          <div className="text-[12px] text-[var(--color-muted)]">
            {w.daysLogged}{" "}
            {w.daysLogged === 1 ? "día registrado" : "días registrados"} esta
            semana
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-[var(--color-border)] pt-3">
        {w.parts.map((p) => {
          const color =
            p.pct >= 80
              ? "var(--color-fat)"
              : p.pct >= 50
                ? "var(--color-protein)"
                : "var(--color-cal)";
          return (
            <div key={p.label}>
              <div className="mb-1 flex items-center justify-between text-[12px]">
                <span className="text-[var(--color-muted)]">{p.label}</span>
                <span className="tabular-nums text-[var(--color-text)]">{p.pct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${p.pct}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
