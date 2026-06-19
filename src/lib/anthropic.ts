import Anthropic from "@anthropic-ai/sdk";
import { lookupNutrients, type Nutrients } from "./usda";
import { blendScore } from "./score";
import { MICRO_TARGETS, MICRO_ORDER } from "./nutrition";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
// Sonnet por defecto: suficiente para estimar nutrición y mucho más barato que Opus.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export interface MealMicros {
  iron: number; // mg
  potassium: number; // mg
  magnesium: number; // mg
  zinc: number; // mg
  calcium: number; // mg
  vitC: number; // mg
  vitD: number; // mcg
  vitB12: number; // mcg
  omega3: number; // g
}

export interface MealItem {
  nombre: string;
  gramos: number;
  kcal: number;
  fuente: "USDA" | "estimado";
}

export interface FoodAnalysis {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
  sugar: number;
  vitamins: { name: string; amount: number; unit: string; pctDV?: number }[];
  micros: MealMicros;
  confidence: "alta" | "media" | "baja";
  notes: string;
  score: number;
  tip: string;
  items: MealItem[];
}

// Herramienta: Claude DESCOMPONE la comida en ingredientes + gramos. Los números
// nutricionales se calculan después con la base USDA (no los inventa el modelo).
const FOOD_TOOL: Anthropic.Tool = {
  name: "registrar_comida",
  description:
    "Descompone la comida en ingredientes con su porción en gramos. La nutrición se calcula con una base de datos a partir de eso.",
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description:
          "Descripción corta de la comida en español con su porción. Ej: 'Bowl de pollo con arroz y frijoles'",
      },
      ingredientes: {
        type: "array",
        description:
          "Ingredientes del platillo, cada uno con su porción en GRAMOS como se comió (ya cocido). Incluye aceites/grasas de cocción visibles. 1-10 items.",
        items: {
          type: "object",
          properties: {
            nombre: {
              type: "string",
              description: "Nombre en español (ej. 'Pechuga de pollo a la plancha').",
            },
            usdaQuery: {
              type: "string",
              description:
                "Término de búsqueda en INGLÉS para la base USDA, específico y como se come, sin marcas (ej. 'chicken breast cooked', 'white rice cooked', 'corn tortilla', 'black beans cooked', 'banana raw', 'olive oil', 'whole egg cooked').",
            },
            gramos: { type: "number", description: "Gramos estimados de ESTE ingrediente, como se comió." },
            kcal: { type: "number", description: "Respaldo (por si la base falla): calorías de este ingrediente." },
            protein: { type: "number", description: "Respaldo: proteína (g)." },
            carbs: { type: "number", description: "Respaldo: carbohidratos (g)." },
            fat: { type: "number", description: "Respaldo: grasa (g)." },
            fiber: { type: "number", description: "Respaldo: fibra (g)." },
            sodium: { type: "number", description: "Respaldo: sodio (mg)." },
            sugar: { type: "number", description: "Respaldo: azúcar (g)." },
          },
          required: [
            "nombre",
            "usdaQuery",
            "gramos",
            "kcal",
            "protein",
            "carbs",
            "fat",
            "fiber",
            "sodium",
            "sugar",
          ],
        },
      },
      confidence: {
        type: "string",
        enum: ["alta", "media", "baja"],
        description:
          "Qué tan seguro estás de la PORCIÓN (gramos). 'alta' si hay foto clara, etiqueta o cantidades exactas; 'baja' si la porción es muy incierta.",
      },
      notes: {
        type: "string",
        description:
          "1-2 frases: qué asumiste de porciones/ingredientes/preparación. En español.",
      },
      score: {
        type: "number",
        description:
          "Calificación de 0 a 10 de qué tan saludable y alineada está con bajar de peso de forma sana. Decimales permitidos.",
      },
      tip: {
        type: "string",
        description:
          "Consejo breve de nutriólogo (1 frase), en español, SIN emojis, en PORCIONES DE COMIDA REAL (nunca gramos). Motivador.",
      },
      micros: {
        type: "object",
        description:
          "Estimación de RESPALDO de micronutrientes TOTALES de la comida (se usa solo si la base de datos USDA no está disponible). Usa las unidades indicadas; 0 si no hay nada relevante.",
        properties: {
          iron: { type: "number", description: "Hierro (mg)" },
          potassium: { type: "number", description: "Potasio (mg)" },
          magnesium: { type: "number", description: "Magnesio (mg)" },
          zinc: { type: "number", description: "Zinc (mg)" },
          calcium: { type: "number", description: "Calcio (mg)" },
          vitC: { type: "number", description: "Vitamina C (mg)" },
          vitD: { type: "number", description: "Vitamina D (mcg)" },
          vitB12: { type: "number", description: "Vitamina B12 (mcg)" },
          omega3: { type: "number", description: "Omega-3 (g)" },
        },
        required: ["iron", "potassium", "magnesium", "zinc", "calcium", "vitC", "vitD", "vitB12", "omega3"],
      },
    },
    required: ["name", "ingredientes", "confidence", "notes", "score", "tip", "micros"],
  },
};

