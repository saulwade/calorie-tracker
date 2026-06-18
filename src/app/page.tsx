"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Meal, Profile, Favorite } from "@/db/schema";
import { localDay, prettyDay, calcStreakInfo } from "@/lib/dates";
import Composer, { type ComposerPayload } from "@/components/Composer";
import MealRow from "@/components/MealRow";
import Nav from "@/components/Nav";
import TotalsBar, { type Totals } from "@/components/TotalsBar";
import NextMealCard from "@/components/NextMealCard";
import { GearIcon, FlameIcon, StarIcon, ClockIcon, CloseIcon } from "@/components/icons";

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
  const [error, setError] = useState(false);
  const [goalsOpen, setGoalsOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const [frozen, setFrozen] = useState(false);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [addingFav, setAddingFav] = useState<number | null>(null);
  const today = localDay();

  const load = useCallback(async () => {
    setError(false);
    try {
      const [mRes, pRes, hRes, fRes] = await Promise.all([
        fetch(`/api/meals?day=${today}`),
        fetch(`/api/profile`),
        fetch(`/api/history?limit=60`),
        fetch(`/api/favorites`),
      ]);
      if (!mRes.ok || !pRes.ok || !hRes.ok || !fRes.ok)
        throw new Error("fetch failed");
      setMeals((await mRes.json()).meals ?? []);
      setProfile((await pRes.json()).profile ?? null);
      const days: { day: string; count: number }[] =
        (await hRes.json()).days ?? [];
      const info = calcStreakInfo(
        days.filter((d) => d.count > 0).map((d) => d.day),
        today,
      );
      setStreak(info.streak);
      setFrozen(info.frozen);
      setFavorites((await fRes.json()).favorites ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [today]);

  async function logFavorite(fav: Favorite) {
    setAddingFav(fav.id);
    await fetch("/api/meals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromFavorite: fav.id, day: today }),
    });
    setAddingFav(null);
    await load();
  }

  async function deleteFavorite(id: number) {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
    await fetch(`/api/favorites?id=${id}`, { method: "DELETE" });
  }

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
    iron: sum(meals, "iron"),
    potassium: sum(meals, "potassium"),
    magnesium: sum(meals, "magnesium"),
    zinc: sum(meals, "zinc"),
    calcium: sum(meals, "calcium"),
    vitC: sum(meals, "vitC"),
    vitD: sum(meals, "vitD"),
    vitB12: sum(meals, "vitB12"),
    omega3: sum(meals, "omega3"),
  };

  // Aviso de "próxima comida" (≈3 h después de la última).
  const lastMealMs = meals.reduce((mx, x) => Math.max(mx, x.loggedAt), 0);
  let nextMealHint = "";
  if (lastMealMs) {
    const diffMin = Math.round((lastMealMs + 3 * 3600_000 - Date.now()) / 60000);
    if (diffMin > 5) {
      const h = Math.floor(diffMin / 60);
      const mm = diffMin % 60;
      nextMealHint = `Próxima comida en ~${h ? `${h} h ` : ""}${mm} min`;
    } else {
      nextMealHint = "Buen momento para tu próxima comida";
    }
  }

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="mx-auto flex max-w-md items-center justify-between px-5 pt-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Hoy</h1>
          <p className="text-[13px] capitalize text-[var(--color-muted)]">
            {prettyDay(today)}
          </p>
          {nextMealHint && (
            <p className="mt-1 flex items-center gap-1 text-[12px] font-medium text-[var(--color-accent)]">
              <ClockIcon size={13} />
              {nextMealHint}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <span
              className="flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[13px] font-semibold tabular-nums text-[var(--color-cal)] soft-shadow"
              aria-label={`Racha de ${streak} días`}
              title={
                frozen
                  ? `Llevas ${streak} días. Saltaste uno, pero tu racha sigue viva (congelada ❄️) — sin dramas.`
                  : `Llevas ${streak} ${streak === 1 ? "día" : "días"} seguidos registrando`
              }
            >
              <FlameIcon size={14} />
              {streak}
              {frozen && <span className="text-[12px]">❄️</span>}
            </span>
          )}
          <Link
            href="/ajustes"
            className="grid h-10 w-10 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)] soft-shadow transition active:scale-95"
            aria-label="Ajustes"
          >
            <GearIcon size={20} />
          </Link>
        </div>
      </header>

      {/* Lista de comidas */}
      <section className="mx-auto max-w-md px-5 pb-[210px] pt-4">
        {favorites.length > 0 && (
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
            {favorites.map((fav) => (
              <div
                key={fav.id}
                className="flex shrink-0 items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] soft-shadow"
              >
                <button
                  onClick={() => logFavorite(fav)}
                  disabled={addingFav === fav.id}
                  className="flex items-center gap-1.5 py-1.5 pl-3 text-[13px] text-[var(--color-text)] transition active:scale-95 disabled:opacity-50"
                >
                  <StarIcon size={13} className="shrink-0 text-[var(--color-accent)]" />
                  <span className="max-w-[150px] truncate">{fav.name}</span>
                  <span className="shrink-0 tabular-nums text-[var(--color-muted)]">
                    {Math.round(fav.calories)}
                  </span>
                </button>
                <button
                  onClick={() => deleteFavorite(fav.id)}
                  className="grid h-7 w-7 shrink-0 place-items-center pr-1 text-[var(--color-muted)] transition active:scale-90"
                  aria-label="Borrar favorito"
                >
                  <CloseIcon size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {profile && meals.length > 0 && (
          <NextMealCard
            totals={totals}
            profile={profile}
            mealsLogged={meals.length}
          />
        )}

        {pending.map((p) => (
          <div
            key={p.tempId}
            className="row-in flex items-start gap-4 border-b border-[var(--color-border)]/70 py-3.5"
          >
            <span className="flex-1 text-[15px] leading-snug text-[var(--color-text)]">
              {p.label}
            </span>
            {p.status === "thinking" ? (
              <span className="shimmer mt-0.5 flex shrink-0 items-center gap-1.5 text-[14px] text-[var(--color-muted)]">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-accent)]" />
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

        {error && (
          <div className="row-in mt-6 rounded-2xl border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/8 px-4 py-3 text-center">
            <p className="text-[14px] text-[var(--color-text)]">
              No pude cargar tus datos.
            </p>
            <button
              onClick={() => {
                setLoading(true);
                load();
              }}
              className="mt-2 rounded-full bg-[var(--color-accent)] px-4 py-1.5 text-[13px] font-medium text-white active:scale-95"
            >
              Reintentar
            </button>
          </div>
        )}

        {loading && meals.length === 0 && !error && (
          <div className="space-y-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-[var(--color-border)]/70 py-3.5"
              >
                <div className="flex flex-1 flex-col gap-2">
                  <div className="shimmer h-3.5 w-2/5 rounded-full bg-[var(--color-surface-2)]" />
                  <div className="shimmer h-2.5 w-1/4 rounded-full bg-[var(--color-surface-2)]" />
                </div>
                <div className="shimmer h-3.5 w-12 rounded-full bg-[var(--color-surface-2)]" />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && meals.length === 0 && pending.length === 0 && (
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
          <MealRow key={meal.id} meal={meal} profile={profile} onChanged={load} />
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
