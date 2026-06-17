import { db, schema } from "@/db";
import { type Profile } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { calcTargets, type ActivityLevel } from "./nutrition";
import { currentTrend } from "./weight";
import { estimateExpenditure } from "./adaptive";

function serverLocalDay(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Peso de TENDENCIA (media móvil), para ajustar el plan sin el ruido del día.
 * Usa todos los registros; si no hay, null.
 */
async function getTrendWeight(): Promise<number | null> {
  const rows = await db
    .select({ day: schema.weights.day, weightKg: schema.weights.weightKg })
    .from(schema.weights);
  return currentTrend(rows);
}

/** Obtiene el perfil (id=1). Si no existe, lo crea con valores por defecto. */
export async function getOrCreateProfile(): Promise<Profile> {
  const rows = await db
    .select()
    .from(schema.profile)
    .where(eq(schema.profile.id, 1));
  if (rows[0]) return rows[0];

  await db.insert(schema.profile).values({ id: 1, updatedAt: Date.now() });
  // Recalcula las metas a partir de los datos por defecto para que sean
  // consistentes con la fórmula desde el primer momento.
  return updateProfile({});
}

type ProfileUpdate = {
  sex?: "male" | "female";
  age?: number;
  heightCm?: number;
  startWeightKg?: number;
  goalWeightKg?: number;
  activity?: ActivityLevel;
  deficit?: number;
  // Si el usuario quiere fijar metas a mano, las pasa; si no, se recalculan.
  manualTargets?: Partial<{
    targetCalories: number;
    targetProtein: number;
    targetCarbs: number;
    targetFat: number;
    targetFiber: number;
    targetSodium: number;
    targetSugar: number;
  }>;
};

/** Actualiza el perfil y recalcula las metas (a menos que se pasen manuales). */
export async function updateProfile(update: ProfileUpdate): Promise<Profile> {
  const current = await getOrCreateProfile();

  // Clamps de seguridad para no corromper los cálculos con valores absurdos.
  const clamp = (v: number, lo: number, hi: number) =>
    Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;

  const merged = {
    sex: update.sex === "female" ? "female" : update.sex === "male" ? "male" : current.sex,
    age: clamp(update.age ?? current.age, 10, 120),
    heightCm: clamp(update.heightCm ?? current.heightCm, 100, 250),
    startWeightKg: clamp(update.startWeightKg ?? current.startWeightKg, 20, 400),
    goalWeightKg: clamp(update.goalWeightKg ?? current.goalWeightKg, 20, 400),
    activity: (update.activity ?? current.activity) as ActivityLevel,
    deficit: clamp(update.deficit ?? current.deficit, 0, 1500),
  };

  // El plan se ajusta a tu peso de TENDENCIA (suavizado), así las metas bajan
  // contigo sin reaccionar al ruido diario. Si no hay registro, usa el inicial.
  const currentWeight = (await getTrendWeight()) ?? merged.startWeightKg;

  const baseInput = {
    sex: merged.sex,
    age: merged.age,
    heightCm: merged.heightCm,
    weightKg: currentWeight,
    goalWeightKg: merged.goalWeightKg,
    activity: merged.activity,
    deficit: merged.deficit,
  };

  // Metas con la fórmula (Mifflin) — también es el respaldo.
  const mifflin = calcTargets(baseInput);

  // ¿Hay datos suficientes para un gasto DINÁMICO (estilo MacroFactor)?
  let estimatedTdee = 0;
  let t = mifflin;
  try {
    const dayCals = await db
      .select({
        day: schema.meals.day,
        calories: sql<number>`sum(${schema.meals.calories})`,
        count: sql<number>`count(*)`,
      })
      .from(schema.meals)
      .groupBy(schema.meals.day);
    const weights = await db
      .select({ day: schema.weights.day, weightKg: schema.weights.weightKg })
      .from(schema.weights);

    const est = estimateExpenditure(dayCals, weights, serverLocalDay());
    if (est) {
      // clamp a ±40% de la fórmula para no dispararse con datos raros
      const clamped = Math.min(
        Math.round(mifflin.tdee * 1.4),
        Math.max(Math.round(mifflin.tdee * 0.6), est.tdee),
      );
      estimatedTdee = clamped;
      t = calcTargets(baseInput, clamped);
    }
  } catch {
    // si algo falla, nos quedamos con la fórmula
  }

  const m = update.manualTargets ?? {};

  await db
    .update(schema.profile)
    .set({
      ...merged,
      targetCalories: m.targetCalories ?? t.calories,
      targetProtein: m.targetProtein ?? t.protein,
      targetCarbs: m.targetCarbs ?? t.carbs,
      targetFat: m.targetFat ?? t.fat,
      targetFiber: m.targetFiber ?? t.fiber,
      targetSodium: m.targetSodium ?? t.sodium,
      targetSugar: m.targetSugar ?? t.sugar,
      estimatedTdee,
      updatedAt: Date.now(),
    })
    .where(eq(schema.profile.id, 1));

  return getOrCreateProfile();
}
