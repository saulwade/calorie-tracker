/**
 * Método de la mano (Precision Nutrition) — porciones sin pesar, ~95% precisas.
 * Valores para hombre:
 *  - Palma  = proteína (~24 g proteína)
 *  - Puño   = verdura  (libre)
 *  - Mano ahuecada = carbohidrato (~25 g carb)
 *  - Pulgar = grasa (~9 g grasa)
 */
export const PALM_PROTEIN_G = 24;
export const CUPPED_CARB_G = 25;
export const THUMB_FAT_G = 9;

export interface HandTargets {
  palmas: number; // proteína
  manos: number; // carbohidrato
  pulgares: number; // grasa
}

export function toHands(t: {
  protein: number;
  carbs: number;
  fat: number;
}): HandTargets {
  return {
    palmas: Math.max(1, Math.round(t.protein / PALM_PROTEIN_G)),
    manos: Math.max(1, Math.round(t.carbs / CUPPED_CARB_G)),
    pulgares: Math.max(1, Math.round(t.fat / THUMB_FAT_G)),
  };
}

/** Proteína objetivo por comida (reparte la diaria en `meals` comidas). */
export function proteinPerMeal(dailyProtein: number, meals = 4): number {
  return Math.round(dailyProtein / meals);
}
