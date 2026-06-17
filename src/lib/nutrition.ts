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

  // Meta = TDEE - déficit, con piso de seguridad:
  // nunca bajar del 90% del BMR ni de un mínimo absoluto por sexo.
  // (Comer muy por debajo del BMR no es sostenible ni saludable.)
  const absFloor = sex === "male" ? 1500 : 1200;
  const floor = Math.max(absFloor, Math.round(bmr * 0.9));
  const calories = Math.max(floor, tdee - deficit);

  // Proteína: alta para conservar músculo en déficit (2.0 g/kg del peso meta).
  // Respaldado por ISSN para fases de pérdida de grasa.
  const protein = Math.round(goalWeightKg * 2.0);

  // Grasa: ~25% de las calorías, con piso de grasa esencial (0.6 g/kg de peso actual).
  const fat = Math.max(
    Math.round((calories * 0.25) / 9),
    Math.round(0.6 * weightKg),
  );

  // Carbohidratos: el resto de las calorías (4 kcal/g)
  const proteinKcal = protein * 4;
  const fatKcal = fat * 9;
  const carbs = Math.max(0, Math.round((calories - proteinKcal - fatKcal) / 4));

  // Fibra: ~14 g por cada 1000 kcal (guía Dietary Guidelines / IOM)
  const fiber = Math.round((calories / 1000) * 14);

  // Sodio: límite superior recomendado (AHA/FDA: < 2300 mg/día)
  const sodium = 2300;

  // Azúcar total: límite ≈ 10% de las calorías (guía OMS para azúcares libres, 4 kcal/g)
  const sugar = Math.round((calories * 0.1) / 4);

  return { calories, protein, carbs, fat, fiber, sodium, sugar, tdee, bmr };
}

/**
 * Metas diarias de micronutrientes clave para energía y salud.
 * Hombre adulto 19-30 años. Fuente: DRI/RDA del Institute of Medicine
 * (National Academies). Potasio y omega-3 (ALA) son AI, no RDA.
 */
export type MicroKey =
  | "iron"
  | "potassium"
  | "magnesium"
  | "zinc"
  | "calcium"
  | "vitC"
  | "vitD"
  | "vitB12"
  | "omega3";

export const MICRO_TARGETS: Record<
  MicroKey,
  { label: string; target: number; unit: string }
> = {
  iron: { label: "Hierro", target: 8, unit: "mg" },
  potassium: { label: "Potasio", target: 3400, unit: "mg" },
  magnesium: { label: "Magnesio", target: 400, unit: "mg" },
  zinc: { label: "Zinc", target: 11, unit: "mg" },
  calcium: { label: "Calcio", target: 1000, unit: "mg" },
  vitC: { label: "Vitamina C", target: 90, unit: "mg" },
  vitD: { label: "Vitamina D", target: 15, unit: "mcg" },
  vitB12: { label: "Vitamina B12", target: 2.4, unit: "mcg" },
  omega3: { label: "Omega-3", target: 1.6, unit: "g" },
};

// Orden de despliegue: primero los más ligados a energía.
export const MICRO_ORDER: MicroKey[] = [
  "iron",
  "potassium",
  "magnesium",
  "vitB12",
  "omega3",
  "zinc",
  "calcium",
  "vitC",
  "vitD",
];

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
