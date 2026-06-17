"use client";

import { useEffect, useState } from "react";
import type { Profile, Weight } from "@/db/schema";
import { localDay, relativeDay } from "@/lib/dates";
import { weeksToGoal } from "@/lib/nutrition";
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
    const w = await wRes.json();
    const p = await pRes.json();
    setWeights(w.weights ?? []);
    setProfile(p.profile ?? null);
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

  const current = weights[0]?.weightKg ?? profile?.startWeightKg ?? 0;
  const start = profile?.startWeightKg ?? current;
  const goal = profile?.goalWeightKg ?? current;
  const lost = start - current;
  const totalToLose = start - goal;
  const progressPct =
    totalToLose > 0 ? Math.min((lost / totalToLose) * 100, 100) : 0;
  const weeks = profile
    ? weeksToGoal(current, goal, profile.deficit)
    : 0;

  // puntos para la gráfica (cronológico: viejo -> nuevo)
  const points = [...weights]
    .reverse()
    .map((w) => ({ label: shortDate(w.day), value: w.weightKg }));

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Peso</h1>
      </header>

      <section className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] soft-shadow p-5">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs text-[var(--color-muted)]">Actual</div>
            <div className="text-3xl font-bold tabular-nums">
              {current}
              <span className="text-base font-normal text-[var(--color-muted)]">
                {" "}
                kg
              </span>
            </div>
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
            {lost > 0
              ? `Has bajado ${lost.toFixed(1)} kg`
              : "Aún sin cambios"}
          </span>
          <span>
            Faltan {Math.max(0, current - goal).toFixed(1)} kg
          </span>
        </div>
        {weeks > 0 && (
          <p className="mt-2 text-center text-xs text-[var(--color-muted)]">
            A este ritmo, ~{weeks} semanas para tu meta.
          </p>
        )}
      </section>

      {points.length > 1 && (
        <section className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] soft-shadow p-4">
          <h2 className="mb-2 text-sm font-medium text-[var(--color-muted)]">
            Evolución
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
            placeholder={`Tu peso de hoy (kg)`}
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
        Tu plan se ajusta solo cada que registras tu peso. Pésate ~1 vez por
        semana, en ayunas y sin ropa, para un dato confiable (el peso diario
        sube y baja por agua).
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