const SYSTEM = `Eres un asistente de nutrición experto. Tu trabajo es DESCOMPONER lo que comió el usuario en ingredientes con su porción en GRAMOS — NO inventes los números nutricionales, esos se calculan después con una base de datos (USDA).

Cómo trabajar:
- Identifica cada ingrediente del platillo y estima sus GRAMOS como se comió (ya cocido). Incluye aceites/grasas de cocción visibles, salsas, aderezos.
- Para cada ingrediente da un 'usdaQuery' en INGLÉS, específico y sin marcas (ej. 'white rice cooked', 'chicken breast grilled', 'corn tortilla', 'black beans cooked').
- Si hay FOTO(S), úsalas para identificar ingredientes y estimar porciones (referencias: plato, cubiertos, mano). Si hay una TABLA NUTRICIONAL/etiqueta, básate en ella y en la porción descrita.
- Da también una estimación de respaldo (kcal/macros) por ingrediente, por si la base de datos no encuentra ese alimento.
- La 'confidence' refleja qué tan seguro estás de la PORCIÓN (los gramos), que es la mayor incertidumbre. Sé honesto.
- Eres su tutor: califica (0-10) y da un 'tip' corto en porciones reales (nunca gramos), sin emojis.
- Responde SIEMPRE llamando a 'registrar_comida'. Todo en español.`;

type ImageInput = { base64: string; mediaType: string };

type AnalyzeArgs = {
  text?: string;
  images?: ImageInput[];
  goalContext?: string;
};

