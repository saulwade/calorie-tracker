import type { Meal, Profile } from "@/db/schema";

export type Alert = { label: string; level: "warn" | "danger" };

// % del límite diario (de UNA comida) que dispara cada alerta. Como hay 3-4
// comidas al día, ~40% lo dispara casi cualquier cosa; usamos ~55% para que
// solo marque lo que de verdad está alto.
const SODIUM_PCT = 0.55; // ~1265 mg de 2300 (una comida salada de a deveras)
const SUGAR_PCT = 0.5; // ~20 g de 40
const CALORIE_PCT = 0.5; // medio día de calorías en una comida

/** Alertas calculadas (sin IA) para una comida según las metas del usuario. */
export function mealAlerts(meal: Meal, p: Profile | null): Alert[] {
  if (!p) return [];
  const out: Alert[] = [];

  if (p.targetSodium > 0 && meal.sodium > p.targetSodium * SODIUM_PCT)
    out.push({ label: "Alto en sodio", level: "danger" });

  if (p.targetSugar > 0 && meal.sugar > p.targetSugar * SUGAR_PCT)
    out.push({ label: "Alto en azúcar", level: "danger" });

  if (p.targetCalories > 0 && meal.calories > p.targetCalories * CALORIE_PCT)
    out.push({ label: "Muchas calorías", level: "warn" });

  if (meal.score > 0 && meal.score < 4)
    out.push({ label: "Poco nutritivo", level: "warn" });

  return out;
}
