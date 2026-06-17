"use client";

import { useEffect, useState } from "react";
import type { Profile, Weight } from "@/db/schema";
import { localDay, relativeDay } from "@/lib/dates";
import { weeksToGoal } from "@/lib/nutrition";
import { trendSeries, currentTrend, weeklyChange } from "@/lib/weight";
import Nav from "@/components/Nav";
import LineChart from "@/components/LineChart";

function shortDate(day: string) {
  const [, m, d] = day.split("-");
  return `${Number(d)}/${Number(m)}`;
}

export default function WeightPage() {
  const [weights, setWeights] = useState<Weight[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [input, setInput] = useState("");
  const [saving, setSaving] = useState(false);
  const today = localDay();

  async function load() {
    const [wRes, pRes] = await Promise.all([
      fetch("/api/weight"),
      fetch("/api/profile"),
    ]);
    setWeights((await wRes.json()).weights ?? []);
    setProfile((await pRes.json()).profile ?? null);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    const kg = parseFloat(input);
    if (!kg || kg < 30 || kg > 400) return;
    setSaving(true);
    await fetch("/api/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ day: today, weightKg: kg }),
    });
    setInput("");
    setSaving(false);
    load();
  }

  const wpoints = weights.map((w) => ({ day: w.day, weightKg: w.weightKg }));
  const start = profile?.startWeightKg ?? 0;
  const goal = profile?.goalWeightKg ?? 0;
  const latestRaw = weights[0]?.weightKg ?? start;
  const trend = currentTrend(wpoints) ?? latestRaw ?? start;
  const wc = weeklyChange(wpoints);

  const lost = start - trend;
  const totalToLose = start - goal;
  const progressPct =
    totalToLose > 0 ? Math.min(Math.max((lost / totalToLose) * 100, 0), 100) : 0;
  const weeks = profile ? weeksToGoal(trend, goal, profile.deficit) : 0;

  // ¿el dato de hoy está arriba de la tendencia? -> probablemente agua.
  const aboveTrend = latestRaw - trend;

  // gráfica con la TENDENCIA suavizada (línea limpia)
  const series = trendSeries(wpoints);
  const points = series.map((p) => ({
    label: shortDate(p.day),
    value: Math.round(p.trend * 10) / 10,
  }));

  // ritmo semanal
  let rate: { text: string; color: string } | null = null;
  let rateNote = "";
  if (wc) {
    const kg = wc.kgPerWeek;
    const pct = Math.abs(wc.pctPerWeek);
    if (kg < -0.05) {
      rate = {
        text: `Bajando ~${Math.abs(kg).toFixed(2)} kg/sem (${pct.toFixed(1)}%)`,
        color: "var(--color-fat)",
      };
      if (wc.pctPerWeek < -1.0)
        rateNote =
          "Vas algo rápido (>1%/sem). Asegúrate de comer suficiente proteína para no perder músculo.";
    } else if (kg > 0.05) {
      rate = {
        text: `Subiendo ~${kg.toFixed(2)} kg/sem`,
        color: "var(--color-danger)",
      };
    } else {
      rate = { text: "Estable esta semana", color: "var(--color-muted)" };
      if (trend > goal + 0.3)
        rateNote =
          "Tu tendencia está estancada. Si quieres seguir bajando, podríamos ajustar el déficit en Ajustes.";
    }
  }

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Peso</h1>
      </header>

      <section className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] soft-shadow p-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs text-[var(--color-muted)]">
              Tendencia
            </div>
            <div className="text-3xl font-bold tabular-nums">
              {trend.toFixed(1)}
              <span className="text-base font-normal text-[var(--color-muted)]">
                {" "}
                kg
              </span>
            </div>
            {weights.length > 0 && (
              <div className="text-[12px] text-[var(--color-muted)]">
                último: {latestRaw} kg
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs text-[var(--color-muted)]">Meta</div>
            <div className="text-2xl font-semibold tabular-nums text-[var(--color-accent)]">
              {goal} kg
            </div>
          </div>
        </div>

        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]">
          <div
            className="h-full rounded-full bg-[var(--color-accent)] transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-[var(--color-muted)]">
          <span>
            {lost > 0.1 ? `Has bajado ${lost.toFixed(1)} kg` : "Aún sin cambios"}
          </span>
          <span>Faltan {Math.max(0, trend - goal).toFixed(1)} kg</span>
        </div>

        {rate && (
          <div className="mt-3 flex items-center justify-between border-t border-[var(--color-border)] pt-3">
            <span
              className="text-[13px] font-medium"
              style={{ color: rate.color }}
            >
              {rate.text}
            </span>
            {weeks > 0 && (
              <span className="text-[12px] text-[var(--color-muted)]">
                ~{weeks} sem a tu meta
              </span>
            )}
          </div>
        )}
        {rateNote && (
          <p className="mt-2 text-[12px] leading-snug text-[var(--color-muted)]">
            {rateNote}
          </p>
        )}
      </section>

      {/* Aviso de agua: el dato de hoy arriba de la tendencia */}
      {weights.length > 1 && aboveTrend > 0.6 && (
        <section className="mb-4 rounded-2xl border border-[var(--color-cal)]/30 bg-[var(--color-cal)]/8 p-4">
          <p className="text-[13px] leading-relaxed text-[var(--color-text)]">
            Tu peso de hoy está{" "}
            <span className="font-semibold">
              {aboveTrend.toFixed(1)} kg arriba
            </span>{" "}
            de tu tendencia. Eso casi siempre es{" "}
            <span className="font-semibold">agua, no grasa</span> (sal, carbos,
            poco sueño o alcohol del día anterior). Mira la tendencia, no el dato
            del día.
          </p>
        </section>
      )}

      {points.length > 1 && (
        <section className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] soft-shadow p-4">
          <h2 className="mb-2 text-sm font-medium text-[var(--color-muted)]">
            Tendencia
          </h2>
          <LineChart
            points={points}
            color="var(--color-accent)"
            goal={goal}
            unit=" kg"
            height={150}
          />
        </section>
      )}

      <section className="mb-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] soft-shadow p-3">
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tu peso de hoy (kg)"
            className="flex-1 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 outline-none focus:border-[var(--color-accent)]"
          />
          <button
            onClick={save}
            disabled={saving || !input}
            className="rounded-full bg-[var(--color-accent)] px-5 font-medium text-[var(--color-on-accent)] active:scale-95 disabled:opacity-50"
          >
            {saving ? "…" : "Guardar"}
          </button>
        </div>
      </section>

      <p className="mb-4 px-1 text-center text-[12px] leading-relaxed text-[var(--color-muted)]">
        Pésate a diario en ayunas si puedes: la app usa tu{" "}
        <span className="font-medium">tendencia</span> (promedio suavizado), no
        el dato del día, para que el ruido del agua no te confunda.
      </p>

      {weights.length > 0 && (
        <section className="space-y-1.5">
          <h2 className="px-1 text-sm font-medium text-[var(--color-muted)]">
            Registros
          </h2>
          {weights.map((w, i) => {
            const older = weights[i + 1];
            const delta = older ? w.weightKg - older.weightKg : 0;
            return (
              <div
                key={w.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] soft-shadow px-4 py-2.5"
              >
                <span className="flex-1 text-[13px] capitalize text-[var(--color-muted)]">
                  {relativeDay(w.day, today)}
                </span>
                {older && delta !== 0 && (
                  <span
                    className="text-[12px] tabular-nums"
                    style={{
                      color:
                        delta < 0
                          ? "var(--color-fat)"
                          : "var(--color-danger)",
                    }}
                  >
                    {delta < 0 ? "▾" : "▴"} {Math.abs(delta).toFixed(1)}
                  </span>
                )}
                <span className="w-16 text-right font-medium tabular-nums">
                  {w.weightKg} kg
                </span>
              </div>
            );
          })}
        </section>
      )}

      <Nav />
    </main>
  );
}