export async function analyzeFood({
  text,
  images = [],
  goalContext,
}: AnalyzeArgs): Promise<FoodAnalysis> {
  const content: Anthropic.ContentBlockParam[] = [];

  for (const img of images) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mediaType as
          | "image/jpeg"
          | "image/png"
          | "image/gif"
          | "image/webp",
        data: img.base64,
      },
    });
  }

  const n = images.length;
  let instruction: string;
  if (n >= 2 && text) {
    instruction = `El usuario subió ${n} fotos (pueden incluir la tabla nutricional del producto y/o el platillo) y describió: "${text}". Combina TODAS las fotos con la descripción para estimar el desglose lo más preciso posible.`;
  } else if (n >= 2) {
    instruction = `El usuario subió ${n} fotos (pueden incluir la tabla nutricional y/o el platillo). Combínalas para estimar el desglose nutricional.`;
  } else if (n === 1 && text) {
    instruction = `El usuario subió esta foto Y la describió así: "${text}". Combina la foto y la descripción para estimar el desglose lo más preciso posible.`;
  } else if (n === 1) {
    instruction = "Analiza esta foto de comida y estima su desglose nutricional.";
  } else {
    instruction = `Estima el desglose nutricional de: "${text}".`;
  }

  if (goalContext) instruction += `\n${goalContext}`;

  content.push({ type: "text", text: instruction });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
    // Temperatura baja = estimaciones MÁS consistentes y reproducibles
    // (la misma comida da prácticamente el mismo resultado).
    temperature: 0.2,
    system: SYSTEM,
    tools: [FOOD_TOOL],
    tool_choice: { type: "tool", name: "registrar_comida" },
    messages: [{ role: "user", content }],
  });

  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );

  if (!toolUse) {
    throw new Error("Claude no devolvió un análisis estructurado.");
  }

  type Ingredient = {
    nombre?: string;
    usdaQuery?: string;
    gramos?: number;
    kcal?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sodium?: number;
    sugar?: number;
  };
  const input = toolUse.input as {
    name?: string;
    ingredientes?: Ingredient[];
    confidence?: "alta" | "media" | "baja";
    notes?: string;
    score?: number;
    tip?: string;
    micros?: Partial<MealMicros>;
  };

  const ings = Array.isArray(input.ingredientes) ? input.ingredientes : [];

  // Cada ingrediente: USDA (real) si se encuentra; si no, la estimación de respaldo.
  const computed = await Promise.all(
    ings.map(async (ing) => {
      const grams = num(ing.gramos);

      // Estimación de respaldo de la IA para ESTE ingrediente (sin micros).
      const llmN: Nutrients = {
        calories: num(ing.kcal),
        protein: num(ing.protein),
        carbs: num(ing.carbs),
        fat: num(ing.fat),
        fiber: num(ing.fiber),
        sodium: num(ing.sodium),
        sugar: num(ing.sugar),
        iron: 0,
        potassium: 0,
        magnesium: 0,
        zinc: 0,
        calcium: 0,
        vitC: 0,
        vitD: 0,
        vitB12: 0,
        omega3: 0,
      };

      const hit =
        grams > 0 && ing.usdaQuery
          ? await lookupNutrients(ing.usdaQuery, grams)
          : null;

      // Guardia anti-disparate: si USDA da MUCHO más calorías que la estimación
      // de la IA para este ingrediente, seguramente emparejó el alimento
      // equivocado (clásico: leche líquida → leche EN POLVO, ~10x). En ese caso
      // descartamos USDA y usamos la estimación de la IA.
      const usdaTooHigh =
        hit !== null &&
        llmN.calories > 0 &&
        hit.nutrients.calories > llmN.calories * 2 + 50;

      if (hit && !usdaTooHigh) {
        return {
          item: {
            nombre: ing.nombre ?? hit.desc,
            gramos: grams,
            kcal: hit.nutrients.calories,
            fuente: "USDA" as const,
          },
          n: hit.nutrients,
        };
      }
      return {
        item: {
          nombre: ing.nombre ?? "Ingrediente",
          gramos: grams,
          kcal: llmN.calories,
          fuente: "estimado" as const,
        },
        n: llmN,
      };
    }),
  );

  const sum = (k: keyof Nutrients) =>
    Math.round(computed.reduce((a, c) => a + (c.n[k] || 0), 0) * 10) / 10;

  // Micros: solo usamos la suma USDA (precisa) si TODOS los ingredientes se
  // resolvieron con USDA. Si aunque sea uno quedó estimado, ese no aporta
  // micros (USDA no los tiene), así que la suma quedaría corta — mejor usar la
  // estimación de la IA a nivel comida, que sí cubre todos los ingredientes.
  // Así los micros NUNCA quedan en 0 ni subcontados por falta de la base.
  const allUsda =
    computed.length > 0 && computed.every((c) => c.item.fuente === "USDA");
  const llm = (input.micros ?? {}) as Partial<MealMicros>;
  const micros: MealMicros = allUsda
    ? {
        iron: sum("iron"),
        potassium: sum("potassium"),
        magnesium: sum("magnesium"),
        zinc: sum("zinc"),
        calcium: sum("calcium"),
        vitC: sum("vitC"),
        vitD: sum("vitD"),
        vitB12: sum("vitB12"),
        omega3: sum("omega3"),
      }
    : {
        iron: num(llm.iron),
        potassium: num(llm.potassium),
        magnesium: num(llm.magnesium),
        zinc: num(llm.zinc),
        calcium: num(llm.calcium),
        vitC: num(llm.vitC),
        vitD: num(llm.vitD),
        vitB12: num(llm.vitB12),
        omega3: num(llm.omega3),
      };

  const calories = sum("calories");
  const protein = sum("protein");
  const fiber = sum("fiber");
  const sodium = sum("sodium");
  const sugar = sum("sugar");

  // Score híbrido: parte objetiva (densidades) + juicio de la IA.
  const llmScore = typeof input.score === "number" ? input.score : num(input.score);
  const score = blendScore(llmScore, { calories, protein, fiber, sodium, sugar });

  return {
    name: input.name ?? "Comida",
    calories,
    protein,
    carbs: sum("carbs"),
    fat: sum("fat"),
    fiber,
    sodium,
    sugar,
    vitamins: [],
    micros,
    confidence: input.confidence ?? "media",
    notes: input.notes ?? "",
    score,
    tip: input.tip ?? "",
    items: computed.map((c) => c.item),
  };
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
}

