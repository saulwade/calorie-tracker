import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
// Sonnet por defecto: suficiente para estimar nutrición y mucho más barato que Opus.
const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

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
  confidence: "alta" | "media" | "baja";
  notes: string;
  score: number;
  tip: string;
}

// Herramienta que fuerza a Claude a devolver la nutrición en formato estructurado.
const FOOD_TOOL: Anthropic.Tool = {
  name: "registrar_comida",
  description:
    "Registra el desglose nutricional estimado de la comida descrita o mostrada en la foto.",
  input_schema: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description:
          "Descripción corta de la comida en español, incluyendo porción estimada. Ej: 'Bowl de pollo de Chipotle (2/3 lleno)'",
      },
      calories: { type: "number", description: "Calorías totales (kcal)" },
      protein: { type: "number", description: "Proteína total (gramos)" },
      carbs: { type: "number", description: "Carbohidratos totales (gramos)" },
      fat: { type: "number", description: "Grasa total (gramos)" },
      fiber: { type: "number", description: "Fibra total (gramos)" },
      sodium: { type: "number", description: "Sodio total (miligramos)" },
      sugar: { type: "number", description: "Azúcar total (gramos)" },
      vitamins: {
        type: "array",
        description:
          "Vitaminas y minerales destacables de esta comida (los más relevantes, 0-6 items). Vacío si no hay nada notable.",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Ej: 'Vitamina C', 'Hierro'" },
            amount: { type: "number" },
            unit: { type: "string", description: "Ej: 'mg', 'mcg', 'UI'" },
            pctDV: {
              type: "number",
              description: "% del valor diario recomendado, si aplica",
            },
          },
          required: ["name", "amount", "unit"],
        },
      },
      confidence: {
        type: "string",
        enum: ["alta", "media", "baja"],
        description:
          "Qué tan seguro estás. 'alta' si tienes foto + descripción clara; 'baja' si falta info de porción o ingredientes.",
      },
      notes: {
        type: "string",
        description:
          "En 1-2 frases: en qué te basaste para el cálculo y qué asumiste (porción, ingredientes, preparación). Como un breve razonamiento. En español.",
      },
      score: {
        type: "number",
        description:
          "Calificación de 0 a 10 de qué tan saludable y alineada está esta comida con el objetivo del usuario (bajar de peso de forma sana). 10 = excelente; 5 = regular; <4 = poco saludable. Usa decimales si quieres (ej. 7.5).",
      },
      tip: {
        type: "string",
        description:
          "Consejo breve y amable de nutriólogo (1 frase), en español, SIN emojis. Da sugerencias en PORCIONES DE COMIDA REAL, nunca en gramos (ej. 'cambia el refresco por agua' o 'agrega una palma de pollo'). Motivador, no regañón.",
      },
    },
    required: [
      "name",
      "calories",
      "protein",
      "carbs",
      "fat",
      "fiber",
      "sodium",
      "sugar",
      "vitamins",
      "confidence",
      "notes",
      "score",
      "tip",
    ],
  },
};

const SYSTEM = `Eres un asistente de nutrición experto y meticuloso. Estimas el contenido nutricional de lo que come el usuario de la forma MÁS PRECISA posible.

Cómo trabajar:
- Cuando haya FOTO y DESCRIPCIÓN juntas, ÚSALAS COMBINADAS: la foto te da la porción y el contexto visual; el texto te da lo que la foto no muestra (ingredientes, marca, preparación, cantidades exactas). Cruza ambas fuentes.
- Si la foto no alcanza a mostrar algo, complétalo con el texto; si el texto es vago, apóyate en la foto.
- Estima la porción usando referencias visuales (plato, cubiertos, mano, envase) o las cantidades que diga el usuario.
- Usa valores nutricionales realistas de alimentos y marcas comunes (incluye comida mexicana/latina: tortillas, salsas, aceite de cocina, etc.).
- Si hay incertidumbre, elige una porción típica, decláralo en 'notes' y baja la 'confidence'. No inventes precisión falsa.
- En 'notes' deja un breve razonamiento (1-2 frases) de en qué te basaste.
- Además eres su tutor de nutrición: califica la comida (0-10) según qué tan saludable y alineada está con su objetivo, y da un 'tip' corto y amable. Los consejos van en PORCIONES DE COMIDA REAL (una palma de pollo, un puño de arroz, una fruta), NUNCA en gramos.
- Responde SIEMPRE llamando a la herramienta 'registrar_comida', sin texto extra. Todo en español.`;

