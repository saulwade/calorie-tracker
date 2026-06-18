/**
 * Score de "bienestar" de la semana (0-100), a partir de los totales por día
 * que devuelve /api/history. Mezcla constancia + qué tan bien pegaste a tus
 * metas (calorías, proteína, fibra, sodio). Es una guía motivacional, no un
 * diagnóstico: tono amable, sin castigar.
 */
import type { Profile } from "@/db/schema";

export type DayTotals = {
  day: string;
  calories: number;
  protein: number;
  fiber: number;
  sodium: number;
  count: number;
};

export type Wellness = {
  score: number; // 0-100
  label: string;
  color: string;
  daysLogged: number;
  parts: { label: string; pct: number }[]; // 0-100 cada uno
};

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function colorFor(score: number): string {
  if (score >= 80) return "var(--color-fat)"; // verde
  if (score >= 60) return "var(--color-protein)"; // ámbar
  if (score >= 40) return "var(--color-cal)"; // naranja
  return "var(--color-danger)"; // rojo
}

function labelFor(score: number): string {
  if (score >= 85) return "Excelente semana";
  if (score >= 70) return "Buena semana";
  if (score >= 50) return "Vas bien";
  if (score >= 30) return "Puedes mejorar";
  return "Apenas arrancando";
}

/**
 * @param days  totales por día (los más recientes), idealmente últimos 7
 * @param profile  metas del usuario
 */
export function weeklyWellness(days: DayTotals[], profile: Profile): Wellness {
  const week = days.slice(0, 7);
  const logged = week.filter((d) => d.count > 0);
  const n = logged.length;

  // Constancia: días registrados de 7.
  const consistency = clamp01(n / 7);

  // Si no hay días, score base por constancia (0).
  if (n === 0) {
    const score = 0;
    return {
      score,
      label: labelFor(score),
      color: colorFor(score),
      daysLogged: 0,
      parts: [
        { label: "Constancia", pct: 0 },
        { label: "Calorías", pct: 0 },
        { label: "Proteína", pct: 0 },
        { label: "Fibra", pct: 0 },
      ],
    };
  }

  const avg = (sel: (d: DayTotals) => number) =>
    logged.reduce((a, d) => a + sel(d), 0) / n;

  // Calorías: pega a la meta (banda ±50% del objetivo = 0).
  const calTarget = profile.targetCalories || 1;
  const calorieFit =
    logged.reduce((a, d) => {
      const off = Math.abs(d.calories - calTarget) / (calTarget * 0.5);
      return a + clamp01(1 - off);
    }, 0) / n;

  // Proteína / fibra: cuánto del objetivo alcanzaste en promedio (tope 1).
  const proteinFit = clamp01(avg((d) => d.protein) / (profile.targetProtein || 1));
  const fiberFit = clamp01(avg((d) => d.fiber) / (profile.targetFiber || 1));

  // Sodio: por debajo del límite = perfecto; arriba baja.
  const naAvg = avg((d) => d.sodium);
  const sodiumFit =
    naAvg <= profile.targetSodium
      ? 1
      : clamp01(1 - (naAvg - profile.targetSodium) / profile.targetSodium);

  const score = Math.round(
    100 *
      (0.3 * consistency +
        0.25 * calorieFit +
        0.25 * proteinFit +
        0.1 * fiberFit +
        0.1 * sodiumFit),
  );

  return {
    score,
    label: labelFor(score),
    color: colorFor(score),
    daysLogged: n,
    parts: [
      { label: "Constancia", pct: Math.round(consistency * 100) },
      { label: "Calorías", pct: Math.round(calorieFit * 100) },
      { label: "Proteína", pct: Math.round(proteinFit * 100) },
      { label: "Fibra", pct: Math.round(fiberFit * 100) },
    ],
  };
}