/* ============== NUTRIÓLOGO: evaluación del día ============== */

export interface DayCoaching {
  dayScore: number;
  verdict: string;
  good: string[];
  improve: string[];
  avoidFoods: string[];
  addFoods: string[];
}

const COACH_TOOL: Anthropic.Tool = {
  name: "evaluar_dia",
  description: "Evalúa el día de alimentación completo del usuario, como su coach.",
  input_schema: {
    type: "object",
    properties: {
      dayScore: {
        type: "number",
        description: "Calificación del día de 0 a 10 (qué tan bien comió hoy según su objetivo de bajar de peso). Decimales permitidos.",
      },
      verdict: {
        type: "string",
        description: "1-2 frases resumiendo el día, en tono motivador y honesto (no regañón). Si hubo un problema claro (ej. sodio muy alto), NÓMBRALO aquí concretamente.",
      },
      good: {
        type: "array",
        items: { type: "string" },
        description: "1-3 cosas que hizo BIEN hoy (refuerzo positivo). Frases cortas.",
      },
      improve: {
        type: "array",
        items: { type: "string" },
        description: "2-3 consejos para mañana, en PORCIONES DE COMIDA REAL (nunca gramos), concretos y accionables. Ej: 'Cambia el refresco por agua', 'Agrega una palma de pollo en la comida'.",
      },
      avoidFoods: {
        type: "array",
        items: { type: "string" },
        description:
          "0-3 alimentos concretos que debe EVITAR o reducir mañana por lo que vio hoy (sobre todo si el sodio o el azúcar estuvieron altos). Solo el nombre del alimento, ej. 'embutidos', 'salsa de soya', 'refresco'. Vacío si no aplica.",
      },
      addFoods: {
        type: "array",
        items: { type: "string" },
        description:
          "0-3 alimentos concretos que debe SUMAR mañana para cerrar lo que le faltó (micros para energía: hierro, calcio, vit D, potasio, omega-3, etc.). Solo el nombre, ej. 'espinaca', 'salmón', 'lácteos'. Vacío si no aplica.",
      },
    },
    required: ["dayScore", "verdict", "good", "improve", "avoidFoods", "addFoods"],
  },
};

const COACH_SYSTEM = `Eres el Coach IA personal del usuario. Tu meta es que aprenda a comer bien y baje de peso de forma sana, sin culpa, mejorando un poco cada día hacia un 10/10.
- Sé motivador, cercano y honesto. Nada de regaños. Sin emojis.
- Da consejos en PORCIONES DE COMIDA REAL (una palma de pollo, un puño de arroz, una fruta, un vaso de agua), NUNCA en gramos.
- IDENTIFICA el problema #1 del día (con frecuencia es SODIO alto, o azúcar) y dilo claro, con qué alimentos bajar o evitar para lograrlo.
- Revisa los MICRONUTRIENTES de energía (hierro, calcio, vit D, potasio, magnesio, B12, omega-3): si alguno quedó bajo, sugiere alimentos concretos para sumarlo mañana.
- Llena 'avoidFoods' (qué reducir) y 'addFoods' (qué sumar) con alimentos concretos cuando aplique.
- Responde SIEMPRE llamando a la herramienta 'evaluar_dia'. Todo en español.`;

/* ============== GUÍA: comer limpio + ideas de comida ============== */

export interface GuideIdea {
  nombre: string;
  kcal: number;
  porque: string;
}

export interface ShopGroup {
  categoria: string;
  items: string[];
}

export interface EatingGuide {
  focus: string;
  compra: ShopGroup[];
  evita: string[];
  condimentos: string[];
  desayunos: GuideIdea[];
  comidas: GuideIdea[];
  cenas: GuideIdea[];
}

