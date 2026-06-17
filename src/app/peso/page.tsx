"use client";

import { useEffect, useState } from "react";
import type { Profile, Weight } from "@/db/schema";
import { localDay, relativeDay } from "@/lib/dates";
import { weeksToGoal } from "@/lib/nutrition";
import Nav from "@/components/Nav";

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

  // min/max para escalar la mini-gráfica
  const vals = weights.map((w) => w.weightKg);
  const minV = Math.min(goal, ...vals, current);
  const maxV = Math.max(start, ...vals, current);
  const range = maxV - minV || 1;

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-6">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Peso</h1>
      </header>

      <section className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] card-shadow p-5">
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
            A este ritmo, ~{weeks} semanas para tu meta 💪
          </p>
        )}
      </section>

      <section className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] card-shadow p-3">
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

      {weights.length > 0 && (
        <section className="space-y-1.5">
          <h2 className="px-1 text-sm font-medium text-[var(--color-muted)]">
            Registros
          </h2>
          {weights.map((w) => {
            const pos = ((maxV - w.weightKg) / range) * 100;
            return (
              <div
                key={w.id}
                className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] card-shadow px-3 py-2"
              >
                <span className="w-20 text-xs capitalize text-[var(--color-muted)]">
                  {relativeDay(w.day, today)}
                </span>
                <div className="relative h-1.5 flex-1 rounded-full bg-[var(--color-surface-2)]">
                  <div
                    className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-[var(--color-accent)]"
                    style={{ left: `calc(${pos}% - 6px)` }}
                  />
                </div>
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