type AnalyzeArgs = {
  text?: string;
  imageBase64?: string;
  mediaType?: string;
  goalContext?: string;
};

export async function analyzeFood({
  text,
  imageBase64,
  mediaType,
  goalContext,
}: AnalyzeArgs): Promise<FoodAnalysis> {
  const content: Anthropic.ContentBlockParam[] = [];

  if (imageBase64 && mediaType) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: mediaType as
          | "image/jpeg"
          | "image/png"
          | "image/gif"
          | "image/webp",
        data: imageBase64,
      },
    });
  }

  const hasImage = Boolean(imageBase64);
  let instruction: string;
  if (hasImage && text) {
    instruction = `El usuario subió esta foto Y la describió así: "${text}". Combina la foto y la descripción para estimar el desglose nutricional lo más preciso posible.`;
  } else if (hasImage) {
    instruction =
      "Analiza esta foto de comida y estima su desglose nutricional.";
  } else {
    instruction = `Estima el desglose nutricional de: "${text}".`;
  }

  if (goalContext) instruction += `\n${goalContext}`;

  content.push({ type: "text", text: instruction });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 1500,
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

  const input = toolUse.input as Partial<FoodAnalysis>;

  return {
    name: input.name ?? "Comida",
    calories: num(input.calories),
    protein: num(input.protein),
    carbs: num(input.carbs),
    fat: num(input.fat),
    fiber: num(input.fiber),
    sodium: num(input.sodium),
    sugar: num(input.sugar),
    vitamins: Array.isArray(input.vitamins) ? input.vitamins : [],
    confidence: input.confidence ?? "media",
    notes: input.notes ?? "",
    score: typeof input.score === "number" ? input.score : num(input.score),
    tip: input.tip ?? "",
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
}

const COACH_TOOL: Anthropic.Tool = {
  name: "evaluar_dia",
  description: "Evalúa el día de alimentación completo del usuario, como su nutriólogo.",
  input_schema: {
    type: "object",
    properties: {
      dayScore: {
        type: "number",
        description: "Calificación del día de 0 a 10 (qué tan bien comió hoy según su objetivo de bajar de peso). Decimales permitidos.",
      },
      verdict: {
        type: "string",
        description: "1-2 frases resumiendo el día, en tono motivador y honesto (no regañón).",
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
    },
    required: ["dayScore", "verdict", "good", "improve"],
  },
};

const COACH_SYSTEM = `Eres el nutriólogo personal y coach del usuario. Tu meta es que aprenda a comer bien y baje de peso de forma sana, sin culpa.
- Sé motivador, cercano y honesto. Nada de regaños. Sin emojis.
- Da consejos en PORCIONES DE COMIDA REAL (una palma de pollo, un puño de arroz, una fruta, un vaso de agua), NUNCA en gramos.
- Considera sus metas del día y lo que ya comió.
- Responde SIEMPRE llamando a la herramienta 'evaluar_dia'. Todo en español.`;

export async function coachDay(input: {
  meals: { name: string; calories: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number; sodium: number }[];
  targets: { calories: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number; sodium: number };
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
  const userText = `Comidas de hoy:\n${mealList}\n\nTotales del día vs metas:\n- Calorías: ${totals.calories} / ${t.calories}\n- Proteína: ${totals.protein} / ${t.protein} g\n- Carbohidratos: ${totals.carbs} / ${t.carbs} g\n- Grasa: ${totals.fat} / ${t.fat} g\n- Fibra: ${totals.fiber} / ${t.fiber} g\n- Azúcar: ${totals.sugar} / máx ${t.sugar} g\n- Sodio: ${totals.sodium} / máx ${t.sodium} mg\n\nEvalúa el día y dame consejos para mañana.`;

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
  };
}