const IDEA_ITEM = {
  type: "object" as const,
  properties: {
    nombre: {
      type: "string",
      description:
        "La comida sugerida en porciones reales, no gramos (ej. '3 huevos con espinaca, 2 tortillas y aguacate').",
    },
    kcal: { type: "number", description: "Calorías aproximadas" },
    porque: {
      type: "string",
      description: "1 frase corta: por qué es buena opción (energía, proteína, micronutrientes…).",
    },
  },
  required: ["nombre", "kcal", "porque"],
};

// Las LISTAS (enfoque, súper, evitar, condimentos) — una llamada.
const GUIDE_LISTS_TOOL: Anthropic.Tool = {
  name: "guia_listas",
  description: "Enfoque, lista del súper por grupos, qué evitar y condimentos.",
  input_schema: {
    type: "object",
    properties: {
      focus: {
        type: "string",
        description: "1 frase con el enfoque principal de la semana para este usuario.",
      },
      compra: {
        type: "array",
        description:
          "Lista del súper organizada por grupo. Incluye 5 categorías EN ESTE ORDEN: 'Carbohidratos', 'Proteínas', 'Verduras', 'Grasas buenas', 'Lácteos'. En cada una, 3-6 alimentos CONCRETOS y accesibles en México que SÍ debe comprar (positivo, no prohibiciones). En carbohidratos aclara cuáles sí (ej. 'Arroz (un puño por comida)', 'Avena', 'Tortilla de maíz', 'Camote', 'Frijoles'). En lácteos sugiere quesos magros (panela, requesón, cottage) en vez de cheddar/manchego.",
        items: {
          type: "object",
          properties: {
            categoria: { type: "string", description: "Nombre del grupo (ej. 'Carbohidratos')" },
            items: {
              type: "array",
              items: { type: "string" },
              description: "3-6 alimentos concretos a comprar de ese grupo, con porción o nota breve si ayuda.",
            },
          },
          required: ["categoria", "items"],
        },
      },
      evita: {
        type: "array",
        items: { type: "string" },
        description: "3-6 productos que debería DEJAR DE COMPRAR o reducir, SIEMPRE con su reemplazo saludable (ej. 'Pan blanco → cámbialo por tortilla de maíz o pan integral'). Frases cortas.",
      },
      condimentos: {
        type: "array",
        items: { type: "string" },
        description:
          "5-7 condimentos/sazonadores para dar SABOR. ACLARA claramente qué sí puede usar y cómo: la SAL en MODERACIÓN está bien (no prohibida), la PIMIENTA es LIBRE (no tiene sodio), y agrega limón, ajo, comino, chile en polvo, hierbas, vinagre. Cada uno con una nota corta (ej. 'Sal: úsala con medida, una pizca, no de más', 'Pimienta: libre, dale sabor sin sodio').",
      },
    },
    required: ["focus", "compra", "evita", "condimentos"],
  },
};

// Las RECETAS (3 por tiempo) — otra llamada, en paralelo.
const GUIDE_RECIPES_TOOL: Anthropic.Tool = {
  name: "guia_recetas",
  description: "3 opciones de comida para cada tiempo: desayuno, comida y cena.",
  input_schema: {
    type: "object",
    properties: {
      desayunos: {
        type: "array",
        description: "EXACTAMENTE 3 opciones de DESAYUNO con los alimentos que suele comprar.",
        items: IDEA_ITEM,
      },
      comidas: {
        type: "array",
        description: "EXACTAMENTE 3 opciones de COMIDA (almuerzo fuerte) con sus alimentos.",
        items: IDEA_ITEM,
      },
      cenas: {
        type: "array",
        description: "EXACTAMENTE 3 opciones de CENA (ligera) con sus alimentos.",
        items: IDEA_ITEM,
      },
    },
    required: ["desayunos", "comidas", "cenas"],
  },
};

