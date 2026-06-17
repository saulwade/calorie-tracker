"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Meal, Profile } from "@/db/schema";
import { localDay, prettyDay } from "@/lib/dates";
import Composer, { type ComposerPayload } from "@/components/Composer";
import MealRow from "@/components/MealRow";
import Nav from "@/components/Nav";
import TotalsBar, { type Totals } from "@/components/TotalsBar";
import { GearIcon } from "@/components/icons";

type Pending = {
  tempId: number;
  label: string;
  status: "thinking" | "error";
  error?: string;
};

let tempCounter = 1;

function sum(meals: Meal[], key: keyof Meal): number {
  return meals.reduce((acc, m) => acc + (Number(m[key]) || 0), 0);
}

export default function TodayPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const today = localDay();

  const load = useCallback(async () => {
    const [mRes, pRes] = await Promise.all([
      fetch(`/api/meals?day=${today}`),
      fetch(`/api/profile`),
    ]);
    setMeals((await mRes.json()).meals ?? []);
    setProfile((await pRes.json()).profile ?? null);
    setLoading(false);
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSubmit(p: ComposerPayload) {
    const tempId = tempCounter++;
    const label = p.text || "Analizando foto…";
    setPending((prev) => [{ tempId, label, status: "thinking" }, ...prev]);

    try {
      const res = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...p, day: today }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error");
      setPending((prev) => prev.filter((x) => x.tempId !== tempId));
      await load();
    } catch (err) {
      setPending((prev) =>
        prev.map((x) =>
          x.tempId === tempId
            ? {
                ...x,
                status: "error",
                error: err instanceof Error ? err.message : "Error",
              }
            : x,
        ),
      );
    }
  }

  const totals: Totals = {
    calories: sum(meals, "calories"),
    protein: sum(meals, "protein"),
    carbs: sum(meals, "carbs"),
    fat: sum(meals, "fat"),
    fiber: sum(meals, "fiber"),
    sugar: sum(meals, "sugar"),
    sodium: sum(meals, "sodium"),
  };

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="mx-auto flex max-w-md items-center justify-between px-5 pt-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hoy</h1>
          <p className="text-[13px] capitalize text-[var(--color-muted)]">
            {prettyDay(today)}
          </p>
        </div>
        <Link
          href="/ajustes"
          className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] soft-shadow"
          aria-label="Ajustes"
        >
          <GearIcon size={20} />
        </Link>
      </header>

      {/* Lista de comidas */}
      <section className="mx-auto max-w-md px-5 pb-[210px] pt-4">
        {pending.map((p) => (
          <div
            key={p.tempId}
            className="flex items-start gap-4 border-b border-[var(--color-border)]/70 py-3.5"
          >
            <span className="flex-1 text-[15px] leading-snug text-[var(--color-text)]">
              {p.label}
            </span>
            {p.status === "thinking" ? (
              <span className="shimmer mt-0.5 shrink-0 text-[14px] text-[var(--color-muted)]">
                Pensando…
              </span>
            ) : (
              <button
                onClick={() =>
                  setPending((prev) => prev.filter((x) => x.tempId !== p.tempId))
                }
                className="mt-0.5 shrink-0 text-[13px] text-[var(--color-danger)]"
                title={p.error}
              >
                Error · descartar
              </button>
            )}
          </div>
        ))}

        {!loading && meals.length === 0 && pending.length === 0 && (
          <div className="pt-20 text-center">
            <p className="text-[15px] text-[var(--color-muted)]">
              Aún no registras nada hoy.
            </p>
            <p className="mt-1 text-[13px] text-[var(--color-muted)]">
              Escribe o toma una foto de lo que comes.
            </p>
          </div>
        )}

        {meals.map((meal) => (
          <MealRow key={meal.id} meal={meal} onChanged={load} />
        ))}
      </section>

      {/* Barra inferior: totales (con metas desplegables) + composer */}
      <div className="fixed inset-x-0 bottom-0 z-20 pb-[72px]">
        <div className="space-y-2 pt-2">
          {profile && (
            <TotalsBar
              totals={totals}
              profile={profile}
              open={goalsOpen}
              onToggle={() => setGoalsOpen((o) => !o)}
              day={today}
            />
          )}
          <Composer onSubmit={handleSubmit} />
        </div>
      </div>

      <Nav />
    </main>
  );
}
