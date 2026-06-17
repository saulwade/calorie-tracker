/**
 * Peso de TENDENCIA: suaviza el ruido diario (agua, glucógeno, sal, sueño)
 * con una media móvil exponencial (EWMA), como hacen MacroFactor / Libra.
 * La tendencia es lo que importa para decidir, no el dato del día.
 */
export type WPoint = { day: string; weightKg: number };
export type TrendPoint = { day: string; raw: number; trend: number };

// Constante de tiempo (días): la tendencia "converge" en ~TAU días, sin importar
// si registras a diario o cada semana (EWMA consciente del tiempo).
const TAU = 10;

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const da = new Date(ay, am - 1, ad).getTime();
  const db = new Date(by, bm - 1, bd).getTime();
  return Math.round((db - da) / 86400000);
}

/** Serie cronológica con peso crudo y tendencia (EWMA ponderada por tiempo). */
export function trendSeries(points: WPoint[]): TrendPoint[] {
  const sorted = [...points].sort((a, b) => a.day.localeCompare(b.day));
  let t = 0;
  let prevDay = "";
  return sorted.map((p, i) => {
    if (i === 0) {
      t = p.weightKg;
    } else {
      const dt = Math.max(1, daysBetween(prevDay, p.day));
      const alpha = 1 - Math.exp(-dt / TAU);
      t = t + alpha * (p.weightKg - t);
    }
    prevDay = p.day;
    return { day: p.day, raw: p.weightKg, trend: Math.round(t * 100) / 100 };
  });
}

/** Tendencia actual (último valor suavizado). */
export function currentTrend(points: WPoint[]): number | null {
  const s = trendSeries(points);
  return s.length ? s[s.length - 1].trend : null;
}

/**
 * Cambio por semana según la tendencia (kg/sem y % del peso/sem).
 * Negativo = bajando. null si no hay suficientes datos.
 */
export function weeklyChange(
  points: WPoint[],
): { kgPerWeek: number; pctPerWeek: number } | null {
  const s = trendSeries(points);
  if (s.length < 2) return null;
  const last = s[s.length - 1];
  // referencia: el punto más cercano a 7 días antes; si no hay tan viejo, el primero.
  let ref = s[0];
  for (const p of s) {
    if (daysBetween(p.day, last.day) >= 7) ref = p;
  }
  const span = daysBetween(ref.day, last.day);
  if (span <= 0) return null;
  const kgPerWeek = ((last.trend - ref.trend) / span) * 7;
  const pctPerWeek = last.trend > 0 ? (kgPerWeek / last.trend) * 100 : 0;
  return {
    kgPerWeek: Math.round(kgPerWeek * 100) / 100,
    pctPerWeek: Math.round(pctPerWeek * 100) / 100,
  };
}