const GUIDE_SYSTEM = `Eres el nutriólogo personal del usuario. Tu meta: ayudarlo a COMER LIMPIO, bajar de peso fácil y SIN estrés, aprendiendo a comer bien.
- Sé POSITIVO y claro: en vez de solo prohibir, dile qué SÍ comprar y comer. Si quitas algo, da el reemplazo.
- Arma una LISTA DEL SÚPER por grupos (carbohidratos, proteínas, verduras, grasas buenas, lácteos) con alimentos concretos y accesibles en México.
- Aclara los condimentos: la sal con moderación está bien y la pimienta/especias son libres. Que no piense que no puede usar NADA de sal.
- Da EXACTAMENTE 3 opciones por cada tiempo de comida (desayuno, comida, cena), variadas y apetecibles.
- Usa alimentos COMPLETOS como se comen en México: HUEVOS ENTEROS (ej. "3-4 huevos"), nunca claras solas a menos que el usuario lo pida.
- Expresa porciones en términos de mano/comida real (ej. "3 huevos", "una palma de pollo", "un puño de arroz"), NUNCA en gramos.
- Apunta a ~30-40 g de proteína por comida.
- Prioriza comida real, rica en micronutrientes (hierro, potasio, magnesio, B12, omega-3).
- Habla en PORCIONES DE COMIDA REAL, nunca en gramos. Tono cercano, motivador, sin regaños y SIN emojis.
- Responde SIEMPRE usando la herramienta que se te indique en cada llamada. Todo en español.`;

export async function generateGuide(input: {
  targets: { calories: number; protein: number; fiber: number; sugar: number; sodium: number };
  recentFoods: string[];
  pantry?: string;
  avoidFoods?: string[];
  addFoods?: string[];
}): Promise<EatingGuide> {
  const recent = input.recentFoods.length
    ? input.recentFoods.slice(0, 20).join("; ")
    : "(aún no ha registrado mucho)";
  const pantry = input.pantry?.trim()
    ? `Alimentos que suele comer / tiene en casa: ${input.pantry.trim()}.`
    : "No especificó alimentos; usa básicos saludables comunes en México (huevo, pollo, atún, salmón, frijoles, verduras, avena, fruta, arroz, tortilla de maíz).";

  // Recomendaciones recientes del Coach IA (cierran el ciclo: lo que el coach
  // detectó día a día se refleja en la guía del súper).
  const avoid = (input.avoidFoods ?? []).filter(Boolean);
  const add = (input.addFoods ?? []).filter(Boolean);
  const coachNote =
    avoid.length || add.length
      ? `\nSegún su Coach IA de los últimos días: ${
          avoid.length ? `REDUCIR/EVITAR: ${avoid.join(", ")}.` : ""
        } ${
          add.length ? `SUMAR para sus micros: ${add.join(", ")}.` : ""
        } Refleja esto en 'evita' (con reemplazo) y en la lista del súper.`
      : "";

  const base = `Metas diarias: ~${input.targets.calories} kcal, ${input.targets.protein}g proteína, ${input.targets.fiber}g fibra, máx ${input.targets.sugar}g azúcar, máx ${input.targets.sodium}mg sodio. Objetivo: bajar de peso fácil, sin estrés y aprendiendo a comer bien.
${pantry}
Lo que ha comido últimamente: ${recent}.${coachNote}`;

  const call = (tool: Anthropic.Tool, instruction: string, maxTokens: number) =>
    client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      system: GUIDE_SYSTEM,
      tools: [tool],
      tool_choice: { type: "tool", name: tool.name },
      messages: [{ role: "user", content: `${base}\n${instruction}` }],
    });

  const toolInput = (msg: Anthropic.Message): Record<string, unknown> => {
    const t = msg.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    return (t?.input as Record<string, unknown>) ?? {};
  };
  const ideas = (v: unknown): GuideIdea[] => (Array.isArray(v) ? (v as GuideIdea[]) : []);

  // Dos llamadas EN PARALELO (más rápido y sin truncamiento).
  const [listsMsg, recipesMsg] = await Promise.all([
    call(
      GUIDE_LISTS_TOOL,
      "Dame: el enfoque de la semana, la lista del súper por grupos (qué SÍ comprar), qué dejar de comprar (con su reemplazo) y los condimentos (aclara lo de la sal y la pimienta).",
      2000,
    ),
    call(
      GUIDE_RECIPES_TOOL,
      "Dame EXACTAMENTE 3 opciones de desayuno, 3 de comida y 3 de cena, usando los alimentos del usuario.",
      2500,
    ),
  ]);

  const lists = toolInput(listsMsg);
  const recipes = toolInput(recipesMsg);

  return {
    focus: typeof lists.focus === "string" ? lists.focus : "",
    compra: Array.isArray(lists.compra) ? (lists.compra as ShopGroup[]) : [],
    evita: Array.isArray(lists.evita) ? (lists.evita as string[]) : [],
    condimentos: Array.isArray(lists.condimentos)
      ? (lists.condimentos as string[])
      : [],
    desayunos: ideas(recipes.desayunos),
    comidas: ideas(recipes.comidas),
    cenas: ideas(recipes.cenas),
  };
}

