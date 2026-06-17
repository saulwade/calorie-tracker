"use client";

import { useEffect, useState } from "react";
import type { Profile } from "@/db/schema";
import { localDay, relativeDay } from "@/lib/dates";
import Nav from "@/components/Nav";
import LineChart from "@/components/LineChart";
import { scoreColor } from "@/components/MealRow";
import { SparkleIcon } from "@/components/icons";

function shortDate(day: string) {
  const [, m, d] = day.split("-");
  return `${Number(d)}/${Number(m)}`;
}

type WeekCoaching = {
  weekScore: number;
  verdict: string;
  tendencia: string;
  good: string[];
  improve: string[];
};

const LS_WEEK = "pct_week";
const LS_WEEK_DAY = "pct_week_day";

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
  const [week, setWeek] = useState<WeekCoaching | null>(null);
  const [weekLoading, setWeekLoading] = useState(false);
  const [weekMsg, setWeekMsg] = useState("");
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

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LS_WEEK);
      const storedDay = localStorage.getItem(LS_WEEK_DAY);
      if (stored && storedDay === today) setWeek(JSON.parse(stored));
    } catch {}
  }, [today]);

  async function evaluateWeek() {
    setWeekLoading(true);
    setWeekMsg("");
    try {
      const res = await fetch("/api/coach/week");
      const data = await res.json();
      if (data.empty) {
        setWeekMsg(data.message);
        setWeek(null);
      } else if (!res.ok) {
        setWeekMsg(data.error ?? "Error");
      } else {
        setWeek(data.coaching);
        try {
          localStorage.setItem(LS_WEEK, JSON.stringify(data.coaching));
          localStorage.setItem(LS_WEEK_DAY, today);
        } catch {}
      }
    } catch {
      setWeekMsg("No se pudo generar el resumen. Intenta de nuevo.");
    } finally {
      setWeekLoading(false);
    }
  }

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

      <section className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] soft-shadow p-4">
        {!week ? (
          <button
            onClick={evaluateWeek}
            disabled={weekLoading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] py-2.5 text-[14px] font-medium text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {weekLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                Analizando tu semana…
              </>
            ) : (
              <>
                <SparkleIcon size={15} />
                Resumen de la semana con el nutriólogo
              </>
            )}
          </button>
        ) : (
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div
                className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-[17px] font-bold tabular-nums text-white"
                style={{ background: scoreColor(week.weekScore) }}
              >
                {Math.round(week.weekScore * 10) / 10}
              </div>
              <div>
                <p className="text-[13px] leading-snug text-[var(--color-text)]">
                  {week.verdict}
                </p>
                {week.tendencia && (
                  <p className="mt-0.5 text-[12px] leading-snug text-[var(--color-muted)]">
                    {week.tendencia}
                  </p>
                )}
              </div>
            </div>
            {week.good.length > 0 && (
              <ul className="mb-2 space-y-1">
                {week.good.map((g, i) => (
                  <li key={i} className="flex gap-2 text-[13px] text-[var(--color-text)]">
                    <span style={{ color: "var(--color-fat)" }}>✓</span>
                    {g}
                  </li>
                ))}
              </ul>
            )}
            {week.improve.length > 0 && (
              <ul className="space-y-1">
                {week.improve.map((t, i) => (
                  <li key={i} className="flex gap-2 text-[13px] text-[var(--color-text)]">
                    <span style={{ color: "var(--color-accent)" }}>→</span>
                    {t}
                  </li>
                ))}
              </ul>
            )}
            <button
              onClick={evaluateWeek}
              disabled={weekLoading}
              className="mt-3 text-[12px] text-[var(--color-muted)] underline"
            >
              {weekLoading ? "Analizando…" : "Volver a generar"}
            </button>
          </div>
        )}
        {weekMsg && (
          <p className="mt-2 text-center text-[13px] text-[var(--color-muted)]">
            {weekMsg}
          </p>
        )}
      </section>

      {days.length > 1 && (
        <section className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] soft-shadow p-4">
          <h2 className="mb-2 text-sm font-medium text-[var(--color-muted)]">
            Calorías por día
          </h2>
          <LineChart
            points={[...days]
              .reverse()
              .map((d) => ({
                label: shortDate(d.day),
                value: Math.round(d.calories),
              }))}
            color="var(--color-cal)"
            goal={target}
            height={150}
          />
        </section>
      )}

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
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] soft-shadow p-3"
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
