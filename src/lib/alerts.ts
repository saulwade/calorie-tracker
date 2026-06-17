import type { Meal, Profile } from "@/db/schema";

export type Alert = { label: string; level: "warn" | "danger" };

// % del límite diario (de una sola comida) que dispara la alerta.
const THRESHOLD = 0.4;

/** Alertas calculadas (sin IA) para una comida según las metas del usuario. */
export function mealAlerts(meal: Meal, p: Profile | null): Alert[] {
  if (!p) return [];
  const out: Alert[] = [];

  if (p.targetSodium > 0 && meal.sodium > p.targetSodium * THRESHOLD)
    out.push({ label: "Alto en sodio", level: "danger" });

  if (p.targetSugar > 0 && meal.sugar > p.targetSugar * THRESHOLD)
    out.push({ label: "Alto en azúcar", level: "danger" });

  if (p.targetCalories > 0 && meal.calories > p.targetCalories * THRESHOLD)
    out.push({ label: "Muchas calorías", level: "warn" });

  if (meal.score > 0 && meal.score < 4)
    out.push({ label: "Poco nutritivo", level: "warn" });

  return out;
}
