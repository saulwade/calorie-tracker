"use client";

import { useEffect, useState } from "react";
import { localDay, addDays, calcStreak } from "@/lib/dates";
import { scoreColor } from "./MealRow";

type DayRow = { day: string; score: number; count: number };

const GOOD = 8.5; // umbral de "día excelente" (rumbo al 10/10)

export default function ScoreStreak() {
  const [days, setDays] = useState<DayRow[] | null>(null);
  const today = localDay();

  useEffect(() => {
    let alive = true;
    fetch("/api/history?limit=30")
      .then((r) => r.json())
      .then((d) => {
        if (alive) setDays(d.days ?? []);
      })
      .catch(() => {
        if (alive) setDays([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!days || days.length === 0) return null;

  const byDay = new Map(days.map((d) => [d.day, d]));
  const goodDays = days.filter((d) => d.count > 0 && d.score >= GOOD).map((d) => d.day);
  const streak = calcStreak(goodDays, today);

  // Últimos 14 días (calendario), del más viejo al más nuevo.
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(today, -13 + i));
  const goodCount = last14.filter((day) => {
    const r = byDay.get(day);
    return r && r.count > 0 && r.score >= GOOD;
  }).length;

  return (
    <section className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] soft-shadow p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-[var(--color-muted)]">
            Racha de días excelentes
          </h2>
          <p className="text-[12px] text-[var(--color-muted)]">
            Días con tus comidas en {GOOD}+ de promedio
          </p>
        </div>
        <div className="flex items-baseline gap-1">
          <span
            className="text-3xl font-bold tabular-nums"
            style={{ color: streak > 0 ? "var(--color-cal)" : "var(--color-muted)" }}
          >
            {streak}
          </span>
          <span className="text-[13px] text-[var(--color-muted)]">
            {streak === 1 ? "día" : "días"}
          </span>
        </div>
      </div>

      {/* Dots de los últimos 14 días */}
      <div className="flex items-end justify-between gap-1">
        {last14.map((day) => {
          const r = byDay.get(day);
          const has = r && r.count > 0;
          const color = has ? scoreColor(r!.score) : "var(--color-surface-2)";
          return (
            <div key={day} className="flex flex-1 flex-col items-center gap-1">
              <div
                className="h-7 w-full rounded-md"
                style={{ background: color, opacity: has ? 1 : 0.6 }}
                title={has ? `${day}: ${Math.round(r!.score * 10) / 10}/10` : `${day}: sin registro`}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-[var(--color-muted)]">
        <span>hace 14 días</span>
        <span className="font-medium text-[var(--color-text)]">
          {goodCount}/14 excelentes
        </span>
        <span>hoy</span>
      </div>
    </section>
  );
}