export async function coachDay(input: {
  meals: { name: string; calories: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number; sodium: number }[];
  targets: { calories: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number; sodium: number };
  micros?: Partial<MealMicros>;
}): Promise<DayCoaching> {
  const sum = (k: keyof (typeof input.meals)[number]) =>
    input.meals.reduce((a, m) => a + (Number(m[k]) || 0), 0);

  const totals = {
    calories: Math.round(sum("calories")),
    protein: Math.round(sum("protein")),
    carbs: Math.round(sum("carbs")),
    fat: Math.round(sum("fat")),
    fiber: Math.round(sum("fiber")),
    sugar: Math.round(sum("sugar")),
    sodium: Math.round(sum("sodium")),
  };

  const mealList = input.meals.length
    ? input.meals
        .map(
          (m) =>
            `- ${m.name}: ${Math.round(m.calories)} kcal (P${Math.round(m.protein)} C${Math.round(m.carbs)} G${Math.round(m.fat)})`,
        )
        .join("\n")
    : "(no registró comidas)";

  const t = input.targets;

  // Línea de micros del día vs metas (para que aconseje qué sumar).
  const mc = input.micros ?? {};
  const microLine = MICRO_ORDER.map((k) => {
    const meta = MICRO_TARGETS[k];
    const val = Math.round((Number(mc[k]) || 0) * 10) / 10;
    return `- ${meta.label}: ${val} / ${meta.target} ${meta.unit}`;
  }).join("\n");

  const userText = `Comidas de hoy:\n${mealList}\n\nTotales del día vs metas:\n- Calorías: ${totals.calories} / ${t.calories}\n- Proteína: ${totals.protein} / ${t.protein} g\n- Carbohidratos: ${totals.carbs} / ${t.carbs} g\n- Grasa: ${totals.fat} / ${t.fat} g\n- Fibra: ${totals.fiber} / ${t.fiber} g\n- Azúcar: ${totals.sugar} / máx ${t.sugar} g\n- Sodio: ${totals.sodium} / máx ${t.sodium} mg\n\nMicronutrientes del día (energía) vs metas:\n${microLine}\n\nEvalúa el día. Señala el problema #1 (¿sodio? ¿azúcar?) y qué micros quedaron bajos, con alimentos concretos para mañana.`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 900,
    system: COACH_SYSTEM,
    tools: [COACH_TOOL],
    tool_choice: { type: "tool", name: "evaluar_dia" },
    messages: [{ role: "user", content: userText }],
  });

  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) throw new Error("No se pudo evaluar el día.");

  const out = toolUse.input as Partial<DayCoaching>;
  return {
    dayScore: typeof out.dayScore === "number" ? out.dayScore : num(out.dayScore),
    verdict: out.verdict ?? "",
    good: Array.isArray(out.good) ? out.good : [],
    improve: Array.isArray(out.improve) ? out.improve : [],
    avoidFoods: Array.isArray(out.avoidFoods) ? out.avoidFoods : [],
    addFoods: Array.isArray(out.addFoods) ? out.addFoods : [],
  };
}

/* ============== NUTRIÓLOGO: resumen semanal ============== */

export interface WeekCoaching {
  weekScore: number;
  verdict: string;
  tendencia: string;
  good: string[];
  improve: string[];
}

