/**
 * Score de comida HÍBRIDO: una parte determinística (señales objetivas) + el
 * juicio de la IA. Así el número es consistente y "perseguir el 10/10" significa
 * de verdad comer bien: alta proteína, sodio y azúcar bajo control, con fibra.
 */

export type ScoreSignals = {
  calories: number;
  protein: number; // g
  fiber: number; // g
  sodium: number; // mg
  sugar: number; // g
};

const clamp = (x: number, lo = 0, hi = 10) => Math.min(hi, Math.max(lo, x));

/**
 * Calidad objetiva de la comida (0-10) por densidades, independiente de la IA.
 * Una comida no es un día, así que se juzga por densidades (por kcal), no por
 * metas diarias.
 */
export function mealQualityScore(s: ScoreSignals): number {
  const cal = s.calories;
  if (!cal || cal <= 0) return 7; // sin datos suficientes: neutral

  let score = 7;

  // Proteína (g por 100 kcal): más densa = más saciante y mejor en déficit.
  const protPer100 = s.protein / (cal / 100);
  if (protPer100 >= 10) score += 1.5;
  else if (protPer100 >= 7) score += 1;
  else if (protPer100 >= 4) score += 0.5;
  else if (protPer100 < 2) score -= 1;

  // Sodio (mg por kcal): saludable ≈ ≤1.15 (2300 mg / ~2000 kcal).
  const naPerKcal = s.sodium / cal;
  if (naPerKcal <= 1.0) score += 0.5;
  else if (naPerKcal <= 1.5) score += 0;
  else if (naPerKcal <= 2.0) score -= 1;
  else score -= 2.5;

  // Azúcar (% de las kcal): penaliza azúcar alto.
  const sugarPct = (s.sugar * 4) / cal;
  if (sugarPct <= 0.1) score += 0.5;
  else if (sugarPct <= 0.2) score += 0;
  else if (sugarPct <= 0.35) score -= 1;
  else score -= 2;

  // Fibra (g por 1000 kcal): objetivo ≈ 14.
  const fiberPer1000 = s.fiber / (cal / 1000);
  if (fiberPer1000 >= 14) score += 1;
  else if (fiberPer1000 >= 8) score += 0.5;
  else if (fiberPer1000 < 4) score -= 0.5;

  return clamp(Math.round(score * 10) / 10);
}

/**
 * Mezcla el score objetivo con el de la IA. Pesa un poco más lo objetivo para
 * que sea consistente, pero deja que la IA aporte contexto (preparación, etc.).
 */
export function blendScore(llmScore: number, signals: ScoreSignals): number {
  const det = mealQualityScore(signals);
  const llm = Number.isFinite(llmScore) ? clamp(llmScore) : det;
  return clamp(Math.round((det * 0.55 + llm * 0.45) * 10) / 10);
}
