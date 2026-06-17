/**
 * Búsqueda de nutrición en USDA FoodData Central (base oficial, gratis).
 * Devuelve nutrientes ESCALADOS a los gramos pedidos, calculados con aritmética
 * sobre los valores reales por 100g → resultados consistentes y reproducibles.
 *
 * Requiere USDA_API_KEY (gratis en https://fdc.nal.usda.gov/api-key-signup).
 * Con DEMO_KEY funciona pero con límite muy bajo (solo para probar).
 */

const KEY = process.env.USDA_API_KEY || "DEMO_KEY";
const BASE = "https://api.nal.usda.gov/fdc/v1";

export interface Nutrients {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  sugar: number;
  iron: number;
  potassium: number;
  magnesium: number;
  zinc: number;
  calcium: number;
  vitC: number;
  vitD: number;
  vitB12: number;
  omega3: number;
}

// nutrientNumber (string) → cómo mapearlo. Verificado contra la API real.
function emptyPer100(): Record<string, number> {
  return {};
}

// caché en memoria por proceso: query (lower) → {per100, desc} | null
const cache = new Map<string, { per100: Nutrients; desc: string } | null>();

function pickPer100(foodNutrients: any[]): Nutrients {
  const by: Record<string, number> = emptyPer100();
  for (const n of foodNutrients ?? []) {
    const num = String(n.nutrientNumber ?? n.number ?? "");
    const unit = String(n.unitName ?? n.unit ?? "").toUpperCase();
    const val = Number(n.value ?? n.amount ?? 0);
    if (!num) continue;
    // energía: tomar solo kcal (208), no kJ (268)
    if (num === "208" && unit === "KCAL") by["208"] = val;
    else if (num !== "208") by[num] = val;
  }
  const omega3 =
    (by["851"] || 0) + (by["629"] || 0) + (by["621"] || 0) + (by["631"] || 0);
  // vitamina D: preferir µg (328); si solo hay UI (324), convertir (1µg=40UI)
  const vitD = by["328"] != null ? by["328"] : (by["324"] || 0) / 40;
  return {
    calories: by["208"] || 0,
    protein: by["203"] || 0,
    fat: by["204"] || 0,
    carbs: by["205"] || 0,
    fiber: by["291"] || 0,
    sodium: by["307"] || 0,
    sugar: by["269"] || 0,
    iron: by["303"] || 0,
    potassium: by["306"] || 0,
    magnesium: by["304"] || 0,
    zinc: by["309"] || 0,
    calcium: by["301"] || 0,
    vitC: by["401"] || 0,
    vitD: vitD || 0,
    vitB12: by["418"] || 0,
    omega3,
  };
}

/** Busca un alimento y devuelve sus nutrientes por 100g + descripción, o null. */
async function searchPer100(
  query: string,
): Promise<{ per100: Nutrients; desc: string } | null> {
  const key = query.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key)!;

  try {
    const url = `${BASE}/foods/search?api_key=${KEY}&query=${encodeURIComponent(
      query,
    )}&dataType=${encodeURIComponent("Foundation,SR Legacy")}&pageSize=2`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) {
      // rate limit / error: NO cachear, para reintentar cuando haya key válida
      return null;
    }
    const data = await res.json();
    const food = data.foods?.[0];
    if (!food) {
      cache.set(key, null); // sin resultado: cachear miss
      return null;
    }
    const per100 = pickPer100(food.foodNutrients);
    // si no trae energía, descartar (dato incompleto)
    if (!per100.calories) {
      cache.set(key, null);
      return null;
    }
    const out = { per100, desc: String(food.description ?? query) };
    cache.set(key, out);
    return out;
  } catch {
    return null;
  }
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Nutrientes de `grams` gramos del alimento buscado, o null si no se encontró. */
export async function lookupNutrients(
  query: string,
  grams: number,
): Promise<{ nutrients: Nutrients; desc: string } | null> {
  const hit = await searchPer100(query);
  if (!hit) return null;
  const f = grams / 100;
  const p = hit.per100;
  return {
    desc: hit.desc,
    nutrients: {
      calories: round1(p.calories * f),
      protein: round1(p.protein * f),
      carbs: round1(p.carbs * f),
      fat: round1(p.fat * f),
      fiber: round1(p.fiber * f),
      sodium: round1(p.sodium * f),
      sugar: round1(p.sugar * f),
      iron: round1(p.iron * f),
      potassium: round1(p.potassium * f),
      magnesium: round1(p.magnesium * f),
      zinc: round1(p.zinc * f),
      calcium: round1(p.calcium * f),
      vitC: round1(p.vitC * f),
      vitD: round1(p.vitD * f),
      vitB12: round1(p.vitB12 * f),
      omega3: round1(p.omega3 * f),
    },
  };
}

export const usdaConfigured = () => KEY !== "DEMO_KEY";