const WEEK_TOOL: Anthropic.Tool = {
  name: "evaluar_semana",
  description:
    "Evalúa los últimos 7 días de alimentación del usuario en conjunto, como su nutriólogo, considerando consistencia y tendencia de peso.",
  input_schema: {
    type: "object",
    properties: {
      weekScore: {
        type: "number",
        description:
          "Calificación de la semana de 0 a 10 (premiando consistencia y calidad según su objetivo de bajar de peso). Decimales permitidos.",
      },
      verdict: {
        type: "string",
        description: "1-2 frases resumiendo la semana, motivador y honesto (no regañón).",
      },
      tendencia: {
        type: "string",
        description:
          "1 frase sobre la tendencia: peso y consistencia de registro (ej. 'Bajaste 0.4 kg y registraste 6 de 7 días').",
      },
      good: {
        type: "array",
        items: { type: "string" },
        description: "2-3 cosas que hizo BIEN esta semana. Frases cortas.",
      },
      improve: {
        type: "array",
        items: { type: "string" },
        description:
          "2-3 consejos para la próxima semana, en PORCIONES DE COMIDA REAL (nunca gramos), concretos.",
      },
    },
    required: ["weekScore", "verdict", "tendencia", "good", "improve"],
  },
};

const WEEK_SYSTEM = `Eres el nutriólogo personal y coach del usuario, evaluando su SEMANA completa (últimos 7 días). Meta: que aprenda a comer bien y baje de peso de forma sana, sin culpa.
- Motivador, cercano y honesto. Nada de regaños. Sin emojis.
- Premia la CONSISTENCIA (días registrados) además de la calidad de la comida.
- Consejos en PORCIONES DE COMIDA REAL (una palma de pollo, un puño de arroz, una fruta), NUNCA en gramos.
- Considera la tendencia de peso si hay datos.
- Responde SIEMPRE llamando a la herramienta 'evaluar_semana'. Todo en español.`;

export async function coachWeek(input: {
  days: {
    day: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
    count: number;
  }[];
  targets: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
  };
  weights: { day: string; weightKg: number }[];
}): Promise<WeekCoaching> {
  const t = input.targets;
  const withData = input.days.filter((d) => d.count > 0);
  const n = withData.length || 1;
  const avg = (k: keyof (typeof withData)[number]) =>
    Math.round(withData.reduce((a, d) => a + (Number(d[k]) || 0), 0) / n);

  const perDay = input.days.length
    ? input.days
        .map((d) =>
          d.count > 0
            ? `- ${d.day}: ${Math.round(d.calories)} kcal (P${Math.round(d.protein)} C${Math.round(d.carbs)} G${Math.round(d.fat)}), ${d.count} comidas`
            : `- ${d.day}: sin registro`,
        )
        .join("\n")
    : "(no registró nada esta semana)";

  const w = [...input.weights].sort((a, b) => a.day.localeCompare(b.day));
  let weightLine = "Sin registros de peso esta semana.";
  if (w.length >= 2) {
    const delta = Math.round((w[w.length - 1].weightKg - w[0].weightKg) * 10) / 10;
    weightLine = `Peso: de ${w[0].weightKg} kg a ${w[w.length - 1].weightKg} kg, cambio ${delta > 0 ? "+" : ""}${delta} kg.`;
  } else if (w.length === 1) {
    weightLine = `Peso registrado: ${w[0].weightKg} kg.`;
  }

  const userText = `Resumen de los últimos 7 días (día por día):
${perDay}

Días registrados: ${withData.length} de 7.
Promedios en días con registro:
- Calorías: ${avg("calories")} / meta ${t.calories}
- Proteína: ${avg("protein")} / ${t.protein} g
- Carbohidratos: ${avg("carbs")} / ${t.carbs} g
- Grasa: ${avg("fat")} / ${t.fat} g
- Fibra: ${avg("fiber")} / ${t.fiber} g
- Azúcar: ${avg("sugar")} / máx ${t.sugar} g
- Sodio: ${avg("sodium")} / máx ${t.sodium} mg

${weightLine}

Evalúa mi semana completa y dame consejos para la próxima.`;

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1000,
    system: WEEK_SYSTEM,
    tools: [WEEK_TOOL],
    tool_choice: { type: "tool", name: "evaluar_semana" },
    messages: [{ role: "user", content: userText }],
  });

  const toolUse = message.content.find(
    (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
  );
  if (!toolUse) throw new Error("No se pudo evaluar la semana.");
  const out = toolUse.input as Partial<WeekCoaching>;
  return {
    weekScore: typeof out.weekScore === "number" ? out.weekScore : num(out.weekScore),
    verdict: out.verdict ?? "",
    tendencia: out.tendencia ?? "",
    good: Array.isArray(out.good) ? out.good : [],
    improve: Array.isArray(out.improve) ? out.improve : [],
  };
}
