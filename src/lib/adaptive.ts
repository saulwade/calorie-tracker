/**
 * Gasto energético DINÁMICO (estilo MacroFactor): en vez de confiar solo en la
 * fórmula (Mifflin), estima tu gasto REAL a partir de balance de energía:
 *
 *   gasto ≈ calorías promedio que comiste − (cambio de peso × 7700 / días)
 *
 * Necesita datos: varios días registrados + tendencia de peso en una ventana.
 * Si no hay suficientes, devuelve null y se usa la fórmula.
 */
import { trendSeries, type WPoint } from "./weight";

const KCAL_PER_KG = 7700;
const WINDOW_DAYS = 21; // mira las últimas ~3 semanas
const MIN_LOGGED_DAYS = 10; // necesita al menos 10 días con registro
const MIN_SPAN_DAYS = 10; // y tendencia de peso de al menos 10 días

export interface DayCals {
  day: string; // YYYY-MM-DD
  calories: number;
  count: number; // nº de comidas ese día
}

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  return Math.round(
    (new Date(by, bm - 1, bd).getTime() - new Date(ay, am - 1, ad).getTime()) /
      86400000,
  );
}

export interface ExpenditureEstimate {
  tdee: number;
  loggedDays: number;
  spanDays: number;
}

/**
 * Estima el gasto (TDEE) real. `today` en YYYY-MM-DD. Devuelve null si faltan datos.
 */
export function estimateExpenditure(
  dayCals: DayCals[],
  weights: WPoint[],
  today: string,
): ExpenditureEstimate | null {
  // Días con registro real dentro de la ventana.
  const logged = dayCals.filter(
    (d) => d.count > 0 && daysBetween(d.day, today) <= WINDOW_DAYS,
  );
  if (logged.length < MIN_LOGGED_DAYS) return null;

  const avgIntake =
    logged.reduce((a, d) => a + d.calories, 0) / logged.length;

  // Tendencia de peso en la ventana.
  const series = trendSeries(
    weights.filter((w) => daysBetween(w.day, today) <= WINDOW_DAYS),
  );
  if (series.length < 2) return null;
  const last = series[series.length - 1];
  const first = series[0];
  const span = daysBetween(first.day, last.day);
  if (span < MIN_SPAN_DAYS) return null;

  const trendDeltaKg = last.trend - first.trend; // negativo = bajó
  const dailyBalance = (trendDeltaKg * KCAL_PER_KG) / span; // kcal/día de balance
  const tdee = Math.round(avgIntake - dailyBalance);

  return { tdee, loggedDays: logged.length, spanDays: span };
}
