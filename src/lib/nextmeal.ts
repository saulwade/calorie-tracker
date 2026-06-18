/**
 * Recomendación para la PRÓXIMA comida, en tiempo real y sin IA (gratis).
 * Mira lo que llevas hoy vs tus metas y te dice qué sumar (para macros/micros,
 * sobre todo energía) y qué evitar (sodio). Pensado para empujarte a 10/10.
 */
import type { Profile } from "@/db/schema";
import { MICRO_TARGETS, MICRO_ORDER, type MicroKey } from "./nutrition";

export type NextRec = { kind: "macro" | "add" | "avoid" | "ok"; text: string };

export type NextMealPlan = {
  tone: "ok" | "warn";
  headline: string;
  recs: NextRec[];
};

export type MicroTotals = Record<MicroKey, number>;

export type NextMealInput = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
} & MicroTotals;

// Alimentos accesibles en México ricos en cada micro (para sugerir).
const MICRO_FOODS: Record<MicroKey, string> = {
  iron: "espinaca, frijol o carne roja",
  potassium: "plátano, aguacate o frijol",
  magnesium: "espinaca, almendra o avena",
  zinc: "carne, garbanzo o semillas de calabaza",
  calcium: "lácteos, tortilla de maíz o sardina",
  vitC: "guayaba, naranja o pimiento",
  vitD: "salmón, atún o huevo (con yema)",
  vitB12: "huevo, carne o pescado",
  omega3: "salmón, atún, chía o nuez",
};

/** Micros bajos del día (< umbral del objetivo), de más a menos rezagado. */
function lowMicros(t: NextMealInput, threshold = 0.5) {
  return MICRO_ORDER.map((k) => {
    const meta = MICRO_TARGETS[k];
    const ratio = meta.target > 0 ? (t[k] || 0) / meta.target : 1;
    return { k, ratio, label: meta.label };
  })
    .filter((x) => x.ratio < threshold)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 3);
}

/**
 * Plan de CIERRE de día (de noche): ya no hay próxima comida, así que el
 * consejo es para mañana + descanso.
 */
function closingPlan(t: NextMealInput, profile: Profile): NextMealPlan {
  const recs: NextRec[] = [];
  let tone: "ok" | "warn" = "ok";

  const naPct = profile.targetSodium > 0 ? t.sodium / profile.targetSodium : 0;
  if (naPct >= 0.9) {
    tone = "warn";
    recs.push({
      kind: "avoid",
      text: `Hoy el sodio quedó alto (${Math.round(t.sodium)} mg). Toma agua antes de dormir y mañana arranca ligero: menos embutidos, salsas y quesos salados.`,
    });
  }

  for (const low of lowMicros(t)) {
    recs.push({
      kind: "add",
      text: `Hoy faltó ${low.label.toLowerCase()} → mañana suma ${MICRO_FOODS[low.k]}.`,
    });
  }

  const over = Math.round(t.calories - profile.targetCalories);
  if (over > 150) {
    tone = "warn";
    recs.push({
      kind: "macro",
      text: `Cerraste ~${over} kcal por arriba de tu meta. Un día no define nada; mañana lo ajustas.`,
    });
  }

  recs.push({
    kind: "ok",
    text: "Ya cerró el día. Evita comer pesado antes de dormir y descansa bien — dormir también ayuda a bajar.",
  });

  return { tone, headline: "Cierre del día", recs };
}

/**
 * @param t        totales del día (macros + micros)
 * @param profile  metas del usuario
 * @param mealsLogged  cuántas comidas lleva hoy (para estimar lo que falta)
 * @param phase    "active" (sugiere próxima comida) o "closed" (consejos para mañana)
 */
export function nextMealPlan(
  t: NextMealInput,
  profile: Profile,
  mealsLogged: number,
  phase: "active" | "closed" = "active",
): NextMealPlan {
  if (phase === "closed") return closingPlan(t, profile);

  const recs: NextRec[] = [];
  let tone: "ok" | "warn" = "ok";

  // Comidas que probablemente faltan hoy (objetivo: 4 al día).
  const mealsLeft = Math.max(1, 4 - mealsLogged);

  // 1) Sodio: si ya vas alto, avisa para la próxima.
  const naPct = profile.targetSodium > 0 ? t.sodium / profile.targetSodium : 0;
  if (naPct >= 0.7) {
    tone = "warn";
    recs.push({
      kind: "avoid",
      text:
        naPct >= 1
          ? `Ya pasaste el sodio (${Math.round(t.sodium)} mg). En tu próxima comida evita embutidos, quesos salados, salsas y enlatados; cocina con limón, ajo y especias.`
          : `Vas alto en sodio (${Math.round(t.sodium)} de ${profile.targetSodium} mg). Para la próxima evita embutidos/salsas saladas y baja la porción de quesos; usa limón y especias.`,
    });
  }

  // 2) Proteína: cuánta te falta y en cuánto repartirla.
  const protLeft = Math.round(profile.targetProtein - t.protein);
  if (protLeft > 15) {
    const perMeal = Math.max(20, Math.round(protLeft / mealsLeft));
    const palmas = Math.max(1, Math.round(perMeal / 30));
    recs.push({
      kind: "macro",
      text: `Te faltan ~${protLeft} g de proteína. Apunta a ~${perMeal} g en tu próxima comida (≈ ${palmas} ${palmas === 1 ? "palma" : "palmas"}: pollo, huevo, atún o res magra).`,
    });
  }

  // 3) Micros bajos (sobre todo energía): toma los más rezagados.
  for (const low of lowMicros(t)) {
    recs.push({
      kind: "add",
      text: `Te falta ${low.label.toLowerCase()} → mete ${MICRO_FOODS[low.k]}.`,
    });
  }

  // 4) Fibra: si vas corto, sugiere verdura/fruta.
  const fiberPct = profile.targetFiber > 0 ? t.fiber / profile.targetFiber : 1;
  if (fiberPct < 0.5 && t.calories > 0) {
    recs.push({
      kind: "add",
      text: "Suma fibra: un puño grande de verdura o una fruta con cáscara.",
    });
  }

  // 5) Calorías: si ya casi cierras (o te pasaste), pide próxima comida ligera.
  const calLeft = Math.round(profile.targetCalories - t.calories);
  if (calLeft < 250 && t.calories > 0) {
    tone = calLeft < 0 ? "warn" : tone;
    recs.push({
      kind: "macro",
      text:
        calLeft < 0
          ? `Ya pasaste tus calorías por ${Math.abs(calLeft)}. Si comes algo más, que sea verdura + proteína magra (sin carbo extra).`
          : `Te quedan ~${calLeft} kcal: haz tu próxima comida ligera (verduras + una palma de proteína).`,
    });
  }

  // Si no hay nada que corregir, mensaje positivo.
  if (recs.length === 0) {
    recs.push({
      kind: "ok",
      text:
        t.calories > 0
          ? "Vas muy bien. Mantén proteína + verdura en tu próxima comida y cierras el día a 10."
          : "Arranca el día con proteína (huevo/pollo) + verdura. Eso te pone rumbo al 10.",
    });
  }

  const headline =
    tone === "warn" ? "Ojo con tu próxima comida" : "Tu próxima comida";

  return { tone, headline, recs };
}
