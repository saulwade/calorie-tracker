import { db, schema } from "@/db";
import { type Profile } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { calcTargets, type ActivityLevel } from "./nutrition";

/** Peso más reciente registrado (para ajustar el plan automáticamente). */
async function getLatestWeight(): Promise<number | null> {
  const rows = await db
    .select()
    .from(schema.weights)
    .orderBy(desc(schema.weights.day))
    .limit(1);
  return rows[0]?.weightKg ?? null;
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

  const merged = {
    sex: update.sex ?? current.sex,
    age: update.age ?? current.age,
    heightCm: update.heightCm ?? current.heightCm,
    startWeightKg: update.startWeightKg ?? current.startWeightKg,
    goalWeightKg: update.goalWeightKg ?? current.goalWeightKg,
    activity: (update.activity ?? current.activity) as ActivityLevel,
    deficit: update.deficit ?? current.deficit,
  };

  // El plan se ajusta a tu peso MÁS RECIENTE (si ya registraste alguno),
  // así las metas bajan contigo conforme adelgazas. Si no hay registro, usa el inicial.
  const currentWeight = (await getLatestWeight()) ?? merged.startWeightKg;

  const t = calcTargets({
    sex: merged.sex,
    age: merged.age,
    heightCm: merged.heightCm,
    weightKg: currentWeight,
    goalWeightKg: merged.goalWeightKg,
    activity: merged.activity,
    deficit: merged.deficit,
  });

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
      updatedAt: Date.now(),
    })
    .where(eq(schema.profile.id, 1));

  return getOrCreateProfile();
}
