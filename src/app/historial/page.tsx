"use client";

import { useEffect, useState } from "react";
import type { Profile } from "@/db/schema";
import { localDay, relativeDay } from "@/lib/dates";
import Nav from "@/components/Nav";

type DayRow = {
  day: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  sugar: number;
  count: number;
};

export default function HistoryPage() {
  const [days, setDays] = useState<DayRow[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const today = localDay();

  useEffect(() => {
    (async () => {
      const [hRes, pRes] = await Promise.all([
        fetch("/api/history?limit=30"),
        fetch("/api/profile"),
      ]);
      const h = await hRes.json();
      const p = await pRes.json();
      setDays(h.days ?? []);
      setProfile(p.profile ?? null);
      setLoading(false);
    })();
  }, []);

  const target = profile?.targetCalories ?? 2000;
  const avg =
    days.length > 0
      ? Math.round(days.reduce((a, d) => a + d.calories, 0) / days.length)
      : 0;

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Historial</h1>
        {days.length > 0 && (
          <p className="text-sm text-[var(--color-muted)]">
            Promedio: <span className="tabular-nums">{avg}</span> kcal/día ·{" "}
            {days.length} días
          </p>
        )}
      </header>

      {loading ? (
        <p className="text-[var(--color-muted)]">Cargando…</p>
      ) : days.length === 0 ? (
        <p className="text-[var(--color-muted)]">Aún no hay datos. ¡Empieza a registrar comidas hoy!</p>
      ) : (
        <div className="space-y-2">
          {days.map((d) => {
            const pct = Math.min((d.calories / target) * 100, 100);
            const over = d.calories > target * 1.05;
            return (
              <div
                key={d.day}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] card-shadow p-3"
              >
                <div className="mb-1.5 flex items-baseline justify-between">
                  <span className="font-medium capitalize">
                    {relativeDay(d.day, today)}
                  </span>
                  <span className="text-sm tabular-nums">
                    <span
                      className={
                        over
                          ? "text-[var(--color-danger)]"
                          : "text-[var(--color-accent)]"
                      }
                    >
                      {Math.round(d.calories)}
                    </span>
                    <span className="text-[var(--color-muted)]">
                      /{target} kcal
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${pct}%`,
                      background: over
                        ? "var(--color-danger)"
                        : "var(--color-accent)",
                    }}
                  />
                </div>
                <div className="mt-1.5 flex gap-3 text-xs text-[var(--color-muted)]">
                  <span className="text-[var(--color-protein)]">
                    P {Math.round(d.protein)}g
                  </span>
                  <span className="text-[var(--color-carbs)]">
                    C {Math.round(d.carbs)}g
                  </span>
                  <span className="text-[var(--color-fat)]">
                    G {Math.round(d.fat)}g
                  </span>
                  <span className="ml-auto">{d.count} comidas</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Nav />
    </main>
  );
}
