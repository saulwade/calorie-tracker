import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-4-6";

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
          "Descripción corta de la comida en español, incluyendo porción estimada. Ej: 'Plato de 2 tacos al pastor con piña'",
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
          "Qué tan seguro estás de la estimación. 'baja' si la foto es ambigua o falta info de porción.",
      },
      notes: {
        type: "string",
        description:
          "Suposiciones que hiciste (porción, ingredientes asumidos) o nota breve. En español, máx 1 frase.",
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
    ],
  },
};

const SYSTEM = `Eres un nutriólogo experto que estima el contenido nutricional de comidas.
Reglas:
- Estima porciones realistas. Si ves una foto, calcula tamaño de porción por referencias visuales (plato, cubiertos, manos).
- Si el usuario da cantidades ("200g de pollo", "2 tacos"), respétalas.
- Para comida mexicana/latina usa valores realistas (tortillas, salsas, aceite de cocina, etc.).
- Si falta información, asume una porción típica y dilo en 'notes', y baja la 'confidence'.
- Siempre responde llamando a la herramienta 'registrar_comida'. No escribas texto adicional.
- Todo en español.`;

type AnalyzeArgs = {
  text?: string;
  imageBase64?: string;
  mediaType?: string;
};

export async function analyzeFood({
  text,
  imageBase64,
  mediaType,
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

  content.push({
    type: "text",
    text:
      (imageBase64
        ? "Analiza esta foto de comida. "
        : "Analiza esta comida. ") +
      (text ? `Contexto del usuario: "${text}"` : "") +
      "\nEstima el desglose nutricional y regístralo con la herramienta.",
  });

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
  };
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
}
