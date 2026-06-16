/**
 * Cálculo de metas nutricionales para pérdida de peso.
 * Basado en Mifflin-St Jeor (BMR) + factor de actividad (TDEE) - déficit.
 */

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2, // poco o nada de ejercicio
  light: 1.375, // ejercicio ligero 1-3 días/semana
  moderate: 1.55, // ejercicio moderado 3-5 días/semana
  active: 1.725, // ejercicio fuerte 6-7 días/semana
  very_active: 1.9, // ejercicio muy fuerte / trabajo físico
};

export interface TargetInput {
  sex: "male" | "female";
  age: number;
  heightCm: number;
  weightKg: number; // peso actual (usamos el de inicio si no hay registro)
  goalWeightKg: number;
  activity: ActivityLevel;
  deficit: number; // kcal/día
}

export interface Targets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  sugar: number;
  tdee: number;
  bmr: number;
}

export function calcTargets(input: TargetInput): Targets {
  const { sex, age, heightCm, weightKg, goalWeightKg, activity, deficit } =
    input;

  // BMR (Mifflin-St Jeor)
  const s = sex === "male" ? 5 : -161;
  const bmr = Math.round(10 * weightKg + 6.25 * heightCm - 5 * age + s);

  // TDEE = gasto total estimado
  const tdee = Math.round(bmr * ACTIVITY_FACTORS[activity]);

  // Meta = TDEE - déficit, con un piso de seguridad (no bajar de ~1200/1500)
  const floor = sex === "male" ? 1500 : 1200;
  const calories = Math.max(floor, tdee - deficit);

  // Proteína: alta para conservar músculo en déficit (~1.8 g/kg del peso meta)
  const protein = Math.round(goalWeightKg * 1.8);

  // Grasa: ~25% de las calorías (9 kcal/g)
  const fat = Math.round((calories * 0.25) / 9);

  // Carbohidratos: el resto de las calorías (4 kcal/g)
  const proteinKcal = protein * 4;
  const fatKcal = fat * 9;
  const carbs = Math.max(0, Math.round((calories - proteinKcal - fatKcal) / 4));

  // Fibra: ~14 g por cada 1000 kcal
  const fiber = Math.round((calories / 1000) * 14);

  // Sodio: límite recomendado
  const sodium = 2300;

  // Azúcar añadida: < 10% de calorías (4 kcal/g)
  const sugar = Math.round((calories * 0.1) / 4);

  return { calories, protein, carbs, fat, fiber, sodium, sugar, tdee, bmr };
}

/** Estima cuántas semanas faltan para llegar a la meta con el déficit actual. */
export function weeksToGoal(
  currentKg: number,
  goalKg: number,
  deficit: number,
): number {
  const kgToLose = Math.max(0, currentKg - goalKg);
  // 1 kg de grasa ≈ 7700 kcal. Pérdida semanal = deficit*7 / 7700
  const weeklyLoss = (deficit * 7) / 7700;
  if (weeklyLoss <= 0) return 0;
  return Math.ceil(kgToLose / weeklyLoss);
}
