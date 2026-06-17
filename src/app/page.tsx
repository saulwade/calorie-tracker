"use client";

import { useCallback, useEffect, useState } from "react";
import type { Meal, Profile } from "@/db/schema";
import { localDay, prettyDay } from "@/lib/dates";
import AddFood from "@/components/AddFood";
import MealCard from "@/components/MealCard";
import Nav from "@/components/Nav";
import { CalorieRing, MacroBar, MicroStat } from "@/components/Stats";

function sum(meals: Meal[], key: keyof Meal): number {
  return meals.reduce((acc, m) => acc + (Number(m[key]) || 0), 0);
}

export default function TodayPage() {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const today = localDay();

  const load = useCallback(async () => {
    const [mRes, pRes] = await Promise.all([
      fetch(`/api/meals?day=${today}`),
      fetch(`/api/profile`),
    ]);
    const mData = await mRes.json();
    const pData = await pRes.json();
    setMeals(mData.meals ?? []);
    setProfile(pData.profile ?? null);
    setLoading(false);
  }, [today]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading || !profile) {
    return (
      <div className="grid min-h-screen place-items-center text-[var(--color-muted)]">
        Cargando…
      </div>
    );
  }

  const totals = {
    calories: sum(meals, "calories"),
    protein: sum(meals, "protein"),
    carbs: sum(meals, "carbs"),
    fat: sum(meals, "fat"),
    fiber: sum(meals, "fiber"),
    sodium: sum(meals, "sodium"),
    sugar: sum(meals, "sugar"),
  };

  return (
    <main className="mx-auto max-w-md px-4 pb-28 pt-6">
      <header className="mb-4">
        <p className="text-sm capitalize text-[var(--color-muted)]">
          {prettyDay(today)}
        </p>
        <h1 className="text-2xl font-bold">Hoy</h1>
      </header>

      <section className="mb-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] card-shadow p-5">
        <div className="mb-5 flex justify-center">
          <CalorieRing
            consumed={totals.calories}
            target={profile.targetCalories}
          />
        </div>
        <div className="space-y-3">
          <MacroBar
            label="Proteína"
            consumed={totals.protein}
            target={profile.targetProtein}
            color="var(--color-protein)"
          />
          <MacroBar
            label="Carbohidratos"
            consumed={totals.carbs}
            target={profile.targetCarbs}
            color="var(--color-carbs)"
          />
          <MacroBar
            label="Grasas"
            consumed={totals.fat}
            target={profile.targetFat}
            color="var(--color-fat)"
          />
        </div>
      </section>

      <section className="mb-4 grid grid-cols-3 gap-2">
        <MicroStat
          label="Fibra"
          consumed={totals.fiber}
          target={profile.targetFiber}
          unit="g"
        />
        <MicroStat
          label="Azúcar"
          consumed={totals.sugar}
          target={profile.targetSugar}
          unit="g"
          goodLow
        />
        <MicroStat
          label="Sodio"
          consumed={totals.sodium}
          target={profile.targetSodium}
          unit="mg"
          goodLow
        />
      </section>

      <section className="mb-4">
        <AddFood onAdded={load} />
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-medium text-[var(--color-muted)]">
          {meals.length === 0
            ? "Aún no registras nada hoy"
            : `Comidas de hoy (${meals.length})`}
        </h2>
        {meals.map((meal) => (
          <MealCard key={meal.id} meal={meal} onDeleted={load} />
        ))}
      </section>

      <Nav />
    </main>
  );
}
